import os
import sys
import time
import json
import asyncio
import platform
import subprocess
import datetime
import random
from typing import Dict, Any, List, Optional, Callable, Awaitable

class OSLogCollector:
    """
    Real-Time OS Log Collector Agent.
    Captures live host operating system logs (Windows Event Log, File Tailer, or Synthetic OS Stream)
    and streams them directly into the Drain3 + PyTorch anomaly pipeline.
    """
    def __init__(self):
        self.is_running: bool = False
        self.source_type: str = "synthetic"  # "windows_events", "file_tail", "synthetic"
        self.source_target: str = "System"    # Channel name or file path
        self.poll_interval: float = 2.0       # Seconds between polling cycles
        self.total_ingested: int = 0
        self.start_time: Optional[float] = None
        self.last_log_time: Optional[float] = None
        self.error_count: int = 0
        self.last_error: Optional[str] = None
        
        self._task: Optional[asyncio.Task] = None
        self._callback: Optional[Callable[[str, str, str, Optional[datetime.datetime]], Awaitable[None]]] = None
        self._file_offset: int = 0
        self._seen_win_record_ids: set = set()

    def register_callback(self, callback: Callable[[str, str, str, Optional[datetime.datetime]], Awaitable[None]]):
        """Register the async callback function to receive ingested logs (raw_message, severity, block_id, timestamp)."""
        self._callback = callback

    def get_status(self) -> Dict[str, Any]:
        """Return the current active status and statistics of the collector agent."""
        uptime = round(time.time() - self.start_time, 1) if (self.is_running and self.start_time) else 0.0
        return {
            "is_running": self.is_running,
            "source_type": self.source_type,
            "source_target": self.source_target,
            "poll_interval": self.poll_interval,
            "total_ingested": self.total_ingested,
            "uptime_seconds": uptime,
            "last_log_timestamp": datetime.datetime.fromtimestamp(self.last_log_time).isoformat() if self.last_log_time else None,
            "error_count": self.error_count,
            "last_error": self.last_error,
            "platform": platform.system(),
            "host_name": platform.node()
        }

    def get_available_sources(self) -> Dict[str, Any]:
        """Detect available operating system log channels and sample local log files."""
        sys_os = platform.system()
        channels = []
        file_samples = []

        if sys_os == "Windows":
            channels = ["System", "Security", "Application"]
            # Common log locations on Windows
            sample_paths = [
                os.path.join(os.environ.get("SystemRoot", "C:\\Windows"), "Logs", "CBS", "CBS.log"),
                os.path.join(os.environ.get("ProgramData", "C:\\ProgramData"), "MySQL", "MySQL Server 8.0", "Data", "error.log"),
                os.path.abspath("backend/tests/sample_app.log")
            ]
            for p in sample_paths:
                if os.path.exists(p):
                    file_samples.append(p)
        else:
            channels = ["syslog", "auth.log", "kern.log", "journalctl"]
            sample_paths = ["/var/log/syslog", "/var/log/auth.log", "/var/log/system.log"]
            for p in sample_paths:
                if os.path.exists(p):
                    file_samples.append(p)

        return {
            "platform": sys_os,
            "is_windows": sys_os == "Windows",
            "windows_channels": channels,
            "suggested_file_paths": file_samples
        }

    async def start(self, source_type: str = "synthetic", source_target: str = "System", poll_interval: float = 2.0) -> Dict[str, Any]:
        """Start the live OS log collector agent."""
        if self.is_running:
            await self.stop()

        self.source_type = source_type.lower()
        self.source_target = source_target
        self.poll_interval = max(0.5, float(poll_interval))
        self.is_running = True
        self.start_time = time.time()
        self.error_count = 0
        self.last_error = None
        self._seen_win_record_ids.clear()
        self._file_offset = 0

        self._file_offset = 0

        # Launch background polling loop
        loop = asyncio.get_running_loop()
        self._task = loop.create_task(self._run_loop())
        
        return self.get_status()

    async def stop(self) -> Dict[str, Any]:
        """Stop the live OS log collector agent."""
        self.is_running = False
        self.last_error = None
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self._task = None
        return self.get_status()

    async def _run_loop(self):
        """Internal main async loop polling the selected log source."""
        while self.is_running:
            try:
                if self.source_type == "windows_events":
                    await self._poll_windows_events()
                elif self.source_type == "file_tail":
                    await self._poll_file_tail()
                else: # synthetic fallback
                    await self._poll_synthetic()
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.error_count += 1
                self.last_error = f"Loop error: {str(e)}"
                await asyncio.sleep(3.0)
                continue

            await asyncio.sleep(self.poll_interval)

    async def _emit_log(self, raw_message: str, severity: str = "INFO", block_id: str = "os_agent", timestamp: Optional[datetime.datetime] = None):
        """Pass log to registered async callback."""
        if not self._callback:
            return
        self.total_ingested += 1
        self.last_log_time = time.time()
        try:
            await self._callback(raw_message, severity, block_id, timestamp or datetime.datetime.utcnow())
            self.last_error = None
        except Exception as e:
            self.error_count += 1
            self.last_error = f"Callback dispatch error: {str(e)}"

    async def _poll_windows_events(self):
        """Read recent Windows Event Logs using PowerShell Get-WinEvent JSON stream."""
        if platform.system() != "Windows":
            # Fallback to synthetic if not on Windows
            await self._poll_synthetic()
            return

        channel = self.source_target or "System"
        max_events = 10 if self.total_ingested == 0 else 5

        # PowerShell command fetching latest events from log channel
        ps_script = f"""
        $ErrorActionPreference = 'Stop'
        try {{
            $events = Get-WinEvent -LogName '{channel}' -MaxEvents {max_events} | Select-Object RecordId, TimeCreated, LevelDisplayName, Message, ProviderName
            $events | ConvertTo-Json -Compress
        }} catch {{
            Write-Error $_.Exception.Message
        }}
        """

        def run_ps():
            try:
                cmd = ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_script]
                res = subprocess.run(cmd, capture_output=True, text=True, timeout=8)
                return res.stdout.strip(), res.stderr.strip(), res.returncode
            except Exception as ex:
                return "", str(ex), 1

        out_json, err_str, ret_code = await asyncio.to_thread(run_ps)

        if err_str and ("UnauthorizedAccessException" in err_str or "unauthorized operation" in err_str.lower()):
            self.error_count += 1
            self.last_error = f"Permission Denied reading '{channel}' event log. Run terminal as Administrator or select 'System' / 'Application' channel."
            # Fallback to System channel if Security failed due to permissions
            if channel != "System":
                channel = "System"
                self.source_target = "System"
            return

        if not out_json or out_json == "[]":
            return

        emitted_count = 0
        try:
            data = json.loads(out_json)
            # Normalize list vs single object
            if isinstance(data, dict):
                data = [data]

            # Process events in chronological order (oldest first in chunk)
            for evt in reversed(data):
                record_id = evt.get("RecordId")
                if record_id and record_id in self._seen_win_record_ids:
                    continue
                if record_id:
                    self._seen_win_record_ids.add(record_id)
                    if len(self._seen_win_record_ids) > 1000:
                        self._seen_win_record_ids.clear()

                provider = evt.get("ProviderName", "WinEvent")
                lvl_str = str(evt.get("LevelDisplayName", "Information")).upper()
                msg = str(evt.get("Message", "")).replace("\r\n", " ").replace("\n", " ").strip()
                if not msg:
                    msg = f"Windows Event Record #{record_id} from {provider}"

                # Map level to LogSentinel severity
                severity = "INFO"
                if "CRITICAL" in lvl_str:
                    severity = "CRITICAL"
                elif "ERROR" in lvl_str:
                    severity = "ERROR"
                elif "WARNING" in lvl_str:
                    severity = "WARNING"

                formatted_msg = f"[WinEvent:{channel}] [{provider}] {msg}"
                await self._emit_log(formatted_msg, severity=severity, block_id=f"win_evt_{channel.lower()}")
                emitted_count += 1
        except Exception as e:
            self.last_error = f"WinEvent parse error: {str(e)}"

        # If no new events were emitted in this cycle and idle > 8s, emit baseline health entry
        if emitted_count == 0 and self.is_running:
            now = time.time()
            if not self.last_log_time or (now - self.last_log_time >= 8.0):
                heartbeat_msg = f"[WinEvent:{channel}] [SystemHealth] Live OS stream active. Channel '{channel}' monitoring idle, baseline system nominal."
                await self._emit_log(heartbeat_msg, severity="INFO", block_id=f"win_evt_{channel.lower()}")

    async def _poll_file_tail(self):
        """Read newly appended lines from target file on disk."""
        file_path = self.source_target
        if not file_path or not os.path.exists(file_path):
            self.last_error = f"Target file does not exist: {file_path}"
            return

        def read_new_lines():
            lines = []
            new_offset = self._file_offset
            try:
                file_size = os.path.getsize(file_path)
                # If file was truncated/rotated
                if file_size < new_offset:
                    new_offset = 0

                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    f.seek(new_offset)
                    for line in f:
                        if line.strip():
                            lines.append(line.strip())
                    new_offset = f.tell()
            except Exception as ex:
                pass
            return lines, new_offset

        lines, new_offset = await asyncio.to_thread(read_new_lines)
        self._file_offset = new_offset

        file_bname = os.path.basename(file_path)
        for line in lines:
            # Detect basic log level in line
            sev = "INFO"
            up_line = line.upper()
            if "CRITICAL" in up_line or "FATAL" in up_line:
                sev = "CRITICAL"
            elif "ERROR" in up_line or "FAIL" in up_line or "EXCEPTION" in up_line:
                sev = "ERROR"
            elif "WARN" in up_line:
                sev = "WARNING"

            await self._emit_log(f"[{file_bname}] {line}", severity=sev, block_id=f"tail_{file_bname}")

        if len(lines) == 0 and self.is_running:
            now = time.time()
            if not self.last_log_time or (now - self.last_log_time >= 8.0):
                heartbeat_msg = f"[{file_bname}] [SystemHealth] Tailer active on '{file_bname}'. File monitoring idle, baseline system nominal."
                await self._emit_log(heartbeat_msg, severity="INFO", block_id=f"tail_{file_bname}")

    async def _poll_synthetic(self):
        """Emit realistic live OS event log samples for testing & demonstration."""
        sample_logs = [
            ("sshd[28491]: Accepted publickey for admin from 192.168.1.45 port 51022 ssh2", "INFO", "auth_sys"),
            ("systemd[1]: Started Security Audit and Anomaly Monitoring Service.", "INFO", "systemd"),
            ("kernel: [ 1042.85912] Out of memory: Kill process 8912 (python) score 780 or sacrifice child", "ERROR", "kernel"),
            ("WinEvent[Security]: EventID 4625 An account failed to log on. Account: Administrator Workstation: EC2-WIN1", "WARNING", "win_sec"),
            ("dockerd[1042]: Container 4a8e91f exited with code 137 (SIGKILL OOM)", "ERROR", "docker"),
            ("nginx[80]: 192.168.1.10 - - [19/Sep/2026:22:00:01 +0000] \"GET /api/v1/health HTTP/1.1\" 200 45", "INFO", "web_access"),
            ("postgres[5432]: LOG: database system was shut down at 2026-09-19 21:45:00 UTC", "INFO", "db_log"),
            ("WinEvent[Security]: EventID 4624 An account was successfully logged on. TargetUser: SYSTEM", "INFO", "win_sec"),
            ("systemd-resolved[412]: Using degraded feature set (UDP) for DNS server 1.1.1.1", "WARNING", "dns_sys"),
            ("kernel: [ 2091.1203] Firewall drop: IN=eth0 OUT= SRC=45.143.200.12 DST=10.0.0.5 PROTO=TCP SPT=44122 DPT=22", "WARNING", "firewall")
        ]

        # Randomly select a realistic OS log entry
        raw_msg, default_sev, block_id = random.choice(sample_logs)

        # Inject an occasional anomaly (5% chance of critical security alert)
        if random.random() < 0.08:
            raw_msg = f"WinEvent[Security]: EventID 1102 The audit log was cleared by User: UNKNOWN (Possible Privilege Escalation)"
            default_sev = "CRITICAL"
            block_id = "sec_alert"

        await self._emit_log(raw_msg, severity=default_sev, block_id=block_id)

# Singleton global instance
collector_instance = OSLogCollector()
