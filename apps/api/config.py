"""
ArchDefend API Configuration
Handles both plain string and JSON-array format for list env vars.
"""
from __future__ import annotations
import json
from functools import lru_cache
from typing import Literal
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _parse_list_env(value: str | list) -> list[str]:
    """Parse env var that may be a plain comma string OR a JSON array string."""
    if isinstance(value, list):
        return value
    v = value.strip()
    if v.startswith("["):
        try:
            parsed = json.loads(v)
            return [str(i) for i in parsed]
        except json.JSONDecodeError:
            pass
    return [item.strip() for item in v.split(",") if item.strip()]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    ENVIRONMENT: Literal["development", "staging", "production"] = "production"
    DEBUG: bool = False
    SECRET_KEY: str
    PYTHON_VERSION: str = "3.12.3"

    # Raw list vars (come as JSON arrays from Render)
    ALLOWED_HOSTS: str = '["*"]'
    CORS_ORIGINS: str = '["https://archdefend.vercel.app"]'

    # Database
    DATABASE_URL: str
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str

    # Cache
    REDIS_URL: str

    # Auth
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 24

    # GitHub
    GITHUB_CLIENT_ID: str
    GITHUB_CLIENT_SECRET: str
    GITHUB_CALLBACK_URL: str

    # AI
    GROQ_API_KEY: str
    OPENROUTER_API_KEY: str

    # Payments
    NOWPAYMENTS_API_KEY: str
    NOWPAYMENTS_IPN_SECRET: str

    # Analysis
    TEMP_CLONE_DIR: str = "/tmp/archdefend/repos"
    MAX_REPO_SIZE_MB: int = 500
    CLONE_TIMEOUT_SECONDS: int = 120

    # Credits
    FREE_TIER_CREDITS: int = 20
    SMALL_REPO_CREDITS: int = 5
    MEDIUM_REPO_CREDITS: int = 15
    LARGE_REPO_CREDITS: int = 40
    SECURITY_SCAN_CREDITS: int = 15
    PPTX_EXPORT_CREDITS: int = 5

    @field_validator("SECRET_KEY", "JWT_SECRET")
    @classmethod
    def validate_secret_length(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("Secret keys must be at least 32 characters long")
        return v

    @property
    def allowed_hosts_list(self) -> list[str]:
        return _parse_list_env(self.ALLOWED_HOSTS)

    @property
    def cors_origins_list(self) -> list[str]:
        return _parse_list_env(self.CORS_ORIGINS)

    @property
    def redis_url_tls(self) -> str:
        """Upstash free tier requires TLS — force rediss:// scheme."""
        url = self.REDIS_URL
        if "upstash.io" in url and url.startswith("redis://"):
            url = "rediss://" + url[len("redis://"):]
        return url

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

    @property
    def api_prefix(self) -> str:
        return "/api/v1"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
