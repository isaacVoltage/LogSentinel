import os
import sys
import time
import random
import datetime
import argparse

NORMAL_LOG_TEMPLATES = [
    ("INFO", "Receiving block blk_{block} src: /10.251.43.{ip}:55123 dest: /10.251.43.{ip}:50010"),
    ("INFO", "BLOCK* NameSystem.allocateBlock: /user/hadoop/datafile_{block}.txt. blk_{block}"),
    ("INFO", "Received block blk_{block} of size 67108864 from /10.251.43.{ip}"),
    ("INFO", "PacketResponder 1 for block blk_{block} terminating"),
    ("INFO", "DataXceiver: Served block blk_{block} to /10.251.43.{ip}"),
    ("INFO", "Verification succeeded for blk_{block}"),
    ("INFO", "Heartbeat received from datanode 10.251.43.{ip}:50010"),
    ("INFO", "nginx[80]: 192.168.1.{ip} - - [{time}] \"GET /api/v1/health HTTP/1.1\" 200 45"),
    ("INFO", "sshd[28491]: Accepted publickey for admin from 192.168.1.{ip} port 51022 ssh2"),
    ("INFO", "systemd[1]: Started Security Audit and Anomaly Monitoring Service.")
]

ANOMALY_SCENARIOS = [
    [
        ("WARNING", "WinEvent[Security]: EventID 4625 Failed password for invalid user admin from 192.168.1.{ip}"),
        ("ERROR", "WinEvent[Security]: EventID 4625 PAM 5 authentication failures; user=root rhost=192.168.1.{ip}"),
        ("CRITICAL", "UNAUTH: Illegal root shell session granted for user root from 192.168.1.{ip}"),
        ("FATAL", "SECURITY BREACH: Root privilege acquired by remote attacker 192.168.1.{ip}! blk_{block}")
    ],
    [
        ("ERROR", "kernel: Out of memory: Kill process 8912 (python) score 780 or sacrifice child blk_{block}"),
        ("CRITICAL", "FATAL: OutOfMemoryError in NameNode thread block blk_{block} heap dump created"),
        ("FATAL", "CASCADE FAILURE: System memory 99.4% exhausted. Worker node dead! blk_{block}")
    ],
    [
        ("WARNING", "ERROR: Block blk_{block} corrupted on disk /dev/sdb3! MD5 checksum mismatch!"),
        ("CRITICAL", "EMERGENCY: Cascade failure! 45% of cluster blocks corrupted or unreachable! blk_{block}"),
        ("FATAL", "WinEvent[Security]: EventID 1102 Audit log cleared by UNKNOWN (Privilege Escalation)")
    ]
]

def generate_custom_log_file(output_path: str, total_lines: int = 60, anomaly_ratio: float = 0.15, append_live: bool = False, delay_sec: float = 1.0):
    """
    Generates a custom standalone log file on disk with normal baseline logs and random anomaly insertions.
    """
    abs_path = os.path.abspath(output_path)
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)

    print(f"[LogGenerator] Generating custom log file: {abs_path}")
    print(f"[LogGenerator] Total Lines: {total_lines} | Anomaly Ratio: {int(anomaly_ratio*100)}%")

    # Determine random positions for anomaly bursts
    num_anomalies = max(1, int(total_lines * anomaly_ratio))
    anomaly_positions = sorted(random.sample(range(5, max(6, total_lines - 5)), min(num_anomalies, max(1, total_lines - 10))))

    mode = "a" if append_live else "w"
    block_id = 1000
    anomalies_inserted = 0
    lines_written = 0

    with open(abs_path, mode, encoding="utf-8") as f:
        line_idx = 0
        while line_idx < total_lines:
            now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            ip = random.randint(10, 200)

            if line_idx in anomaly_positions:
                # Insert a multi-line attack scenario
                scenario = random.choice(ANOMALY_SCENARIOS)
                print(f"   [ANOMALY] Injecting Anomaly Scenario at line #{line_idx + 1}...")
                for sev, tmpl in scenario:
                    line_str = f"{now_str} {sev} {tmpl.format(block=block_id, ip=ip, time=now_str)}\n"
                    f.write(line_str)
                    f.flush()
                    lines_written += 1
                    anomalies_inserted += 1
                    line_idx += 1
                    if append_live:
                        time.sleep(delay_sec)
                block_id += 1
            else:
                sev, tmpl = random.choice(NORMAL_LOG_TEMPLATES)
                line_str = f"{now_str} {sev} {tmpl.format(block=block_id, ip=ip, time=now_str)}\n"
                f.write(line_str)
                f.flush()
                lines_written += 1
                line_idx += 1
                if append_live:
                    time.sleep(delay_sec)

            if line_idx % 10 == 0:
                block_id += 1

    print(f"[SUCCESS] Wrote {lines_written} log lines ({anomalies_inserted} anomaly events) to:\n   {abs_path}\n")
    return {
        "file_path": abs_path,
        "total_lines": lines_written,
        "anomalies_count": anomalies_inserted,
        "anomaly_positions": anomaly_positions
    }

def main():
    parser = argparse.ArgumentParser(description="LogSentinel Custom Anomaly Log File Generator")
    parser.add_argument("--output", type=str, default="custom_test_with_anomalies.log", help="Output file path")
    parser.add_argument("--count", type=int, default=100, help="Total number of log lines to generate")
    parser.add_argument("--ratio", type=float, default=0.15, help="Anomaly probability ratio (e.g. 0.15 = 15%)")
    parser.add_argument("--live", action="store_true", help="Continuously append lines to file in real time")
    parser.add_argument("--delay", type=float, default=1.0, help="Delay in seconds when appending live")

    args = parser.parse_args()
    generate_custom_log_file(
        output_path=args.output,
        total_lines=args.count,
        anomaly_ratio=args.ratio,
        append_live=args.live,
        delay_sec=args.delay
    )

if __name__ == "__main__":
    main()
