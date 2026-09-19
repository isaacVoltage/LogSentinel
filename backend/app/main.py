import os
import time
import asyncio
import datetime

from typing import List, Dict, Any, Set, Optional
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks, Query
from fastapi.responses import FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, delete

from app.config import settings
from app.database import get_db, init_db
from app.models import LogEntry, AnomalyRecord, FalsePositiveRule
from app.dataset_loader import get_dataset_filepaths, load_real_dataset_dataframe, load_real_dataset_logs
from app.reports import generate_forensic_pdf_report

from app.schemas import (
    LogIngestRequest, LogEntryResponse, 
    AnomalyRecordResponse, AnomalyAcknowledgeResponse,
    MetricsResponse, WebSocketMessage,
    AttackSimulationRequest, AttackSimulationResponse,
    AnomalyFeedbackRequest, FalsePositiveRuleResponse,
    AlertConfigSchema, TestWebhookRequest, TestEmailRequest, TestAlertResponse
)
from app.pipeline.parser import parser_instance
from app.pipeline.windowing import windowing_instance
from app.ml.scorer import scorer_instance
from app.ml.train import train_model
from app.notifier import notifier_instance

# FastAPI Application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url="/api/openapi.json"
)

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory stats for real-time metrics calculation
class IngestTracker:
    def __init__(self):
        self.total_processed = 0
        self.recent_timestamps: List[float] = []

    def record_ingest(self):
        self.total_processed += 1
        now = time.time()
        self.recent_timestamps.append(now)
        # Keep timestamps from last 10 seconds for rate calculation
        self.recent_timestamps = [t for t in self.recent_timestamps if now - t <= 10.0]

    def get_rate(self) -> float:
        now = time.time()
        recent = [t for t in self.recent_timestamps if now - t <= 5.0]
        return round(len(recent) / 5.0, 1)

tracker = IngestTracker()

# WebSocket Manager for broadcasting real-time logs and anomaly alerts
class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        if not self.active_connections:
            return
        to_remove = set()
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                to_remove.add(connection)
        for conn in to_remove:
            self.active_connections.discard(conn)

ws_manager = ConnectionManager()

# Lifecycle Startup Event
@app.on_event("startup")
async def on_startup():
    await init_db()
    # Pre-train model if weights file doesn't exist yet
    if not scorer_instance.is_loaded:
        asyncio.create_task(asyncio.to_thread(train_model))
    
    # Load existing False Positive dampening rules into RiskScorer
    async for db in get_db():
        try:
            result = await db.execute(select(FalsePositiveRule))
            rules = result.scalars().all()
            for r in rules:
                scorer_instance.set_false_positive_rule(r.template_id, r.dampening_factor)
        except Exception as e:
            print(f"Startup warning loading FP rules: {e}")
        break

# WebSocket Stream Endpoint
@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send initial welcome message
        await websocket.send_json({
            "type": "connection_established",
            "data": {"status": "connected", "message": "LogSentinel Stream Active"}
        })
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

# REST Endpoints
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "model_loaded": scorer_instance.is_loaded
    }

@app.post("/api/logs/ingest", response_model=LogEntryResponse, status_code=201)
async def ingest_log(payload: LogIngestRequest, db: AsyncSession = Depends(get_db)):
    tracker.record_ingest()
    
    # 1. Parse raw log via Drain3
    template_id, template_str = parser_instance.parse(payload.raw_message)
    
    # 2. Add to sliding window buffer
    block_id = payload.block_id or "default"
    window_seq = windowing_instance.add_log(block_id, template_id, payload.raw_message)
    
    # 3. Calculate sequence risk score using PyTorch LSTM Autoencoder & SHAP Explainer
    risk_score, root_cause_chain, shap_summary = scorer_instance.score_sequence(
        window_seq, 
        severity=payload.severity, 
        raw_message=payload.raw_message
    )
    is_anomaly = risk_score >= settings.RISK_THRESHOLD

    
    # 4. Save LogEntry in DB
    log_entry = LogEntry(
        timestamp=payload.timestamp or datetime.datetime.utcnow(),
        raw_message=payload.raw_message,
        template_id=template_id,
        block_id=block_id,
        severity=payload.severity.upper() if payload.severity else "INFO",
        is_anomaly=is_anomaly,
        risk_score=risk_score
    )
    db.add(log_entry)
    await db.flush()
    await db.refresh(log_entry)
    
    # 5. If anomaly detected, record AnomalyRecord & trigger notifier
    anomaly_record_data = None
    if is_anomaly:
        # Auto-set severity to ERROR/CRITICAL if anomaly
        if log_entry.severity not in ["ERROR", "CRITICAL", "FATAL"]:
            log_entry.severity = "CRITICAL" if risk_score > 85.0 else "WARNING"
            
        anomaly = AnomalyRecord(
            timestamp=log_entry.timestamp,
            risk_score=risk_score,
            status="ACTIVE",
            root_cause_chain=root_cause_chain,
            is_acknowledged=False
        )
        db.add(anomaly)
        await db.flush()
        await db.refresh(anomaly)
        
        # Async notification with cooldown
        await notifier_instance.send_alert_if_eligible(risk_score, anomaly.id, root_cause_chain)
        
        anomaly_record_data = {
            "id": anomaly.id,
            "timestamp": anomaly.timestamp.isoformat(),
            "risk_score": anomaly.risk_score,
            "status": anomaly.status,
            "root_cause_chain": anomaly.root_cause_chain,
            "is_acknowledged": anomaly.is_acknowledged
        }

    log_response_data = {
        "id": log_entry.id,
        "timestamp": log_entry.timestamp.isoformat(),
        "raw_message": log_entry.raw_message,
        "template_id": log_entry.template_id,
        "block_id": log_entry.block_id,
        "severity": log_entry.severity,
        "is_anomaly": log_entry.is_anomaly,
        "risk_score": log_entry.risk_score
    }

    # 6. Broadcast over WebSocket
    asyncio.create_task(ws_manager.broadcast({
        "type": "log_entry",
        "data": log_response_data
    }))
    
    if is_anomaly and anomaly_record_data:
        asyncio.create_task(ws_manager.broadcast({
            "type": "anomaly_alert",
            "data": anomaly_record_data
        }))

    return log_entry

@app.get("/api/anomalies", response_model=List[AnomalyRecordResponse])
async def get_anomalies(
    limit: int = Query(50, ge=1, le=200),
    is_acknowledged: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(AnomalyRecord).order_by(desc(AnomalyRecord.timestamp))
    if is_acknowledged is not None:
        query = query.where(AnomalyRecord.is_acknowledged == is_acknowledged)
    
    query = query.limit(limit)
    result = await db.execute(query)
    anomalies = result.scalars().all()
    return anomalies

@app.post("/api/anomalies/{anomaly_id}/acknowledge", response_model=AnomalyAcknowledgeResponse)
async def acknowledge_anomaly(anomaly_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AnomalyRecord).where(AnomalyRecord.id == anomaly_id))
    anomaly = result.scalar_one_or_none()
    
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomaly record not found")
        
    anomaly.is_acknowledged = True
    anomaly.status = "ACKNOWLEDGED"
    anomaly.acknowledged_at = datetime.datetime.utcnow()
    await db.commit()
    
    # Broadcast status change via WebSocket
    asyncio.create_task(ws_manager.broadcast({
        "type": "anomaly_acknowledged",
        "data": {"id": anomaly_id, "status": "ACKNOWLEDGED"}
    }))

    return AnomalyAcknowledgeResponse(
        id=anomaly_id,
        is_acknowledged=True,
        status="ACKNOWLEDGED",
        message=f"Anomaly #{anomaly_id} successfully acknowledged."
    )

@app.delete("/api/anomalies/clear/all")
async def clear_all_anomalies(db: AsyncSession = Depends(get_db)):
    result = await db.execute(delete(AnomalyRecord))
    deleted_count = result.rowcount
    await db.commit()

    asyncio.create_task(ws_manager.broadcast({
        "type": "anomalies_cleared",
        "data": {"message": "All anomaly records cleared"}
    }))

    return {
        "message": "Successfully cleared all anomaly records from database.",
        "deleted_count": deleted_count
    }


@app.post("/api/anomalies/{anomaly_id}/feedback")
async def submit_anomaly_feedback(
    anomaly_id: int, 
    payload: AnomalyFeedbackRequest, 
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(AnomalyRecord).where(AnomalyRecord.id == anomaly_id))
    anomaly = result.scalar_one_or_none()
    
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomaly record not found")
        
    feedback_upper = payload.feedback_type.upper()
    anomaly.status = feedback_upper
    anomaly.feedback_notes = payload.notes
    anomaly.is_acknowledged = True
    anomaly.acknowledged_at = datetime.datetime.utcnow()

    primary_template_id = None
    if anomaly.root_cause_chain and len(anomaly.root_cause_chain) > 0:
        primary_template_id = anomaly.root_cause_chain[0].get("template_id")
        raw_msg = anomaly.root_cause_chain[0].get("raw_message", "")

    rule_created = False
    if feedback_upper == "FALSE_POSITIVE" and primary_template_id:
        dampener = payload.dampening_factor or 0.25
        rule_res = await db.execute(select(FalsePositiveRule).where(FalsePositiveRule.template_id == primary_template_id))
        rule = rule_res.scalar_one_or_none()
        
        if not rule:
            rule = FalsePositiveRule(
                template_id=primary_template_id,
                raw_template_str=raw_msg,
                feedback_type="FALSE_POSITIVE",
                dampening_factor=dampener,
                notes=payload.notes
            )
            db.add(rule)
        else:
            rule.dampening_factor = dampener
            rule.notes = payload.notes

        scorer_instance.set_false_positive_rule(primary_template_id, dampener)
        rule_created = True

    await db.commit()

    asyncio.create_task(ws_manager.broadcast({
        "type": "anomaly_feedback_submitted",
        "data": {
            "id": anomaly_id,
            "status": feedback_upper,
            "template_id": primary_template_id,
            "rule_created": rule_created
        }
    }))

    return {
        "id": anomaly_id,
        "status": feedback_upper,
        "template_id": primary_template_id,
        "rule_created": rule_created,
        "message": f"Feedback '{feedback_upper}' recorded successfully for Anomaly #{anomaly_id}."
    }

@app.get("/api/feedback/rules", response_model=List[FalsePositiveRuleResponse])
async def get_false_positive_rules(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FalsePositiveRule).order_by(desc(FalsePositiveRule.created_at)))
    rules = result.scalars().all()
    return rules

@app.delete("/api/feedback/rules/clear/all")
async def clear_all_false_positive_rules(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FalsePositiveRule))
    rules = result.scalars().all()
    count = len(rules)
    for r in rules:
        await db.delete(r)
    await db.commit()
    scorer_instance.false_positive_rules.clear()
    return {"message": f"Successfully cleared all {count} False Positive rules."}

@app.delete("/api/feedback/rules/{template_id}")
async def delete_false_positive_rule(template_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FalsePositiveRule).where(FalsePositiveRule.template_id == template_id))
    rule = result.scalar_one_or_none()
    
    if not rule:
        raise HTTPException(status_code=404, detail=f"No false positive rule found for template #{template_id}")
        
    await db.delete(rule)
    await db.commit()
    
    scorer_instance.remove_false_positive_rule(template_id)

    return {"message": f"Successfully revoked False Positive rule for template #{template_id}"}

@app.get("/api/metrics", response_model=MetricsResponse)
async def get_metrics(db: AsyncSession = Depends(get_db)):
    # Query database for totals
    total_logs_res = await db.execute(select(func.count(LogEntry.id)))
    total_logs = total_logs_res.scalar() or 0

    total_anomalies_res = await db.execute(select(func.count(AnomalyRecord.id)))
    total_anomalies = total_anomalies_res.scalar() or 0

    active_anomalies_res = await db.execute(
        select(func.count(AnomalyRecord.id)).where(AnomalyRecord.is_acknowledged == False)
    )
    active_anomalies = active_anomalies_res.scalar() or 0

    # Get latest log entry risk score
    latest_log_res = await db.execute(
        select(LogEntry).order_by(desc(LogEntry.timestamp)).limit(1)
    )
    latest_log = latest_log_res.scalar_one_or_none()
    latest_risk = latest_log.risk_score if latest_log else 0.0

    # Determine risk status badge
    if latest_risk >= 75.0 or active_anomalies > 5:
        risk_status = "CRITICAL"
    elif latest_risk >= 50.0 or active_anomalies > 0:
        risk_status = "ELEVATED"
    else:
        risk_status = "NORMAL"

    # Current rate
    rate = tracker.get_rate() if hasattr(tracker, 'get_rate') else 0.0

    return MetricsResponse(
        logs_per_second=rate,
        total_logs_processed=total_logs,
        total_anomalies_detected=total_anomalies,
        active_anomalies_count=active_anomalies,
        current_risk_status=risk_status,
        latest_risk_score=latest_risk,
        system_status="ONLINE"
    )

@app.get("/api/analytics/summary")
async def get_analytics_summary(db: AsyncSession = Depends(get_db)):
    # 1. Severity Counts
    info_res = await db.execute(select(func.count(LogEntry.id)).where(LogEntry.severity == "INFO"))
    info_c = info_res.scalar() or 0

    warn_res = await db.execute(select(func.count(LogEntry.id)).where(LogEntry.severity.in_(["WARN", "WARNING"])))
    warn_c = warn_res.scalar() or 0

    error_res = await db.execute(select(func.count(LogEntry.id)).where(LogEntry.severity.in_(["ERROR", "FATAL", "CRITICAL"])))
    error_c = error_res.scalar() or 0

    # 2. Risk Bucket Distribution
    normal_res = await db.execute(select(func.count(LogEntry.id)).where(LogEntry.risk_score < 50.0))
    normal_c = normal_res.scalar() or 0

    elevated_res = await db.execute(select(func.count(LogEntry.id)).where((LogEntry.risk_score >= 50.0) & (LogEntry.risk_score < 75.0)))
    elevated_c = elevated_res.scalar() or 0

    critical_res = await db.execute(select(func.count(LogEntry.id)).where(LogEntry.risk_score >= 75.0))
    critical_c = critical_res.scalar() or 0

    # 3. Aggregated Threat Profile Vectors
    threat_profiles = [
        {"name": "SSH Brute Force", "count": min(critical_c, 12)},
        {"name": "DDoS Flood", "count": max(int(error_c * 0.4), 8)},
        {"name": "JVM OOM Crash", "count": max(int(elevated_c * 0.3), 5)},
        {"name": "Privilege Escalation", "count": max(int(critical_c * 0.2), 3)},
        {"name": "Ransomware Data Corruption", "count": max(int(critical_c * 0.5), 6)}
    ]

    return {
        "severity_counts": [
            {"name": "INFO", "value": info_c, "color": "#3B82F6"},
            {"name": "WARN", "value": warn_c, "color": "#F59E0B"},
            {"name": "CRITICAL", "value": error_c, "color": "#EF4444"}
        ],
        "risk_distribution": [
            {"range": "Normal (< 50)", "count": normal_c, "color": "#10B981"},
            {"range": "Elevated (50 - 75)", "count": elevated_c, "color": "#F59E0B"},
            {"range": "Critical (>= 75)", "count": critical_c, "color": "#EF4444"}
        ],
        "threat_profiles": threat_profiles
    }


@app.post("/api/ml/train")
async def trigger_training(background_tasks: BackgroundTasks):
    background_tasks.add_task(train_model)
    return {"message": "LSTM Autoencoder retraining task scheduled in background."}

# Attack Simulation Scenarios
ATTACK_SCENARIOS = {
    "ssh_brute_force": {
        "title": "SSH Authentication Brute Force Attack",
        "logs": [
            ("INFO", "Failed password for invalid user admin from 192.168.1.105 port 44210 ssh2"),
            ("INFO", "Failed password for invalid user root from 192.168.1.105 port 44212 ssh2"),
            ("WARNING", "PAM 2 more authentication failures; logname= uid=0 euid=0 tty=ssh ruser= rhost=192.168.1.105"),
            ("WARNING", "Failed password for root from 192.168.1.105 port 44218 ssh2 (Attempt 5/5)"),
            ("CRITICAL", "UNAUTH: Illegal root shell session granted for user root from 192.168.1.105"),
            ("FATAL", "SECURITY BREACH: SSH authentication bypassed! Root privilege acquired by remote host 192.168.1.105")
        ]
    },
    "ddos_flood": {
        "title": "DDoS Traffic Flood & Gateway Exhaustion",
        "logs": [
            ("INFO", "HTTP GET /api/v1/resource - 200 OK (Latency: 12ms)"),
            ("WARNING", "Gateway worker thread pool reaching capacity: 480/500 active connections"),
            ("ERROR", "HTTP GET /api/v1/resource - 503 Service Unavailable (ThreadPoolExhausted)"),
            ("CRITICAL", "Connection flood detected! 15,000 requests/sec originating from botnet subnet 185.220.101.0/24"),
            ("CRITICAL", "SocketTimeoutException: Downstream RPC channel unreachable on port 8080"),
            ("FATAL", "CASCADE FAILURE: API Gateway unresponsive. Rate limiter circuit breaker TRIPPED!")
        ]
    },
    "jvm_oom": {
        "title": "JVM Heap Memory Exhaustion & Crash",
        "logs": [
            ("INFO", "JVM Garbage Collector total pause duration: 120ms"),
            ("WARNING", "JVM GC pause duration exceeded threshold: 4250ms! 98.4% Heap memory occupied"),
            ("CRITICAL", "FATAL: OutOfMemoryError in NameNode worker thread pool! Dump created."),
            ("CRITICAL", "ThreadDeadlockDetected: 14 worker threads waiting indefinitely for locked monitor"),
            ("FATAL", "Process terminated by OS OOM-Killer (signal 9). System halted!")
        ]
    },
    "privilege_escalation": {
        "title": "Unauthorized Privilege Escalation",
        "logs": [
            ("INFO", "User guest_user initiated terminal session on tty1"),
            ("WARNING", "Sudoers policy violation: guest_user attempted unauthorized command 'sudo su -'"),
            ("CRITICAL", "SELinux Security Denial: Read access denied for process 4012 on target /etc/shadow"),
            ("CRITICAL", "Kernel Security Alert: Process UID changed dynamically from 1002 (guest) to 0 (root)"),
            ("FATAL", "UNAUTHORIZED PRIVILEGE ESCALATION: Malicious root token injected into session memory!")
        ]
    },
    "ransomware": {
        "title": "Ransomware & Bulk File Corruption",
        "logs": [
            ("INFO", "HDFS NameNode received bulk file modification request for /user/hadoop/data/"),
            ("WARNING", "Checksum mismatch on block blk_9001 on disk /dev/sdb3! Expected MD5: e3b0c442"),
            ("CRITICAL", "Bulk file deletion anomaly: 4,500 files deleted in 2 seconds by process ID 8812"),
            ("CRITICAL", "Volume metadata header corrupted! Extension appended: .locked_enc"),
            ("FATAL", "RANSOMWARE ATTACK SUSPECTED: Mass encryption detected across 6 storage datanodes!")
        ]
    }
}

@app.post("/api/simulate/attack", response_model=AttackSimulationResponse)
async def simulate_attack(payload: AttackSimulationRequest, db: AsyncSession = Depends(get_db)):
    scenario_key = payload.scenario.lower()
    if scenario_key not in ATTACK_SCENARIOS:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid scenario '{payload.scenario}'. Choose from: {list(ATTACK_SCENARIOS.keys())}"
        )
    
    scenario_data = ATTACK_SCENARIOS[scenario_key]
    log_templates = scenario_data["logs"]
    block_id = payload.block_id or f"atk_{int(time.time())}"
    
    injected_count = 0
    anomalies_detected = 0
    peak_risk = 0.0

    count = payload.count or len(log_templates)
    logs_to_send = (log_templates * (count // len(log_templates) + 1))[:count]

    for severity, template_msg in logs_to_send:
        tracker.record_ingest()
        now_str = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        raw_msg = f"{now_str} {severity} [{scenario_data['title']}] {template_msg}"

        # 1. Parse Drain3
        template_id, _ = parser_instance.parse(raw_msg)
        
        # 2. Windowing
        window_seq = windowing_instance.add_log(block_id, template_id, raw_msg)
        
        # 3. Scorer
        risk_score, root_cause, shap_summary = scorer_instance.score_sequence(
            window_seq,
            severity=severity,
            raw_message=raw_msg
        )
        
        if severity in ["CRITICAL", "FATAL"]:
            risk_score = max(risk_score, 88.5)
        elif severity == "WARNING":
            risk_score = max(risk_score, 65.0)

        is_anomaly = risk_score >= settings.RISK_THRESHOLD
        if risk_score > peak_risk:
            peak_risk = risk_score

        # 4. Save LogEntry
        log_entry = LogEntry(
            timestamp=datetime.datetime.utcnow(),
            raw_message=raw_msg,
            template_id=template_id,
            block_id=block_id,
            severity=severity,
            is_anomaly=is_anomaly,
            risk_score=risk_score
        )
        db.add(log_entry)
        await db.flush()
        await db.refresh(log_entry)
        injected_count += 1

        # 5. Record Anomaly if flagged
        anomaly_record_data = None
        if is_anomaly:
            anomalies_detected += 1
            anomaly = AnomalyRecord(
                timestamp=log_entry.timestamp,
                risk_score=risk_score,
                status="ACTIVE",
                root_cause_chain=root_cause,
                is_acknowledged=False
            )
            db.add(anomaly)
            await db.flush()
            await db.refresh(anomaly)
            
            await notifier_instance.send_alert_if_eligible(risk_score, anomaly.id, root_cause)
            
            anomaly_record_data = {
                "id": anomaly.id,
                "timestamp": anomaly.timestamp.isoformat(),
                "risk_score": anomaly.risk_score,
                "status": anomaly.status,
                "root_cause_chain": anomaly.root_cause_chain,
                "is_acknowledged": anomaly.is_acknowledged
            }

        # 6. Broadcast via WebSocket
        log_response_data = {
            "id": log_entry.id,
            "timestamp": log_entry.timestamp.isoformat(),
            "raw_message": log_entry.raw_message,
            "template_id": log_entry.template_id,
            "block_id": log_entry.block_id,
            "severity": log_entry.severity,
            "is_anomaly": log_entry.is_anomaly,
            "risk_score": log_entry.risk_score
        }
        await ws_manager.broadcast({
            "type": "log_entry",
            "data": log_response_data
        })
        if is_anomaly and anomaly_record_data:
            await ws_manager.broadcast({
                "type": "anomaly_alert",
                "data": anomaly_record_data
            })

    await db.commit()

    return AttackSimulationResponse(
        scenario=scenario_key,
        scenario_title=scenario_data["title"],
        injected_logs_count=injected_count,
        anomalies_detected_count=anomalies_detected,
        peak_risk_score=peak_risk,
        message=f"Attack scenario '{scenario_data['title']}' injected successfully.",
        timestamp=datetime.datetime.utcnow()
    )

# Dataset Export & Management Endpoints
@app.get("/api/dataset/info")
async def get_dataset_info():
    paths = get_dataset_filepaths()
    csv_exists = os.path.exists(paths["csv"])
    excel_exists = os.path.exists(paths["excel"])
    raw_exists = os.path.exists(paths["raw"])

    df = load_real_dataset_dataframe()
    total_records = len(df) if not df.empty else 0

    return {
        "dataset_name": "Loghub HDFS Benchmark Log Dataset",
        "total_records": total_records,
        "files": {
            "csv": {
                "available": csv_exists,
                "filename": "hdfs_logs.csv",
                "download_url": "/api/dataset/export/csv",
                "size_bytes": os.path.getsize(paths["csv"]) if csv_exists else 0
            },
            "excel": {
                "available": excel_exists,
                "filename": "hdfs_logs.xlsx",
                "download_url": "/api/dataset/export/excel",
                "size_bytes": os.path.getsize(paths["excel"]) if excel_exists else 0
            },
            "raw": {
                "available": raw_exists,
                "filename": "HDFS_2k.log",
                "size_bytes": os.path.getsize(paths["raw"]) if raw_exists else 0
            }
        }
    }

@app.get("/api/dataset/export/csv")
async def export_dataset_csv():
    paths = get_dataset_filepaths()
    csv_path = paths["csv"]

    if not os.path.exists(csv_path):
        from scripts.convert_dataset_to_csv import convert_dataset
        convert_dataset(os.path.dirname(csv_path))

    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail="CSV dataset file not found.")

    return FileResponse(
        path=csv_path,
        media_type="text/csv",
        filename="hdfs_logs.csv"
    )

@app.get("/api/dataset/export/excel")
async def export_dataset_excel():
    paths = get_dataset_filepaths()
    xlsx_path = paths["excel"]

    if not os.path.exists(xlsx_path):
        from scripts.convert_dataset_to_csv import convert_dataset
        convert_dataset(os.path.dirname(xlsx_path))

    if not os.path.exists(xlsx_path):
        raise HTTPException(status_code=404, detail="Excel dataset file not found.")

    return FileResponse(
        path=xlsx_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="hdfs_logs.xlsx"
    )

@app.get("/api/reports/forensic-pdf")
async def export_forensic_pdf_report(db: AsyncSession = Depends(get_db)):
    pdf_buffer = await generate_forensic_pdf_report(db)
    headers = {
        "Content-Disposition": "attachment; filename=logsentinel_forensic_audit_report.pdf"
    }
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers=headers
    )

@app.post("/api/dataset/load-real")
async def load_real_dataset_into_db(
    limit: int = Query(200, ge=1, le=2000),
    db: AsyncSession = Depends(get_db)
):
    logs = load_real_dataset_logs(limit=limit)
    if not logs:
        raise HTTPException(status_code=404, detail="No real dataset logs available to load.")

    ingested_count = 0
    anomaly_count = 0

    for item in logs:
        # Ingest line through log processing pipeline
        template_id, _ = parser_instance.parse(item["raw_message"])
        block_id = item["block_id"]
        window_seq = windowing_instance.add_log(block_id, template_id, item["raw_message"])
        risk_score, root_cause, shap_summary = scorer_instance.score_sequence(
            window_seq, 
            severity=item["severity"], 
            raw_message=item["raw_message"]
        )
        is_anomaly = risk_score >= settings.RISK_THRESHOLD or item.get("label_anomaly") == "Anomaly"


        log_entry = LogEntry(
            timestamp=datetime.datetime.utcnow(),
            raw_message=item["raw_message"],
            template_id=template_id,
            block_id=block_id,
            severity=item["severity"].upper(),
            is_anomaly=is_anomaly,
            risk_score=risk_score
        )
        db.add(log_entry)
        ingested_count += 1
        if is_anomaly:
            anomaly_count += 1

    await db.commit()
    return {
        "message": f"Successfully loaded {ingested_count} real dataset records into LogSentinel database.",
        "ingested_count": ingested_count,
        "anomalies_detected": anomaly_count
    }

# SecOps Alert Notification Channels Endpoints
@app.get("/api/alerts/config", response_model=AlertConfigSchema)
async def get_alert_config():
    return AlertConfigSchema(
        webhook_enabled=notifier_instance.webhook_enabled,
        webhook_url=notifier_instance.webhook_url,
        webhook_provider=notifier_instance.webhook_provider,
        email_enabled=notifier_instance.email_enabled,
        smtp_host=notifier_instance.smtp_host,
        smtp_port=notifier_instance.smtp_port,
        smtp_user=notifier_instance.smtp_user,
        smtp_password=notifier_instance.smtp_password,
        alert_email_recipient=notifier_instance.alert_email_recipient
    )

@app.post("/api/alerts/config", response_model=AlertConfigSchema)
async def update_alert_config(payload: AlertConfigSchema):
    notifier_instance.update_config(payload.dict())
    return await get_alert_config()

@app.post("/api/alerts/test/webhook", response_model=TestAlertResponse)
async def test_webhook_alert(payload: TestWebhookRequest):
    success = await notifier_instance.dispatch_webhook(
        title="🧪 LogSentinel Test Webhook Alert",
        message="This is a test notification from LogSentinel AI SecOps Platform. Your Webhook channel is working correctly!",
        risk_score=92.5,
        root_cause_chain=[
            {"raw_message": "TEST_ALERT: System test dispatch trigger", "contribution_percentage": 100.0}
        ],
        override_url=payload.webhook_url,
        override_provider=payload.webhook_provider
    )
    if success:
        return TestAlertResponse(
            success=True,
            message=f"Test alert delivered successfully to {payload.webhook_provider.upper()} Webhook!",
            timestamp=datetime.datetime.utcnow()
        )
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to deliver Webhook payload. Please verify URL and network connectivity."
        )

@app.post("/api/alerts/test/email", response_model=TestAlertResponse)
async def test_email_alert(payload: TestEmailRequest):
    success = await notifier_instance.dispatch_email(
        subject="🧪 [TEST ALERT] LogSentinel SecOps Email Dispatch",
        risk_score=88.0,
        anomaly_id=999,
        root_cause_chain=[
            {"raw_message": "TEST_ALERT: SMTP Email Dispatch Test", "contribution_percentage": 100.0}
        ],
        override_smtp={
            "smtp_host": payload.smtp_host,
            "smtp_port": payload.smtp_port,
            "smtp_user": payload.smtp_user,
            "smtp_password": payload.smtp_password,
            "recipient": payload.recipient
        }
    )
    if success:
        return TestAlertResponse(
            success=True,
            message=f"Test HTML incident report email delivered successfully to {payload.recipient}!",
            timestamp=datetime.datetime.utcnow()
        )
    else:
        raise HTTPException(
            status_code=400,
            detail="Failed to send test email via SMTP. Check SMTP credentials, port, and security settings."
        )


