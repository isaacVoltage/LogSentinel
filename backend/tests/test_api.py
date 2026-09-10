import pytest
from fastapi.testclient import TestClient
from app.main import app

def test_health_check():
    with TestClient(app) as client:
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data

def test_ingest_and_metrics_flow():
    with TestClient(app) as client:
        # Ingest Log
        log_payload = {
            "raw_message": "2026-08-15 12:00:00 INFO Test log message blk_9999",
            "severity": "INFO",
            "block_id": "blk_9999"
        }
        res_ingest = client.post("/api/logs/ingest", json=log_payload)
        assert res_ingest.status_code == 201
        log_data = res_ingest.json()
        assert log_data["block_id"] == "blk_9999"
        assert "risk_score" in log_data

        # Check Metrics
        res_metrics = client.get("/api/metrics")
        assert res_metrics.status_code == 200
        metrics = res_metrics.json()
        assert metrics["total_logs_processed"] >= 1

        # Check Anomalies List
        res_anomalies = client.get("/api/anomalies")
        assert res_anomalies.status_code == 200
        assert isinstance(res_anomalies.json(), list)
