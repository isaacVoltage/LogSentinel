import time
import sys
import subprocess
import json
import urllib.request
import datetime

INGEST_URL = "http://localhost:8000/api/logs/ingest"

def post_log(raw_msg: str, severity: str, component: str):
    payload = {
        "raw_message": raw_msg,
        "severity": severity,
        "block_id": component,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(INGEST_URL, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status
    except Exception as e:
        print(f"[WARN] Ingest endpoint error: {e}", file=sys.stderr)
        return None

def fetch_live_windows_events(max_events: int = 30):
    """
    Fetches live Windows System and Application event logs using PowerShell Get-WinEvent.
    Excludes PowerShell self-startup log telemetry to prevent loop feedback.
    """
    ps_cmd = (
        "Get-WinEvent -LogName System,Application -MaxEvents 30 -ErrorAction SilentlyContinue | "
        "Where-Object { $_.ProviderName -notlike '*PowerShell*' } | "
        "Select-Object TimeCreated, ProviderName, LevelDisplayName, Message | "
        "ConvertTo-Json"
    )
    try:
        res = subprocess.run(
            ["powershell", "-NoProfile", "-Command", ps_cmd],
            capture_output=True,
            text=True,
            timeout=10
        )
        if res.returncode == 0 and res.stdout.strip():
            data = json.loads(res.stdout)
            if isinstance(data, dict):
                data = [data]
            return data
    except Exception as e:
        print(f"[WARN] Error querying Windows Event Logs: {e}")
    return []


def main():
    print("=" * 70)
    print("💻 LogSentinel - Live Windows Computer System Anomaly Collector")
    print("=" * 70)
    print(f"Target API: [{INGEST_URL}]")
    print("Monitoring Live Windows Event Logs (System & Application)...\n")

    seen_logs = set()
    last_heartbeat = time.time()

    try:
        while True:
            events = fetch_live_windows_events(max_events=25)
            new_count = 0

            for evt in reversed(events): # Process oldest to newest
                provider = str(evt.get("ProviderName", "WindowsSystem"))
                level = str(evt.get("LevelDisplayName", "Information")).upper()
                msg = str(evt.get("Message", "")).replace("\r", " ").replace("\n", " ")
                time_str = str(evt.get("TimeCreated", ""))

                if len(msg) > 250:
                    msg = msg[:247] + "..."

                log_key = f"{time_str}_{provider}_{msg[:50]}"
                if log_key in seen_logs:
                    continue

                seen_logs.add(log_key)
                if len(seen_logs) > 1000:
                    seen_logs.clear()

                raw_msg = f"{time_str} [{provider}] {level}: {msg}"
                severity = "ERROR" if level in ["ERROR", "CRITICAL"] else ("WARN" if level in ["WARNING", "WARN"] else "INFO")

                status = post_log(raw_msg, severity, provider)
                if status == 201:
                    badge = "🔴 [ANOMALY]" if severity in ["ERROR", "CRITICAL"] else "🟢 [NORMAL]"
                    print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] {badge} [{provider}] {level}: {msg[:85]}")
                    new_count += 1

            now = time.time()
            if new_count == 0 and (now - last_heartbeat) >= 15.0:
                print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] 🔍 Monitoring live Windows Event Log stream... (Waiting for new system events)")
                last_heartbeat = now

            time.sleep(3.0)

    except KeyboardInterrupt:
        print("\nLive computer monitoring stopped.")

if __name__ == "__main__":
    main()

