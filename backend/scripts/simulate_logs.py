import time
import random
import argparse
import datetime
import urllib.request
import json
import sys

NORMAL_TEMPLATES = [
    ("INFO", "Receiving block blk_{block} src: /10.251.43.159:55123 dest: /10.251.43.159:50010"),
    ("INFO", "BLOCK* NameSystem.allocateBlock: /user/hadoop/datafile_{block}.txt. blk_{block}"),
    ("INFO", "Received block blk_{block} of size 67108864 from /10.251.43.159"),
    ("INFO", "PacketResponder 1 for block blk_{block} terminating"),
    ("INFO", "BLOCK* ask 10.251.43.159:50010 to delete blk_{block}"),
    ("INFO", "Deleting block blk_{block} file /mnt/hadoop/dfs/data/current/blk_{block}"),
    ("INFO", "Verification succeeded for blk_{block}"),
    ("INFO", "DataXceiver: Served block blk_{block} to /10.251.43.159"),
    ("INFO", "BlockReport of 124 blocks from 10.251.43.159:50010 sent to NameNode"),
    ("INFO", "Heartbeat received from datanode 10.251.43.159:50010")
]

ANOMALY_TEMPLATES = [
    ("FATAL", "FATAL: OutOfMemoryError in NameNode thread block blk_{block} heap dump created"),
    ("CRITICAL", "CRITICAL: Connection refused from 10.251.43.159:50010. DataNode Dead! blk_{block}"),
    ("ERROR", "ERROR: Block blk_{block} corrupted on disk /dev/sdb3! MD5 checksum mismatch!"),
    ("EMERGENCY", "EMERGENCY: Cascade failure! 45% of cluster blocks corrupted or unreachable!"),
    ("CRITICAL", "UNAUTH: Unauthorized root access attempt on HDFS RPC port 8020 from 192.168.1.99")
]

def send_log(url: str, message: str, severity: str, block_id: str):
    payload = {
        "raw_message": message,
        "severity": severity,
        "block_id": block_id,
        "timestamp": datetime.datetime.utcnow().isoformat()
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status
    except Exception as e:
        print(f"Error sending log to {url}: {e}", file=sys.stderr)
        return None

def main():
    parser = argparse.ArgumentParser(description="LogSentinel Autonomous Log Stream Simulator")
    parser.add_argument("--url", type=str, default="http://localhost:8000/api/logs/ingest", help="Ingestion API URL")
    parser.add_argument("--rate", type=float, default=2.0, help="Log ingestion rate (logs per second)")
    parser.add_argument("--mode", type=str, choices=["normal", "anomaly", "mixed"], default="mixed", help="Stream generation mode")
    parser.add_argument("--count", type=int, default=0, help="Number of logs to generate (0 = infinite)")
    
    args = parser.parse_args()
    delay = 1.0 / args.rate if args.rate > 0 else 0.5
    
    print(f"🚀 Starting LogSentinel Simulator [Mode: {args.mode.upper()} | Rate: {args.rate} logs/sec | Target: {args.url}]")
    
    generated = 0
    block_counter = 1000

    try:
        while True:
            block_id = f"blk_{block_counter}"
            
            # Determine whether to generate normal vs anomaly log
            is_anomaly = False
            if args.mode == "anomaly":
                is_anomaly = True
            elif args.mode == "mixed":
                # 15% probability of generating anomaly burst
                is_anomaly = random.random() < 0.15

            if is_anomaly:
                severity, template = random.choice(ANOMALY_TEMPLATES)
            else:
                severity, template = random.choice(NORMAL_TEMPLATES)

            now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            raw_msg = f"{now_str} {severity} {template.format(block=block_id)}"
            
            status = send_log(args.url, raw_msg, severity, block_id)
            if status == 201:
                badge = "🔴 [ANOMALY]" if is_anomaly else "🟢 [NORMAL]"
                print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] {badge} Posted log #{generated+1} ({block_id}) - {severity}")
            
            generated += 1
            if args.count > 0 and generated >= args.count:
                print(f"Completed sending {generated} logs.")
                break
                
            # Randomly shift block counter every 5 logs
            if generated % 5 == 0:
                block_counter += 1
                
            time.sleep(delay + random.uniform(-0.05, 0.05))

    except KeyboardInterrupt:
        print("\nSimulator stopped by user.")

if __name__ == "__main__":
    main()
