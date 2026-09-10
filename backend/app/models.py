import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON
from app.database import Base

class LogEntry(Base):
    __tablename__ = "log_entries"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    raw_message = Column(Text, nullable=False)
    template_id = Column(Integer, default=0, index=True)
    block_id = Column(String(64), default="default", index=True)
    severity = Column(String(20), default="INFO", index=True)
    is_anomaly = Column(Boolean, default=False, index=True)
    risk_score = Column(Float, default=0.0)

class AnomalyRecord(Base):
    __tablename__ = "anomaly_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    risk_score = Column(Float, nullable=False)
    status = Column(String(30), default="ACTIVE")  # ACTIVE, ACKNOWLEDGED, FALSE_POSITIVE, CONFIRMED
    root_cause_chain = Column(JSON, nullable=True) # List of event dictionaries representing sequence deviation
    is_acknowledged = Column(Boolean, default=False, index=True)
    acknowledged_at = Column(DateTime, nullable=True)
    feedback_notes = Column(Text, nullable=True)

class FalsePositiveRule(Base):
    __tablename__ = "false_positive_rules"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    template_id = Column(Integer, nullable=False, unique=True, index=True)
    raw_template_str = Column(Text, nullable=True)
    feedback_type = Column(String(30), default="FALSE_POSITIVE")
    dampening_factor = Column(Float, default=0.25) # Risk score multiplier (0.25 = 75% reduction)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    notes = Column(Text, nullable=True)

