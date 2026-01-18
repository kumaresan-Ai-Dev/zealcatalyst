from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "Zeal Catalyst Tutoring Platform"
    DEBUG: bool = True

    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "zealcatalyst"

    # JWT Settings
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # CORS - Add ngrok URLs for demo
    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:5173", "https://*.ngrok-free.app", "https://*.ngrok.io"]

    # Frontend URL for email links
    FRONTEND_URL: str = "https://easystudy.cloud"

    # Google Calendar/Meet API Settings
    GOOGLE_CLIENT_SECRET_FILE: Optional[str] = None  # Path to OAuth client secret JSON file
    GOOGLE_CLIENT_ID: str = "592288516654-kbk9tpf0h4gfvfhddpps31q5v1r1kpk1.apps.googleusercontent.com"  # For OAuth verification

    # Email/SMTP Settings
    MAIL_HOST: str = "smtp.hostinger.com"
    MAIL_PORT: int = 465
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM_ADDRESS: str = "coo@zealcatalyst.com"
    MAIL_FROM_NAME: str = "Zeal Catalyst"
    MAIL_USE_SSL: bool = True  # Port 465 uses SSL

    # Razorpay Settings
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""

    # MinIO Settings
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "zealadmin"
    MINIO_SECRET_KEY: str = "ZealMinio@2026"
    MINIO_SECURE: bool = False
    MINIO_BUCKET: str = "tutor-images"
    MINIO_PUBLIC_URL: Optional[str] = None  # External URL for accessing images

    class Config:
        env_file = ".env"

settings = Settings()
