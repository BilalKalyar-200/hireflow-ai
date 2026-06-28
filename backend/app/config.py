"""
HireFlow AI — Application Configuration.

Loads all settings from environment variables via pydantic-settings.
Copy backend/.env.example to backend/.env and fill in your values.
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables or .env file.

    Input: environment variables (see backend/.env.example)
    Output: a Settings object with typed fields for the whole app
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    app_name: str = "HireFlow AI"
    app_env: str = "development"
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8000

    # Qwen Cloud API
    qwen_api_key: str = ""
    qwen_api_base: str = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
    qwen_model: str = "qwen-plus"
    qwen_embedding_model: str = "text-embedding-v3"
    mock_qwen: bool = False

    # MongoDB
    mongodb_uri: str = ""
    mongodb_db_name: str = "hireflow"

    # Qdrant
    qdrant_url: str = ""
    qdrant_api_key: str = ""
    qdrant_collection_resumes: str = "resume_embeddings"
    qdrant_collection_jds: str = "jd_embeddings"

    # Gmail SMTP
    gmail_user: str = ""
    gmail_app_password: str = ""
    gmail_from_name: str = "HireFlow AI"

    # Google Calendar
    google_service_account_file: str = "../credentials/google-service-account.json"
    google_calendar_id: str = ""

    # Alibaba OSS
    oss_access_key_id: str = ""
    oss_access_key_secret: str = ""
    oss_endpoint: str = ""
    oss_bucket_name: str = ""
    oss_region: str = "ap-southeast-1"

    # Local fallback when OSS is not configured
    local_storage_path: str = "./data/uploads"

    # Scoring thresholds
    score_auto_shortlist: int = 75
    score_borderline_min: int = 50
    score_auto_reject: int = 49

    # Pipeline
    max_concurrent_resumes: int = 10
    max_pdf_size_mb: int = 5
    pipeline_retry_attempts: int = 2

    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    def get_cors_origins_list(self) -> List[str]:
        """
        Parse comma-separated CORS origins into a list.

        Input: none (reads self.cors_origins)
        Output: list of origin URL strings, e.g. ["http://localhost:5173"]
        """
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    def is_oss_configured(self) -> bool:
        """
        Check whether Alibaba OSS credentials are present.

        Input: none
        Output: True if OSS access key and bucket are set
        """
        return bool(self.oss_access_key_id and self.oss_bucket_name)

    def is_mongodb_configured(self) -> bool:
        """
        Check whether MongoDB connection URI is set.

        Input: none
        Output: True if mongodb_uri is non-empty
        """
        return bool(self.mongodb_uri)

    def is_qdrant_configured(self) -> bool:
        """
        Check whether Qdrant URL is set.

        Input: none
        Output: True if qdrant_url is non-empty
        """
        return bool(self.qdrant_url)

    def is_gmail_configured(self) -> bool:
        """
        Check whether Gmail SMTP credentials are set.

        Input: none
        Output: True if gmail user and app password are set
        """
        return bool(self.gmail_user and self.gmail_app_password)

    def is_calendar_configured(self) -> bool:
        """
        Check whether Google Calendar service account is configured.

        Input: none
        Output: True if calendar ID and service account file path are set
        """
        return bool(self.google_calendar_id and self.google_service_account_file)


@lru_cache
def get_settings() -> Settings:
    """
    Return cached Settings instance (singleton).

    Input: none
    Output: Settings object loaded from environment
    """
    return Settings()
