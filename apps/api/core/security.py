"""
ArchDefend — Security & Auth Dependencies
Proper FastAPI JWT authentication middleware.
Used via Depends() in every protected route.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.config import settings
from core.database import get_db

try:
    from jose import jwt, JWTError
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    JWT_AVAILABLE = True
except ImportError:
    JWT_AVAILABLE = False
    pwd_context = None

bearer_scheme = HTTPBearer(auto_error=False)


# ── Token helpers ─────────────────────────────────────────────────────────────

def create_access_token(user_id: str, email: str) -> str:
    """Create signed JWT access token."""
    if not JWT_AVAILABLE:
        raise RuntimeError("python-jose not installed")
    expires = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRY_HOURS)
    payload = {"sub": user_id, "email": email, "exp": expires, "iat": datetime.now(timezone.utc)}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate JWT. Raises HTTPException on any failure."""
    if not JWT_AVAILABLE:
        raise HTTPException(status_code=503, detail="Auth service unavailable")
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("sub") is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalid or expired",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e


def hash_password(password: str) -> str:
    if not pwd_context:
        raise RuntimeError("passlib not installed")
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    if not pwd_context:
        return False
    return pwd_context.verify(plain, hashed)


# ── FastAPI Dependency ────────────────────────────────────────────────────────

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
):
    """
    FastAPI dependency: extract + validate JWT, return User ORM object.
    Usage: current_user: User = Depends(get_current_user)
    """
    from models.models import User

    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(credentials.credentials)
    user_id: str = payload["sub"]

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account suspended")

    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
):
    """Same as get_current_user but returns None instead of raising for public routes."""
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


async def require_plan(minimum_plan: str):
    """
    Dependency factory: require a minimum subscription plan.
    Usage: Depends(require_plan("pro"))
    """
    from models.models import PlanTier
    PLAN_RANK = {PlanTier.FREE: 0, PlanTier.PRO: 1, PlanTier.TEAM: 2}
    min_rank = PLAN_RANK.get(PlanTier(minimum_plan), 0)

    async def _check(current_user=Depends(get_current_user)):
        user_rank = PLAN_RANK.get(current_user.plan, 0)
        if user_rank < min_rank:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"This feature requires {minimum_plan.title()} plan or higher",
            )
        return current_user
    return _check
