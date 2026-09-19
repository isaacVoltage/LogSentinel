import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "LogSentinel — AI-Driven Log Anomaly Detector"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Database Settings
    # Default to SQLite async for lightweight standalone operation, PostgreSQL for docker-compose
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite+aiosqlite:///./logsentinel.db"
    )
    
    # ML & Anomaly Detection Parameters
    WINDOW_SIZE: int = 10
    RISK_THRESHOLD: float = 55.0
    ALERT_COOLDOWN_SECONDS: int = 30
    
    # Drain3 Persistence
    DRAIN3_STATE_PATH: str = "./drain3_state.bin"
    MODEL_WEIGHTS_PATH: str = "./models/lstm_autoencoder.pt"
    
    # Notification Settings
    WEBHOOK_ENABLED: bool = os.getenv("WEBHOOK_ENABLED", "false").lower() in ("true", "1", "t")
    WEBHOOK_URL: str = os.getenv("WEBHOOK_URL", "")
    WEBHOOK_PROVIDER: str = os.getenv("WEBHOOK_PROVIDER", "discord") # discord, slack, generic
    
    EMAIL_ENABLED: bool = os.getenv("EMAIL_ENABLED", "false").lower() in ("true", "1", "t")
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    ALERT_EMAIL_RECIPIENT: str = os.getenv("ALERT_EMAIL_RECIPIENT", "secops-alerts@logsentinel.com")

    # CORS Origins
    CORS_ORIGINS: list[str] = ["*"]

    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
