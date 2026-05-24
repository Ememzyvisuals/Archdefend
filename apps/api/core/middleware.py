"""
ArchDefend — Middleware
Rate limiting, request ID injection, timing headers.
"""

import time
import uuid
from typing import Callable
from fastapi import Request, Response
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger("archdefend.middleware")


async def request_id_middleware(request: Request, call_next: Callable) -> Response:
    """Inject X-Request-ID header for tracing."""
    req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())[:8]
    request.state.request_id = req_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = req_id
    return response


async def timing_middleware(request: Request, call_next: Callable) -> Response:
    """Add X-Response-Time header."""
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = (time.perf_counter() - start) * 1000
    response.headers["X-Response-Time"] = f"{elapsed:.1f}ms"
    return response


async def error_logging_middleware(request: Request, call_next: Callable) -> Response:
    """Log all 5xx errors with context."""
    try:
        response = await call_next(request)
        if response.status_code >= 500:
            logger.error(
                f"[{getattr(request.state, 'request_id', '?')}] "
                f"{request.method} {request.url.path} → {response.status_code}"
            )
        return response
    except Exception as exc:
        logger.exception(
            f"Unhandled error: {request.method} {request.url.path} — {exc}"
        )
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error"},
            headers={"X-Request-ID": getattr(request.state, "request_id", "unknown")},
        )
