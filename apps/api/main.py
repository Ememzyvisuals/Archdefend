"""
ArchDefend - AI-Powered Codebase Intelligence Platform
FastAPI Backend Gateway
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from core.middleware import request_id_middleware, timing_middleware, error_logging_middleware
from fastapi.responses import JSONResponse
import logging
import uvicorn

# Optional Sentry error tracking
import os as _os
if _dsn := _os.getenv('SENTRY_DSN'):
    try:
        import sentry_sdk
        sentry_sdk.init(dsn=_dsn, traces_sample_rate=0.1)
    except ImportError:
        pass

from core.config import settings
from core.database import init_db
from routers import analysis, auth, billing, reports, health

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s"
)
logger = logging.getLogger("archdefend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management."""
    logger.info("🚀 ArchDefend API starting up...")
    # Start daily credit reset background task
    import asyncio
    from services.credit_reset import run_credit_reset_loop
    reset_task = asyncio.create_task(run_credit_reset_loop())
    logger.info("✅ ArchDefend API ready — daily credit reset active")
    yield
    reset_task.cancel()
    logger.info("🛑 ArchDefend API shutting down...")
    logger.info("🛑 ArchDefend API shutting down...")


app = FastAPI(
    title="ArchDefend API",
    description="Enterprise-grade AI codebase intelligence platform",
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,
    lifespan=lifespan,
)

# ── Security Middleware ──────────────────────────────────────────────────────

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID", "X-Response-Time"],
)

app.add_middleware(BaseHTTPMiddleware, dispatch=request_id_middleware)
app.add_middleware(BaseHTTPMiddleware, dispatch=timing_middleware)
app.add_middleware(BaseHTTPMiddleware, dispatch=error_logging_middleware)

# ── Routers ──────────────────────────────────────────────────────────────────

app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["analysis"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])
app.include_router(billing.router, prefix="/api/v1/billing", tags=["billing"])


# ── Global Exception Handler ─────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "message": "An unexpected error occurred"},
    )


@app.get("/", include_in_schema=False)
async def root():
    return {"service": "ArchDefend API", "version": "1.0.0", "status": "operational"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.ENVIRONMENT == "development",
        log_level="info",
    )
