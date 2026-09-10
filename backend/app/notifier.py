import time
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("logsentinel.notifier")

class AlertNotifier:
    """
    Asynchronous notification manager for anomaly alerts.
    Enforces a cooldown period between alerts to prevent alert fatigue.
    """
    def __init__(self, cooldown_seconds: int = 30):
        self.cooldown_seconds = cooldown_seconds
        self.last_alert_time: float = 0.0

    async def send_alert_if_eligible(self, risk_score: float, anomaly_id: int, root_cause_chain: Optional[Any] = None) -> bool:
        """
        Evaluates whether an alert notification should be dispatched based on cooldown.
        Returns True if alert was sent, False if suppressed due to cooldown.
        """
        current_time = time.time()
        time_since_last = current_time - self.last_alert_time
        
        if time_since_last < self.cooldown_seconds:
            logger.info(
                f"[Alert Suppressed] Anomaly #{anomaly_id} (Risk: {risk_score}) "
                f"suppressed by cooldown ({int(self.cooldown_seconds - time_since_last)}s remaining)."
            )
            return False

        # Dispatch alert (In production, this would trigger Email / PagerDuty / Webhook / Slack)
        self.last_alert_time = current_time
        logger.warning(
            f"🚨 [ALERT DISPATCHED] Anomaly #{anomaly_id} DETECTED! Risk Score: {risk_score}/100. "
            f"Root cause items: {len(root_cause_chain) if root_cause_chain else 0}"
        )
        return True

# Global Notifier instance
notifier_instance = AlertNotifier(cooldown_seconds=30)
