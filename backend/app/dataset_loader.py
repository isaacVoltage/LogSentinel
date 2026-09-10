import os
import pandas as pd
import logging
from typing import List, Dict, Any

logger = logging.getLogger("logsentinel.dataset_loader")

DATASET_CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "dataset", "hdfs_logs.csv")
DATASET_XLSX_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "dataset", "hdfs_logs.xlsx")
DATASET_RAW_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "dataset", "HDFS_2k.log")

def get_dataset_filepaths() -> Dict[str, str]:
    """Returns absolute paths to dataset files."""
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "dataset"))
    return {
        "csv": os.path.join(base_dir, "hdfs_logs.csv"),
        "excel": os.path.join(base_dir, "hdfs_logs.xlsx"),
        "raw": os.path.join(base_dir, "HDFS_2k.log")
    }

def load_real_dataset_dataframe(file_name: str = None) -> pd.DataFrame:
    """
    Loads dataset as a pandas DataFrame.
    Supports default hdfs_logs.csv, Windows_2k.log_structured.csv, or any CSV in dataset/.
    """
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "dataset"))
    
    if file_name:
        target_path = os.path.join(base_dir, file_name)
    else:
        # Check if Windows_2k or other Loghub CSVs exist in dataset/
        win_csv = os.path.join(base_dir, "Windows_2k.log_structured.csv")
        hdfs_csv = os.path.join(base_dir, "hdfs_logs.csv")
        
        if os.path.exists(win_csv):
            target_path = win_csv
        elif os.path.exists(hdfs_csv):
            target_path = hdfs_csv
        else:
            target_path = hdfs_csv

    if not os.path.exists(target_path):
        logger.info(f"Dataset CSV not found at {target_path}. Running conversion script...")
        try:
            from scripts.convert_dataset_to_csv import convert_dataset
            convert_dataset(os.path.dirname(target_path))
        except Exception as e:
            logger.error(f"Failed to auto-generate dataset CSV: {e}")

    if os.path.exists(target_path):
        return pd.read_csv(target_path)
    else:
        logger.warning("No dataset CSV available. Returning empty DataFrame.")
        return pd.DataFrame()

def load_real_dataset_logs(limit: int = 0, file_name: str = None) -> List[Dict[str, Any]]:
    """Loads dataset entries as a list of dictionaries with normalized field mapping."""
    df = load_real_dataset_dataframe(file_name=file_name)
    if df.empty:
        return []
    
    if limit > 0:
        df = df.head(limit)
        
    logs = []
    for _, row in df.iterrows():
        # Handle HDFS, Loghub, Windows, and custom CSV column names
        raw_msg = str(row.get("Content", row.get("Message", row.get("Raw_Log", ""))))
        severity = str(row.get("Level", row.get("Severity", "INFO")))
        block_id = str(row.get("Component", row.get("Block_ID", row.get("EventId", "default_comp"))))
        date_val = str(row.get("Date", ""))
        time_val = str(row.get("Time", ""))
        
        timestamp = str(row.get("Timestamp", f"{date_val}T{time_val}Z" if date_val else ""))

        logs.append({
            "raw_message": raw_msg,
            "severity": severity.upper(),
            "block_id": block_id,
            "timestamp": timestamp,
            "label_anomaly": str(row.get("Label_Anomaly", "Normal"))
        })
    return logs

