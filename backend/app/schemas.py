import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field

# Log Ingestion Schemas
class LogIngestRequest(BaseModel):
    raw_message: str = Field(..., example="2026-08-15 12:00:00 INFO HDFS block blk_-12345 allocated successfully")
    block_id: Optional[str] = Field(default="default", example="blk_1001")
    severity: Optional[str] = Field(default="INFO", example="INFO")
    timestamp: Optional[datetime.datetime] = None

class LogEntryResponse(BaseModel):
    id: int
    timestamp: datetime.datetime
    raw_message: str
    template_id: int
    block_id: str
    severity: str
    is_anomaly: bool
    risk_score: float

    class Config:
        from_attributes = True

# Root Cause Chain Schema
class RootCauseItem(BaseModel):
    template_id: int
    raw_message: str
    reconstruction_error: float
    contribution_percentage: float

# Anomaly Record Schemas
class AnomalyRecordResponse(BaseModel):
    id: int
    timestamp: datetime.datetime
    risk_score: float
    status: str
    root_cause_chain: Optional[List[Dict[str, Any]]] = None
    is_acknowledged: bool
    acknowledged_at: Optional[datetime.datetime] = None
    feedback_notes: Optional[str] = None

    class Config:
        from_attributes = True

class AnomalyAcknowledgeResponse(BaseModel):
    id: int
    is_acknowledged: bool
    status: str
    message: str

class AnomalyFeedbackRequest(BaseModel):
    feedback_type: str = Field(..., example="FALSE_POSITIVE", description="FALSE_POSITIVE or CONFIRMED")
    notes: Optional[str] = Field(default=None, example="Routine nightly backup script trigger")
    dampening_factor: Optional[float] = Field(default=0.25, ge=0.0, le=1.0)

class FalsePositiveRuleResponse(BaseModel):
    id: int
    template_id: int
    raw_template_str: Optional[str] = None
    feedback_type: str
    dampening_factor: float
    created_at: datetime.datetime
    notes: Optional[str] = None

    class Config:
        from_attributes = True

# Metrics Response Schema
class MetricsResponse(BaseModel):
    logs_per_second: float
    total_logs_processed: int
    total_anomalies_detected: int
    active_anomalies_count: int
    current_risk_status: str  # NORMAL, ELEVATED, CRITICAL
    latest_risk_score: float
    system_status: str

# WebSocket Payload Schema
class WebSocketMessage(BaseModel):
    type: str # "log_entry", "anomaly_alert", "metrics_update"
    data: Dict[str, Any]

# Attack Simulation Schemas
class AttackSimulationRequest(BaseModel):
    scenario: str = Field(..., example="ssh_brute_force", description="Scenario type: ssh_brute_force, ddos_flood, jvm_oom, privilege_escalation, ransomware")
    count: Optional[int] = Field(default=8, ge=3, le=50, description="Number of logs to generate in attack sequence")
    block_id: Optional[str] = Field(default=None, description="Custom target block or host identifier")

class AttackSimulationResponse(BaseModel):
    scenario: str
    scenario_title: str
    injected_logs_count: int
    anomalies_detected_count: int
    peak_risk_score: float
    message: str
    timestamp: datetime.datetime

# Alert Notification Schemas
class AlertConfigSchema(BaseModel):
    webhook_enabled: bool = False
    webhook_url: Optional[str] = ""
    webhook_provider: str = "discord" # discord, slack, generic
    email_enabled: bool = False
    smtp_host: Optional[str] = "smtp.gmail.com"
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = ""
    smtp_password: Optional[str] = ""
    alert_email_recipient: Optional[str] = ""

class TestWebhookRequest(BaseModel):
    webhook_url: str
    webhook_provider: Optional[str] = "discord"

class TestEmailRequest(BaseModel):
    smtp_host: str
    smtp_port: int = 587
    smtp_user: str
    smtp_password: str
    recipient: str

class TestAlertResponse(BaseModel):
    success: bool
    message: str
    timestamp: datetime.datetime


