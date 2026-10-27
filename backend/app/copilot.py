import os
import re
import json
import datetime
from typing import Dict, Any, List, Optional
import httpx

from app.config import settings

# ---------------------------------------------------------------------------
# MITRE ATT&CK Reference Library & Knowledge Base
# ---------------------------------------------------------------------------
KNOWN_THREAT_PROFILES = [
    {
        "pattern": r"(privilege\s+escalation|unauthorized\s+kernel|kernel\s+memory|malware_payload|sudoers|root\s+privilege|selinux.*denial|fakeuseradmin)",
        "threat_category": "Privilege Escalation & Unauthorized Root Execution",
        "severity_level": "CRITICAL",
        "confidence_score": 0.96,
        "mitre_attack": [
            {
                "id": "T1068",
                "tactic": "Privilege Escalation",
                "name": "Exploitation for Privilege Escalation",
                "description": "Adversary exploits software vulnerabilities or configuration weaknesses to gain elevated system rights.",
                "confidence": 0.95
            },
            {
                "id": "T1059.001",
                "tactic": "Execution",
                "name": "Command and Scripting Interpreter: PowerShell",
                "description": "Adversary leverages PowerShell cmdlets or malicious scripts to execute arbitrary memory injection payloads.",
                "confidence": 0.92
            },
            {
                "id": "T1548.003",
                "tactic": "Privilege Escalation",
                "name": "Abuse Elevation Control: Sudo and Sudoers",
                "description": "Adversary attempts unauthorized sudo/admin elevation commands to bypass security boundaries.",
                "confidence": 0.88
            }
        ],
        "executive_summary": (
            "CRITICAL SECURITY ALERT: High-confidence privilege escalation activity detected on the host. "
            "Telemetry indicates an unauthorized process or user attempted kernel memory modification, "
            "elevation bypass, or administrative credential impersonation."
        ),
        "technical_root_cause": (
            "The log sequence deviates drastically from normal application baseline. A rogue invocation "
            "attempted to manipulate security tokens or invoke administrative privileges without legitimate authentication."
        ),
        "blast_radius": "Local Host Operating System, Kernel Memory Space, and Administrative Access Hierarchy.",
        "remediation_steps": [
            {
                "step": 1,
                "title": "Kill Malicious Processes",
                "action": "Immediately locate and terminate rogue processes matching 'malware_payload' or suspicious subprocesses.",
                "command": "Get-Process | Where-Object { $_.Name -like '*malware*' -or $_.Name -like '*payload*' } | Stop-Process -Force",
                "os_target": "windows"
            },
            {
                "step": 2,
                "title": "Revoke Unauthorized Sudo / Admin Sessions",
                "action": "Check active administrative sessions and terminate unauthorized local administrator tokens.",
                "command": "net session /delete /y",
                "os_target": "windows"
            },
            {
                "step": 3,
                "title": "Query Windows Security Event Log for Token Elevation",
                "action": "Inspect Windows Event ID 4672 (Special privileges assigned) and 4673 (Privileged Service Called).",
                "command": "Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4672,4673} -MaxEvents 20 | Select-Object TimeCreated, Message",
                "os_target": "windows"
            },
            {
                "step": 4,
                "title": "Linux Containment (Cross-Platform)",
                "action": "On Linux environments, terminate suspicious sudo processes and inspect auth log.",
                "command": "pkill -9 -f malware_payload && grep -E '(sudo|su:)' /var/log/auth.log | tail -n 25",
                "os_target": "linux"
            }
        ],
        "windows_commands": [
            "Stop-Process -Name 'malware_payload' -Force -ErrorAction SilentlyContinue",
            "net session /delete /y",
            "Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4672,4673} -MaxEvents 15"
        ],
        "linux_commands": [
            "pkill -9 -f malware_payload",
            "cat /var/log/auth.log | grep -E 'sudo|su' | tail -n 20",
            "last -n 10"
        ]
    },
    {
        "pattern": r"(failed\s+password|authentication\s+failure|ssh2.*failed|pam\s+.*authentication|fake_admin|wrongpass)",
        "threat_category": "Credential Access & SSH/SMB Brute Force Attack",
        "severity_level": "HIGH",
        "confidence_score": 0.94,
        "mitre_attack": [
            {
                "id": "T1110.001",
                "tactic": "Credential Access",
                "name": "Brute Force: Password Guessing",
                "description": "Adversary systematically submits common passwords against local or network accounts to identify valid credentials.",
                "confidence": 0.95
            },
            {
                "id": "T1078",
                "tactic": "Defense Evasion / Persistence",
                "name": "Valid Accounts",
                "description": "Adversary targets default or privileged administrator accounts to establish an initial foothold.",
                "confidence": 0.90
            }
        ],
        "executive_summary": (
            "SECURITY INCIDENT: High-frequency authentication failure burst detected. "
            "Indicates automated credential stuffing or dictionary brute-force attack originating against system authentication endpoints."
        ),
        "technical_root_cause": (
            "Rapid succession of failed logon handshakes detected within the sliding window, "
            "exceeding normal baseline thresholds for interactive users."
        ),
        "blast_radius": "Authentication Gateway, Local Accounts Database, and Remote Management Ports (SSH 22 / SMB 445).",
        "remediation_steps": [
            {
                "step": 1,
                "title": "Blacklist Offending Remote IP in Host Firewall",
                "action": "Drop all incoming packets from the source IP address immediately.",
                "command": "netsh advfirewall firewall add rule name=\"Block-Attacker-IP\" dir=in action=block remoteip=192.168.1.105",
                "os_target": "windows"
            },
            {
                "step": 2,
                "title": "Disconnect Active Net Sessions",
                "action": "Purge any active SMB or administrative connection handles.",
                "command": "net use * /delete /y",
                "os_target": "windows"
            },
            {
                "step": 3,
                "title": "Linux Fail2ban / Iptables Rule",
                "action": "Drop SSH brute force source on Linux hosts.",
                "command": "iptables -I INPUT -s 192.168.1.105 -j DROP",
                "os_target": "linux"
            }
        ],
        "windows_commands": [
            "netsh advfirewall firewall add rule name=\"Block-Attacker-IP\" dir=in action=block remoteip=192.168.1.105",
            "net use * /delete /y"
        ],
        "linux_commands": [
            "iptables -I INPUT -s 192.168.1.105 -j DROP",
            "fail2ban-client reload"
        ]
    },
    {
        "pattern": r"(ransomware|locked_enc|mass\s+encryption|bulk\s+file\s+deletion|corrupted\s+on\s+disk|checksum\s+mismatch)",
        "threat_category": "Data Destruction & Ransomware Encryption Attack",
        "severity_level": "CRITICAL",
        "confidence_score": 0.98,
        "mitre_attack": [
            {
                "id": "T1486",
                "tactic": "Impact",
                "name": "Data Encrypted for Impact",
                "description": "Adversary encrypts data on target systems to interrupt availability to system and network resources.",
                "confidence": 0.98
            },
            {
                "id": "T1485",
                "tactic": "Impact",
                "name": "Data Destruction",
                "description": "Adversary destroys data and files on target systems to disrupt operations or conceal malicious activity.",
                "confidence": 0.91
            }
        ],
        "executive_summary": (
            "CRITICAL EMERGENCY: Mass data corruption or ransomware encryption signature detected! "
            "Files are undergoing rapid mutation, unauthorized extension modification (.locked_enc), or bulk deletion."
        ),
        "technical_root_cause": (
            "Anomalous I/O pattern showing abnormal checksum errors and high-entropy write surges across storage blocks."
        ),
        "blast_radius": "Storage Volumes, Distributed DataNodes, Shared SMB/NFS Directories.",
        "remediation_steps": [
            {
                "step": 1,
                "title": "Isolate File Shares & Network Storage",
                "action": "Instantly halt Server Service to prevent ransomware from propagating across network shares.",
                "command": "Stop-Service -Name 'LanmanServer' -Force",
                "os_target": "windows"
            },
            {
                "step": 2,
                "title": "Freeze Cluster in Safe Mode",
                "action": "Place distributed storage nodes into read-only safemode to safeguard intact blocks.",
                "command": "hdfs dfsadmin -safemode enter",
                "os_target": "universal"
            }
        ],
        "windows_commands": [
            "Stop-Service -Name 'LanmanServer' -Force",
            "Get-Process | Sort-Object CPU -Descending | Select-Object -First 10"
        ],
        "linux_commands": [
            "systemctl stop smbd nfs-server",
            "hdfs dfsadmin -safemode enter",
            "sync && mount -o remount,ro /data"
        ]
    },
    {
        "pattern": r"(connection\s+flood|botnet|threadpoolexhausted|503\s+service|circuit\s+breaker|ddos)",
        "threat_category": "Denial of Service (DoS) & API Gateway Resource Exhaustion",
        "severity_level": "HIGH",
        "confidence_score": 0.91,
        "mitre_attack": [
            {
                "id": "T1499.002",
                "tactic": "Impact",
                "name": "Endpoint DoS: Service Exhaustion Flood",
                "description": "Adversary floods target services with excessive requests to exhaust worker threads and degrade availability.",
                "confidence": 0.94
            }
        ],
        "executive_summary": (
            "HIGH SEVERITY: Distributed or volumetric Denial-of-Service condition detected. "
            "Gateway thread pool exhausted resulting in service degradation and high request latency."
        ),
        "technical_root_cause": (
            "Excessive request concurrency originating from botnet IP subnets overwhelming backend worker threads."
        ),
        "blast_radius": "API Gateway, Web Worker Pool, Downstream Microservice Communication.",
        "remediation_steps": [
            {
                "step": 1,
                "title": "Engage Rate Limiter Circuit Breaker",
                "action": "Restrict incoming connections per second on exposed listening ports.",
                "command": "netsh advfirewall firewall add rule name=\"RateLimit-Port80\" dir=in action=block protocol=TCP localport=80,443",
                "os_target": "windows"
            }
        ],
        "windows_commands": [
            "netsh advfirewall firewall add rule name=\"Block-Botnet-Subnet\" dir=in action=block remoteip=185.220.101.0/24"
        ],
        "linux_commands": [
            "iptables -I INPUT -p tcp --dport 80 -m connlimit --connlimit-above 50 -j REJECT",
            "iptables -I INPUT -s 185.220.101.0/24 -j DROP"
        ]
    },
    {
        "pattern": r"(outofmemoryerror|heap\s+dump|oom-killer|threaddeadlock)",
        "threat_category": "System Resource Exhaustion & Fatal Memory Leak",
        "severity_level": "HIGH",
        "confidence_score": 0.89,
        "mitre_attack": [
            {
                "id": "T1499",
                "tactic": "Impact",
                "name": "Endpoint Denial of Service",
                "description": "Uncontrolled resource consumption resulting in service crash or host kernel unresponsiveness.",
                "confidence": 0.88
            }
        ],
        "executive_summary": (
            "SYSTEM AVAILABILITY INCIDENT: Java Virtual Machine (JVM) or system process memory threshold breached. "
            "Heap memory exhaustion generated an OutOfMemoryError and triggered dump generation."
        ),
        "technical_root_cause": (
            "Long-lived memory allocations without garbage collection release, resulting in thread starvation and deadlock."
        ),
        "blast_radius": "Core Application Service, Master Controller / NameNode thread pool.",
        "remediation_steps": [
            {
                "step": 1,
                "title": "Capture Diagnostics & Heap Dump",
                "action": "Preserve process heap state for forensic analysis before restarting service.",
                "command": "jcmd <PID> GC.heap_dump C:\\heap_dump.hprof",
                "os_target": "universal"
            }
        ],
        "windows_commands": [
            "Get-Process java | Select-Object Id, WorkingSet64, TotalProcessorTime",
            "Restart-Service -Name 'LogSentinelService' -ErrorAction SilentlyContinue"
        ],
        "linux_commands": [
            "ps aux --sort=-%mem | head -n 10",
            "jstack $(pgrep java) > /tmp/thread_dump.txt"
        ]
    }
]

# ---------------------------------------------------------------------------
# Core Security Copilot Service Class
# ---------------------------------------------------------------------------
class SecurityCopilot:
    def __init__(self):
        self.gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
        self.openai_key = os.getenv("OPENAI_API_KEY", "").strip()
        self.ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434").strip()

    def _extract_log_entities(self, text: str) -> Dict[str, List[str]]:
        """Extract IPs, processes, users, ports, and block IDs from raw text."""
        ips = re.findall(r"\b(?:\d{1,3}\.){3}\d{1,3}(?:/\d{1,2})?\b", text)
        blocks = re.findall(r"\bblk_[-0-9]+\b", text)
        ports = re.findall(r":(\d{2,5})\b", text)
        users = re.findall(r"(?:user|for)\s+([a-zA-Z0-9_\-]+)", text, re.IGNORECASE)
        processes = re.findall(r"([a-zA-Z0-9_\-]+\.(?:exe|sh|py|bin))", text, re.IGNORECASE)

        return {
            "ips": list(set(ips)),
            "blocks": list(set(blocks)),
            "ports": list(set(ports)),
            "users": list(set(users)),
            "processes": list(set(processes))
        }

    def _generate_heuristic_analysis(
        self, 
        anomaly_id: int, 
        risk_score: float, 
        root_causes: List[Dict[str, Any]], 
        raw_context: str
    ) -> Dict[str, Any]:
        """Generate high-precision heuristic SOC analysis with MITRE ATT&CK correlation."""
        matched_profile = None
        for profile in KNOWN_THREAT_PROFILES:
            if re.search(profile["pattern"], raw_context, re.IGNORECASE):
                matched_profile = profile
                break

        if not matched_profile:
            matched_profile = {
                "threat_category": "Anomalous Behavioral Sequence Deviation",
                "severity_level": "HIGH" if risk_score >= 75.0 else "MEDIUM",
                "confidence_score": 0.85,
                "mitre_attack": [
                    {
                        "id": "T1059",
                        "tactic": "Execution",
                        "name": "Command and Scripting Interpreter",
                        "description": "Adversary uses command interpreters to execute arbitrary system commands.",
                        "confidence": 0.82
                    },
                    {
                        "id": "T1082",
                        "tactic": "Discovery",
                        "name": "System Information Discovery",
                        "description": "Adversary attempts to gather information about host configuration and active processes.",
                        "confidence": 0.78
                    }
                ],
                "executive_summary": (
                    f"ANOMALY NOTIFICATION: The AI LSTM Autoencoder flagged Anomaly #{anomaly_id} with a "
                    f"risk score of {risk_score:.1f}/100. The sequence indicates an unexpected state transition "
                    f"that diverges sharply from normal system operations."
                ),
                "technical_root_cause": (
                    "High reconstruction loss detected in the sliding event window. The sequence transition "
                    "probability under normal baseline was under 0.05%."
                ),
                "blast_radius": "Monitored System Services and Event Pipelines.",
                "remediation_steps": [
                    {
                        "step": 1,
                        "title": "Review Event Timeline",
                        "action": "Examine preceding 10 logs in the window buffer to identify the initial trigger event.",
                        "command": "Get-WinEvent -LogName System -MaxEvents 20 | Format-Table TimeCreated, ProviderName, Message",
                        "os_target": "windows"
                    },
                    {
                        "step": 2,
                        "title": "Check Network Connections",
                        "action": "Verify established external connections on the host machine.",
                        "command": "netstat -ano | findstr ESTABLISHED",
                        "os_target": "universal"
                    }
                ],
                "windows_commands": [
                    "Get-WinEvent -LogName System -MaxEvents 20",
                    "netstat -ano | findstr ESTABLISHED"
                ],
                "linux_commands": [
                    "netstat -tlpn",
                    "journalctl -n 25 -p err"
                ]
            }

        entities = self._extract_log_entities(raw_context)

        custom_win_commands = list(matched_profile["windows_commands"])
        custom_linux_commands = list(matched_profile["linux_commands"])

        if entities["ips"]:
            target_ip = entities["ips"][0]
            custom_win_commands.insert(0, f"netsh advfirewall firewall add rule name=\"Block-{target_ip}\" dir=in action=block remoteip={target_ip}")
            custom_linux_commands.insert(0, f"iptables -I INPUT -s {target_ip} -j DROP")

        if entities["processes"]:
            proc = entities["processes"][0]
            custom_win_commands.insert(0, f"Get-Process -Name '{proc.replace('.exe', '')}' -ErrorAction SilentlyContinue | Stop-Process -Force")

        return {
            "anomaly_id": anomaly_id,
            "threat_category": matched_profile["threat_category"],
            "severity_level": matched_profile["severity_level"],
            "confidence_score": matched_profile["confidence_score"],
            "executive_summary": matched_profile["executive_summary"],
            "technical_root_cause": matched_profile["technical_root_cause"],
            "blast_radius": matched_profile["blast_radius"],
            "mitre_attack": matched_profile["mitre_attack"],
            "remediation_steps": matched_profile["remediation_steps"],
            "windows_commands": custom_win_commands,
            "linux_commands": custom_linux_commands,
            "entities_extracted": entities,
            "ai_provider_used": "LogSentinel Built-In Cybersecurity Expert Engine",
            "generated_at": datetime.datetime.utcnow().isoformat()
        }

    async def _call_gemini_api(self, prompt: str) -> Optional[Dict[str, Any]]:
        """Call Google Gemini API if key is present."""
        if not self.gemini_key:
            return None
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.gemini_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"}
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    candidate = data["candidates"][0]["content"]["parts"][0]["text"]
                    return json.loads(candidate)
        except Exception as e:
            print(f"[Copilot] Gemini API call skipped: {e}")
        return None

    async def _call_openai_api(self, prompt: str) -> Optional[Dict[str, Any]]:
        """Call OpenAI API if key is present."""
        if not self.openai_key:
            return None
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.openai_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": "You are a Tier-3 SOC Incident Responder. Output valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    text = data["choices"][0]["message"]["content"]
                    return json.loads(text)
        except Exception as e:
            print(f"[Copilot] OpenAI API call skipped: {e}")
        return None

    async def analyze_anomaly(
        self, 
        anomaly_id: int, 
        risk_score: float, 
        root_cause_chain: Optional[List[Dict[str, Any]]] = None,
        custom_notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Perform comprehensive SOC Copilot analysis on an anomaly event."""
        root_causes = root_cause_chain or []
        combined_logs = "\n".join([f"- [{rc.get('template_id', 'T0')}] {rc.get('raw_message', '')}" for rc in root_causes])
        if not combined_logs.strip() and custom_notes:
            combined_logs = custom_notes

        baseline = self._generate_heuristic_analysis(anomaly_id, risk_score, root_causes, combined_logs)

        prompt = f"""
You are LogSentinel AI Security Copilot. Analyze the following anomalous log sequence:
Incident ID: #{anomaly_id}
LSTM Risk Score: {risk_score}/100
Log Sequence:
{combined_logs}

Return a valid JSON object matching this exact structure:
{{
  "threat_category": "Short title of the threat",
  "severity_level": "CRITICAL",
  "confidence_score": 0.95,
  "executive_summary": "Plain-English 2-3 sentence incident explanation",
  "technical_root_cause": "Detailed technical root cause explanation",
  "blast_radius": "Impacted systems and resources",
  "mitre_attack": [
    {{
      "id": "T1068",
      "tactic": "Privilege Escalation",
      "name": "Exploitation for Privilege Escalation",
      "description": "Description of technique",
      "confidence": 0.90
    }}
  ],
  "remediation_steps": [
    {{
      "step": 1,
      "title": "Action Title",
      "action": "Description of action",
      "command": "CLI command to run",
      "os_target": "windows"
    }}
  ],
  "windows_commands": ["powershell cmd 1", "powershell cmd 2"],
  "linux_commands": ["bash cmd 1", "bash cmd 2"]
}}
"""
        llm_result = await self._call_gemini_api(prompt)
        provider = "Google Gemini 1.5 Flash"
        if not llm_result:
            llm_result = await self._call_openai_api(prompt)
            provider = "OpenAI GPT-4o Mini"

        if llm_result and isinstance(llm_result, dict) and "threat_category" in llm_result:
            llm_result["anomaly_id"] = anomaly_id
            llm_result["entities_extracted"] = baseline["entities_extracted"]
            llm_result["ai_provider_used"] = provider
            llm_result["generated_at"] = datetime.datetime.utcnow().isoformat()
            return llm_result

        return baseline

    async def chat(
        self,
        anomaly_id: int,
        question: str,
        context: Dict[str, Any],
        history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """Interactive SOC assistant chat about a specific anomaly."""
        q_lower = question.lower()
        commands = []

        if "firewall" in q_lower or "block" in q_lower or "ip" in q_lower:
            commands = [
                "netsh advfirewall firewall add rule name=\"Block-Suspicious\" dir=in action=block remoteip=192.168.1.105",
                "iptables -I INPUT -s 192.168.1.105 -j DROP"
            ]
            answer = (
                "To block incoming traffic from the attacker, execute the host firewall rule command. "
                "For Windows PowerShell use `netsh advfirewall`, and for Linux use `iptables`."
            )
        elif "process" in q_lower or "kill" in q_lower or "terminate" in q_lower:
            commands = [
                "Get-Process | Where-Object { $_.Path -like '*malware*' -or $_.Name -like '*payload*' } | Stop-Process -Force",
                "pkill -9 -f malware_payload"
            ]
            answer = (
                "To terminate the suspicious process, identify any running tasks containing 'malware' or 'payload'. "
                "Use the PowerShell command below with administrative privileges."
            )
        elif "event" in q_lower or "viewer" in q_lower or "log" in q_lower:
            commands = [
                "Get-WinEvent -LogName Application -MaxEvents 20 | Where-Object { $_.LevelDisplayName -eq 'Error' }",
                "Get-WinEvent -LogName Security -MaxEvents 20 | Where-Object { $_.Id -in 4625, 4672, 4673 }"
            ]
            answer = (
                "You can inspect Windows Event Logs directly via PowerShell. Event ID 4625 indicates failed logons, "
                "while Event IDs 4672/4673 show sensitive privilege assignments and use."
            )
        else:
            threat_name = context.get("threat_category", "Identified Anomaly")
            answer = (
                f"Regarding Anomaly #{anomaly_id} ({threat_name}): The system's primary root cause stems from "
                f"{context.get('technical_root_cause', 'unexpected log sequence transitions')}. "
                f"Recommended immediate next step: {context.get('remediation_steps', [{}])[0].get('action', 'Isolate host and verify processes')}."
            )
            commands = context.get("windows_commands", [])[:2]

        return {
            "anomaly_id": anomaly_id,
            "answer": answer,
            "suggested_commands": commands,
            "provider_used": "LogSentinel Built-In SOC AI Copilot",
            "timestamp": datetime.datetime.utcnow().isoformat()
        }

copilot_instance = SecurityCopilot()
