import time
import logging
import asyncio
import httpx
import smtplib
from email.message import EmailMessage
from typing import Dict, Any, Optional, List
from app.config import settings

logger = logging.getLogger("logsentinel.notifier")

class AlertNotifier:
    """
    Asynchronous notification manager for anomaly alerts.
    Supports Discord, Slack, and generic Webhooks, as well as SMTP Email alerts.
    Enforces a cooldown period between alerts to prevent alert fatigue.
    """
    def __init__(self, cooldown_seconds: int = 30):
        self.cooldown_seconds = cooldown_seconds
        self.last_alert_time: float = 0.0

        # Dynamic runtime alert configuration overrides
        self.webhook_enabled: bool = settings.WEBHOOK_ENABLED
        self.webhook_url: str = settings.WEBHOOK_URL
        self.webhook_provider: str = settings.WEBHOOK_PROVIDER
        
        self.email_enabled: bool = settings.EMAIL_ENABLED
        self.smtp_host: str = settings.SMTP_HOST
        self.smtp_port: int = settings.SMTP_PORT
        self.smtp_user: str = settings.SMTP_USER
        self.smtp_password: str = settings.SMTP_PASSWORD
        self.alert_email_recipient: str = settings.ALERT_EMAIL_RECIPIENT

    def update_config(self, config_dict: Dict[str, Any]):
        """Update runtime notification settings dynamically."""
        if "webhook_enabled" in config_dict:
            self.webhook_enabled = bool(config_dict["webhook_enabled"])
        if "webhook_url" in config_dict:
            self.webhook_url = str(config_dict["webhook_url"])
        if "webhook_provider" in config_dict:
            self.webhook_provider = str(config_dict["webhook_provider"])

        if "email_enabled" in config_dict:
            self.email_enabled = bool(config_dict["email_enabled"])
        if "smtp_host" in config_dict:
            self.smtp_host = str(config_dict["smtp_host"])
        if "smtp_port" in config_dict:
            self.smtp_port = int(config_dict["smtp_port"])
        if "smtp_user" in config_dict:
            self.smtp_user = str(config_dict["smtp_user"])
        if "smtp_password" in config_dict:
            self.smtp_password = str(config_dict["smtp_password"])
        if "alert_email_recipient" in config_dict:
            self.alert_email_recipient = str(config_dict["alert_email_recipient"])

    async def send_alert_if_eligible(self, risk_score: float, anomaly_id: int, root_cause_chain: Optional[Any] = None) -> bool:
        """
        Evaluates whether an alert notification should be dispatched based on cooldown.
        Triggers active Webhook & Email channels asynchronously.
        """
        current_time = time.time()
        time_since_last = current_time - self.last_alert_time
        
        if time_since_last < self.cooldown_seconds:
            logger.info(
                f"[Alert Suppressed] Anomaly #{anomaly_id} (Risk: {risk_score}) "
                f"suppressed by cooldown ({int(self.cooldown_seconds - time_since_last)}s remaining)."
            )
            return False

        self.last_alert_time = current_time
        logger.warning(
            f"🚨 [ALERT DISPATCHED] Anomaly #{anomaly_id} DETECTED! Risk Score: {risk_score}/100. "
            f"Root cause items: {len(root_cause_chain) if root_cause_chain else 0}"
        )

        # Trigger Webhook if enabled
        if self.webhook_enabled and self.webhook_url:
            asyncio.create_task(self.dispatch_webhook(
                title=f"🚨 LogSentinel Anomaly Alert #{anomaly_id}",
                message=f"Critical log anomaly detected with reconstruction risk score **{risk_score}/100**.",
                risk_score=risk_score,
                root_cause_chain=root_cause_chain
            ))

        # Trigger Email if enabled
        if self.email_enabled and self.smtp_host and self.alert_email_recipient:
            asyncio.create_task(self.dispatch_email(
                subject=f"🚨 [CRITICAL ALERT] LogSentinel Anomaly #{anomaly_id} (Risk: {risk_score})",
                risk_score=risk_score,
                anomaly_id=anomaly_id,
                root_cause_chain=root_cause_chain
            ))

        return True

    async def dispatch_webhook(
        self, 
        title: str, 
        message: str, 
        risk_score: float, 
        root_cause_chain: Optional[Any] = None,
        override_url: Optional[str] = None,
        override_provider: Optional[str] = None
    ) -> bool:
        """Send rich embed payload to Discord, Slack, or generic Webhook."""
        url = override_url or self.webhook_url
        provider = (override_provider or self.webhook_provider).lower()

        if not url:
            return False

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                if provider == "slack":
                    payload = {
                        "text": f"*{title}*\n{message}\n*Risk Score:* `{risk_score}/100`"
                    }
                elif provider == "discord":
                    embed = {
                        "title": title,
                        "description": message,
                        "color": 15158332 if risk_score >= 75 else 15105570,
                        "fields": [
                            {"name": "Risk Score", "value": f"**{risk_score} / 100**", "inline": True},
                            {"name": "Status", "value": "CRITICAL ANOMALY", "inline": True}
                        ],
                        "footer": {"text": "LogSentinel AI SecOps Platform"}
                    }
                    if root_cause_chain and isinstance(root_cause_chain, list) and len(root_cause_chain) > 0:
                        top_tmpl = root_cause_chain[0].get("raw_message", "N/A")
                        embed["fields"].append({"name": "Top Root Cause Template", "value": f"`{top_tmpl[:200]}`", "inline": False})

                    payload = {
                        "username": "LogSentinel SecOps",
                        "avatar_url": "https://cdn-icons-png.flaticon.com/512/2092/2092663.png",
                        "embeds": [embed]
                    }
                else: # Generic JSON webhook
                    payload = {
                        "event": "anomaly_alert",
                        "title": title,
                        "message": message,
                        "risk_score": risk_score,
                        "root_cause_chain": root_cause_chain,
                        "timestamp": time.time()
                    }

                response = await client.post(url, json=payload)
                if response.status_code in [200, 201, 204]:
                    logger.info(f"Webhook alert delivered to {provider} successfully.")
                    return True
                else:
                    logger.error(f"Webhook delivery failed with HTTP {response.status_code}: {response.text}")
                    return False
        except Exception as e:
            logger.error(f"Failed to dispatch Webhook alert: {e}")
            return False

    async def dispatch_email(
        self, 
        subject: str, 
        risk_score: float, 
        anomaly_id: int = 0, 
        root_cause_chain: Optional[Any] = None,
        override_smtp: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Send HTML incident report email asynchronously via SMTP."""
        host = override_smtp.get("smtp_host") if override_smtp else self.smtp_host
        port = override_smtp.get("smtp_port") if override_smtp else self.smtp_port
        user = override_smtp.get("smtp_user") if override_smtp else self.smtp_user
        password = override_smtp.get("smtp_password") if override_smtp else self.smtp_password
        recipient = override_smtp.get("recipient") if override_smtp else self.alert_email_recipient

        if not host or not recipient:
            return False

        def _send():
            msg = EmailMessage()
            msg['Subject'] = subject
            msg['From'] = user or f"alerts@logsentinel.local"
            msg['To'] = recipient

            root_items_html = ""
            if root_cause_chain and isinstance(root_cause_chain, list):
                for item in root_cause_chain[:3]:
                    msg_str = item.get("raw_message", "")
                    contrib = item.get("contribution_percentage", 0)
                    root_items_html += f"<li><strong>[{contrib}% Contrib]</strong> <code>{msg_str}</code></li>"

            html_body = f"""
            <html>
              <body style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; padding: 24px; border: 1px solid #ef4444;">
                  <h2 style="color: #ef4444; margin-top: 0;">🚨 LogSentinel Critical Incident Alert</h2>
                  <p style="font-size: 14px; color: #cbd5e1;">
                    A critical log anomaly was detected by the PyTorch LSTM Autoencoder engine.
                  </p>
                  
                  <div style="background-color: #0f172a; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <p style="margin: 4px 0;"><strong>Anomaly ID:</strong> #{anomaly_id}</p>
                    <p style="margin: 4px 0;"><strong>Reconstruction Risk Score:</strong> <span style="color: #ef4444; font-size: 18px; font-weight: bold;">{risk_score} / 100</span></p>
                    <p style="margin: 4px 0;"><strong>Status:</strong> CRITICAL UNACKNOWLEDGED</p>
                  </div>

                  <h4 style="color: #38bdf8;">Root Cause Sequence Chain:</h4>
                  <ul style="font-size: 13px; color: #94a3b8; padding-left: 20px;">
                    {root_items_html or "<li>Sequence deviation in Drain3 log parser stream</li>"}
                  </ul>

                  <hr style="border: 0; border-top: 1px solid #334155; margin: 20px 0;" />
                  <p style="font-size: 11px; color: #64748b; text-align: center;">
                    Generated automatically by LogSentinel AI SecOps Platform
                  </p>
                </div>
              </body>
            </html>
            """
            msg.set_content(html_body, subtype='html')

            with smtplib.SMTP(host, port, timeout=10) as server:
                server.starttls()
                if user and password:
                    server.login(user, password)
                server.send_message(msg)
            return True

        try:
            return await asyncio.to_thread(_send)
        except Exception as e:
            logger.error(f"Failed to dispatch email alert via SMTP: {e}")
            return False

# Global Notifier instance
notifier_instance = AlertNotifier(cooldown_seconds=settings.ALERT_COOLDOWN_SECONDS)
