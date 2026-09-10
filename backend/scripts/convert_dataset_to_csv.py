import os
import re
import sys
import datetime
import urllib.request
import pandas as pd

HDFS_SAMPLE_URL = "https://raw.githubusercontent.com/logpai/loghub/master/HDFS/HDFS_2k.log"

def download_hdfs_dataset(target_path: str = "./dataset/HDFS_2k.log") -> str:
    """Downloads authentic HDFS log dataset sample from Loghub benchmark repository."""
    os.makedirs(os.path.dirname(os.path.abspath(target_path)), exist_ok=True)
    if os.path.exists(target_path):
        print(f"[OK] HDFS raw dataset already exists at {target_path}")
        return target_path

    print(f"[INFO] Downloading authentic HDFS benchmark log dataset from Loghub...")
    print(f"       URL: {HDFS_SAMPLE_URL}")
    try:
        urllib.request.urlretrieve(HDFS_SAMPLE_URL, target_path)
        print(f"[OK] Dataset downloaded successfully to {target_path}")
        return target_path
    except Exception as e:
        print(f"[ERROR] Failed to download dataset: {e}", file=sys.stderr)
        return None

def parse_hdfs_line(line: str, log_id: int):
    """
    Parses authentic HDFS log format:
    e.g. "081109 203518 143 INFO dfs.DataNode$DataXceiver: Receiving block blk_-1608999687919862906 src: /10.250.19.225:35842 dest: /10.250.19.225:50010"
    """
    line = line.strip()
    if not line:
        return None

    # Regex for standard HDFS log line pattern: YYMMDD HHMMSS PID LEVEL Component: Content
    pattern = r'^(\d{6})\s+(\d{6})\s+(\d+)\s+([A-Z]+)\s+([^:]+):\s+(.*)$'
    match = re.match(pattern, line)

    if match:
        date_raw, time_raw, pid, severity, component, content = match.groups()
        try:
            year = "20" + date_raw[:2]
            month = date_raw[2:4]
            day = date_raw[4:6]
            hour = time_raw[:2]
            minute = time_raw[2:4]
            second = time_raw[4:6]
            formatted_date = f"{year}-{month}-{day}"
            formatted_time = f"{hour}:{minute}:{second}"
            timestamp = f"{formatted_date}T{formatted_time}Z"
        except Exception:
            timestamp = datetime.datetime.utcnow().isoformat()
            formatted_date = ""
            formatted_time = ""
    else:
        # Fallback if structure is unusual
        timestamp = datetime.datetime.utcnow().isoformat()
        formatted_date = datetime.datetime.utcnow().strftime("%Y-%m-%d")
        formatted_time = datetime.datetime.utcnow().strftime("%H:%M:%S")
        severity_match = re.search(r'\b(INFO|WARN|WARNING|ERROR|FATAL|CRITICAL)\b', line)
        severity = severity_match.group(0) if severity_match else "INFO"
        component = "dfs.DataNode"
        content = line

    # Extract block ID
    block_match = re.search(r'blk_[-]?\d+', content)
    block_id = block_match.group(0) if block_match else "blk_general"

    # Extract source and destination IPs if present
    src_match = re.search(r'src:\s*/?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?)', content)
    dest_match = re.search(r'dest:\s*/?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?)', content)
    
    src_ip = src_match.group(1) if src_match else "10.250.19.225"
    dest_ip = dest_match.group(1) if dest_match else "10.250.19.225:50010"

    is_anomaly = severity in ["ERROR", "FATAL", "CRITICAL", "WARN", "WARNING"] or "exception" in content.lower()
    label_anomaly = "Anomaly" if is_anomaly else "Normal"

    return {
        "Log_ID": log_id,
        "Timestamp": timestamp,
        "Date": formatted_date,
        "Time": formatted_time,
        "Severity": severity,
        "Component": component,
        "Block_ID": block_id,
        "Source_IP": src_ip,
        "Destination_IP": dest_ip,
        "Message": content,
        "Label_Anomaly": label_anomaly,
        "Raw_Log": line
    }

def convert_dataset(output_dir: str = "./dataset"):
    os.makedirs(os.path.abspath(output_dir), exist_ok=True)
    raw_path = os.path.join(output_dir, "HDFS_2k.log")
    csv_path = os.path.join(output_dir, "hdfs_logs.csv")
    xlsx_path = os.path.join(output_dir, "hdfs_logs.xlsx")

    downloaded = download_hdfs_dataset(raw_path)
    if not downloaded or not os.path.exists(raw_path):
        print(f"[ERROR] Failed to obtain raw log dataset at {raw_path}")
        return

    records = []
    log_id = 1
    with open(raw_path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            parsed = parse_hdfs_line(line, log_id)
            if parsed:
                records.append(parsed)
                log_id += 1

    df = pd.DataFrame(records)

    # Save to CSV
    df.to_csv(csv_path, index=False, encoding="utf-8")
    print(f"[OK] Generated CSV Dataset: [{csv_path}] ({len(df)} records)")

    # Save to XLSX
    try:
        df.to_excel(xlsx_path, index=False, engine="openpyxl")
        print(f"[OK] Generated Excel Dataset: [{xlsx_path}] ({len(df)} records)")
    except Exception as e:
        print(f"[WARN] Could not save Excel file directly: {e}")

    print("\n[DATASET SUMMARY]")
    print(f" - Total Log Entries: {len(df)}")
    print(f" - Severity Counts:\n{df['Severity'].value_counts().to_string()}")
    print(f" - Anomaly Classification:\n{df['Label_Anomaly'].value_counts().to_string()}\n")


if __name__ == "__main__":
    convert_dataset()
