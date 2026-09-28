import pytest
import time
from fastapi.testclient import TestClient
from app.main import app

def test_agent_endpoints_flow():
    with TestClient(app) as client:
        # 1. Get Sources
        res_sources = client.get("/api/agent/sources")
        assert res_sources.status_code == 200
        sources = res_sources.json()
        assert "platform" in sources
        assert "is_windows" in sources
        assert "windows_channels" in sources

        # 2. Check Initial Agent Status
        res_status = client.get("/api/agent/status")
        assert res_status.status_code == 200
        status = res_status.json()
        assert "is_running" in status

        # 3. Start Agent (Synthetic mode for fast testing)
        start_payload = {
            "source_type": "synthetic",
            "source_target": "System",
            "poll_interval": 0.5
        }
        res_start = client.post("/api/agent/start", json=start_payload)
        assert res_start.status_code == 200
        started_status = res_start.json()
        assert started_status["is_running"] == True
        assert started_status["source_type"] == "synthetic"

        # Wait briefly for synthetic logs to poll
        time.sleep(1.2)

        # 4. Check Status after running
        res_active_status = client.get("/api/agent/status")
        assert res_active_status.status_code == 200
        active_status = res_active_status.json()
        assert active_status["is_running"] == True
        assert active_status["total_ingested"] >= 1

        # 5. Stop Agent
        res_stop = client.post("/api/agent/stop")
        assert res_stop.status_code == 200
        stopped_status = res_stop.json()
        assert stopped_status["is_running"] == False
