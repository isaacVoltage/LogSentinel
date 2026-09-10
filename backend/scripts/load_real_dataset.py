import os
import re
import sys
import time
import argparse
import datetime
import urllib.request
import json

# Loghub HDFS 2k real sample dataset download URL
HDFS_SAMPLE_URL = "https://raw.githubusercontent.com/logpai/loghub/master/HDFS/HDFS_2k.log"

def download_hdfs_dataset(target_path: str = "./dataset/HDFS_2k.log"):
    """Downloads authentic HDFS log dataset sample from Loghub benchmark repository."""
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    if os.path.exists(target_path):
        print(f"✅ Real HDFS dataset already exists at {target_path}")
        return target_path

    print(f"📥 Downloading authentic HDFS benchmark log dataset from Loghub...")
    print(f"   URL: {HDFS_SAMPLE_URL}")
    try:
        urllib.request.urlretrieve(HDFS_SAMPLE_URL, target_path)
        print(f"✅ Dataset downloaded successfully to {target_path}")
        return target_path
    except Exception as e:
        print(f"❌ Failed to download dataset: {e}", file=sys.stderr)
        return None

def parse_hdfs_log_line(line: str):
    """
    Parses authentic HDFS log line format:
    e.g. "081109 203518 143 INFO dfs.DataNode$DataXceiver: Receiving block blk_-1608999687919862906 src: /10.250.19.225:35842 dest: /10.250.19.225:50010"
    """
    line = line.strip()
    if not line:
        return None

    # Extract block_id (e.g. blk_-1608999687919862906)
    block_match = re.search(r'blk_[-]?\d+', line)
    block_id = block_match.group(0) if block_match else "default"

    # Extract severity (INFO, WARN, ERROR, FATAL, etc.)
    severity_match = re.search(r'\b(INFO|WARN|WARNING|ERROR|FATAL|CRITICAL)\b', line)
    severity = severity_match.group(0) if severity_match else "INFO"

    return {
        "raw_message": line,
        "severity": severity,
        "block_id": block_id,
        "timestamp": datetime.datetime.utcnow().isoformat()
    }

def post_log_entry(api_url: str, payload: dict):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(api_url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status
    except Exception as e:
        print(f"Error posting log to API: {e}", file=sys.stderr)
        return None

def main():
    parser = argparse.ArgumentParser(description="LogSentinel Real Dataset Loader")
    parser.add_argument("--file", type=str, default="", help="Path to local dataset log file (.log or .txt)")
    parser.add_argument("--download-hdfs", action="store_true", help="Download official Loghub HDFS dataset automatically")
    parser.add_argument("--url", type=str, default="http://localhost:8000/api/logs/ingest", help="LogSentinel Ingest API URL")
    parser.add_argument("--rate", type=float, default=5.0, help="Ingestion rate (logs per second)")
    parser.add_argument("--limit", type=int, default=0, help="Max log lines to ingest (0 = all)")

    args = parser.parse_args()
    log_file_path = args.file

    if args.download_hdfs or not log_file_path:
        log_file_path = download_hdfs_dataset("./dataset/HDFS_2k.log")

    if not log_file_path or not os.path.exists(log_file_path):
        print(f"❌ Log file not found: {log_file_path}", file=sys.stderr)
        sys.exit(1)

    print(f"\n🚀 Loading Real Dataset: [{log_file_path}]")
    print(f"   Target Ingest API: [{args.url}]")
    print(f"   Streaming Rate: [{args.rate} logs/sec]\n")

    delay = 1.0 / args.rate if args.rate > 0 else 0.2
    count = 0

    with open(log_file_path, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            parsed = parse_hdfs_log_line(line)
            if not parsed:
                continue

            status = post_log_entry(args.url, parsed)
            count += 1

            if status == 201:
                is_anomaly = parsed["severity"] in ["ERROR", "FATAL", "CRITICAL"]
                badge = "🔴 [ANOMALY]" if is_anomaly else "🟢 [NORMAL]"
                print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] {badge} Log #{count} ({parsed['block_id']}) -> HTTP {status}")

            if args.limit > 0 and count >= args.limit:
                print(f"Reached limit of {args.limit} log entries.")
                break

            time.sleep(delay)

    print(f"\n✅ Successfully ingested {count} real dataset logs into LogSentinel!")

if __name__ == "__main__":
    main()
