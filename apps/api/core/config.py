"""
ArchDefend — Core Configuration
Loaded from environment variables via pydantic-settings.
"""

from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────────────────────────────
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "change-me-in-production"
    DEBUG: bool = False

    # ── Server ───────────────────────────────────────────────────────────────
    ALLOWED_HOSTS: List[str] = ["*"]
    CORS_ORIGINS: List[str] =["https://archdefend.vercel.app","https://archdefend.onrender.com"]

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres.onjlcnppgqerldnoubkd:[Emma@supabase@2008]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20

    # ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://default:AZkMAAIgcDFiYmZhMDhiY2JmNmU0Nzk3OTU4ZGVkNzU4ZDQzYjNlNQ@equipped-octopus-39180.upstash.io:6379"

    # ── Supabase ──────────────────────────────────────────────────────────────
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    # ── AI Providers ──────────────────────────────────────────────────────────
    GROQ_API_KEY: str = ""
    GROQ_PRIMARY_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_FAST_MODEL: str = "llama-3.1-8b-instant"
    GROQ_API_KEYS: str = ""

    OPENROUTER_API_KEY: str = ""
    OPENROUTER_PRIMARY_MODEL: str = "anthropic/claude-3.5-sonnet"
    OPENROUTER_FALLBACK_MODEL: str = "meta-llama/llama-3.3-70b-instruct"
    OPENROUTER_API_KEYS: str = ""

    # ── GitHub OAuth ──────────────────────────────────────────────────────────
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_CALLBACK_URL: str = "http://localhost:8000/api/v1/auth/github/callback"

    # ── JWT ───────────────────────────────────────────────────────────────────
    JWT_SECRET: str = "jwt-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 24

    # ── Analysis ─────────────────────────────────────────────────────────────
    TEMP_CLONE_DIR: str = "/tmp/archdefend/repos"
    MAX_REPO_SIZE_MB: int = 500
    CLONE_TIMEOUT_SECONDS: int = 120

    # ── Credits ───────────────────────────────────────────────────────────────
    FREE_TIER_CREDITS: int = 20
    SMALL_REPO_CREDITS: int = 5
    MEDIUM_REPO_CREDITS: int = 15
    LARGE_REPO_CREDITS: int = 40
    PPTX_EXPORT_CREDITS: int = 5
    SECURITY_SCAN_CREDITS: int = 15

    # ── Rate Limiting ─────────────────────────────────────────────────────────
    RATE_LIMIT_PER_MINUTE: int = 20
    RATE_LIMIT_PER_HOUR: int = 100
    MAX_CONCURRENT_ANALYSES: int = 3

    # ── NOWPayments ───────────────────────────────────────────────────────────
    NOWPAYMENTS_API_KEY: str = ""
    NOWPAYMENTS_IPN_SECRET: str = ""
    NOWPAYMENTS_BASE_URL: str = "https://api.nowpayments.io/v1"

    # ── Security ─────────────────────────────────────────────────────────────
    ALLOWED_GITHUB_HOSTS: List[str] = ["github.com", "gitlab.com", "bitbucket.org"]

    # ── Monitoring ────────────────────────────────────────────────────────────
    SENTRY_DSN: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_async_db_url(cls, v: str) -> str:
        if not v:
            return v
        # Convert standard sync schemes to explicit async format
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        if v.startswith("postgresql://") and not v.startswith("postgresql+asyncpg://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    def get_groq_keys(self) -> List[str]:
        if self.GROQ_API_KEYS:
            return [k.strip() for k in self.GROQ_API_KEYS.split(",") if k.strip()]
        if self.GROQ_API_KEY:
            return [self.GROQ_API_KEY]
        return []

    def get_openrouter_keys(self) -> List[str]:
        if self.OPENROUTER_API_KEYS:
            return [k.strip() for k in self.OPENROUTER_API_KEYS.split(",") if k.strip()]
        if self.OPENROUTER_API_KEY:
            return [self.OPENROUTER_API_KEY]
        return []

    @property
    def is_sandbox(self) -> bool:
        return "sandbox" in self.NOWPAYMENTS_BASE_URL


settings = Settings()
