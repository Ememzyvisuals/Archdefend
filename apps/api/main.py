"""
ArchDefend API — Main Application
Architecture Intelligence For Real Engineering Teams
Built by Ememzyvisuals
"""
import os
import time
from contextlib import asynccontextmanager
import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config import settings
from database import init_db
from routers.auth import router as auth_router
from routers.repositories import router as repositories_router
from routers.analyses import router as analyses_router
from routers.reports import router as reports_router
from routers.workspaces import (
    workspaces_router,
    notifications_router,
    payments_router,
)

log = structlog.get_logger()
limiter = Limiter(key_func=get_remote_address)

os.makedirs(settings.TEMP_CLONE_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("ArchDefend API starting",
             environment=settings.ENVIRONMENT,
             api_prefix=settings.api_prefix)
    await init_db()
    log.info("Database initialized")
    yield
    log.info("ArchDefend API shutting down")


app = FastAPI(
    title="ArchDefend API",
    description="Architecture Intelligence For Real Engineering Teams",
    version="1.0.0",
    docs_url="/docs" if settings.is_development else None,
    redoc_url=None,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — use parsed list from config (handles JSON array or comma-separated)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted host middleware (allow all on free tier to avoid 400s)
if settings.is_production and "*" not in settings.allowed_hosts_list:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.allowed_hosts_list,
    )


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    start_time = time.monotonic()
    response = await call_next(request)
    duration = (time.monotonic() - start_time) * 1000
    response.headers["X-Response-Time"] = f"{duration:.2f}ms"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.monotonic()
    response = await call_next(request)
    duration = (time.monotonic() - start) * 1000
    log.info("request",
             method=request.method,
             path=request.url.path,
             status=response.status_code,
             ms=round(duration, 1))
    return response


# ── Routers — all under /api/v1 to match GITHUB_CALLBACK_URL ─────────────────
PREFIX = settings.api_prefix  # /api/v1

app.include_router(auth_router,          prefix=PREFIX)
app.include_router(repositories_router,  prefix=PREFIX)
app.include_router(analyses_router,      prefix=PREFIX)
app.include_router(reports_router,       prefix=PREFIX)
app.include_router(workspaces_router,    prefix=PREFIX)
app.include_router(notifications_router, prefix=PREFIX)
app.include_router(payments_router,      prefix=PREFIX)


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "archdefend-api",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
    }


@app.get("/")
async def root():
    return {
        "name": "ArchDefend API",
        "tagline": "Architecture Intelligence For Real Engineering Teams",
        "version": "1.0.0",
        "built_by": "Ememzyvisuals",
        "docs": "/docs" if settings.is_development else "disabled in production",
    }


@app.exception_handler(404)
async def not_found(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={"detail": "Not found", "path": str(request.url.path)},
    )


@app.exception_handler(500)
async def server_error(request: Request, exc):
    log.error("unhandled error", path=str(request.url.path), error=str(exc))
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
