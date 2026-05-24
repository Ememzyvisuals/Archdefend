"""
ArchDefend — Auth Router
GitHub OAuth + email/password. JWT via core.security.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta, timezone
from typing import Optional
import secrets, httpx, logging

from core.config import settings
from core.database import get_db
from core.security import create_access_token, hash_password, verify_password, get_current_user
from models.models import User, PlanTier, CreditTransaction

logger = logging.getLogger("archdefend.auth")
router = APIRouter()

_oauth_states: dict[str, datetime] = {}


class SignupRequest(BaseModel):
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


def _user_dict(u: User) -> dict:
    return {"id": str(u.id), "email": u.email, "github_username": u.github_username,
            "avatar_url": u.avatar_url, "plan": u.plan.value, "credits": u.credits, "is_verified": u.is_verified}


@router.post("/signup", response_model=AuthResponse, status_code=201)
async def signup(req: SignupRequest, db: AsyncSession = Depends(get_db)):
    if len(req.password) < 8:
        raise HTTPException(422, "Password must be at least 8 characters")
    if await db.scalar(select(User).where(User.email == req.email)):
        raise HTTPException(409, "Email already registered")
    user = User(email=req.email, password_hash=hash_password(req.password),
                plan=PlanTier.FREE, credits=settings.FREE_TIER_CREDITS, is_active=True)
    db.add(user)
    await db.flush()
    db.add(CreditTransaction(user_id=user.id, amount=settings.FREE_TIER_CREDITS,
                             balance_after=settings.FREE_TIER_CREDITS, reason="signup_free_credits"))
    await db.commit()
    await db.refresh(user)
    logger.info(f"Signup: {user.email}")
    return AuthResponse(access_token=create_access_token(str(user.id), user.email), user=_user_dict(user))


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.email == req.email))
    if not user or not user.password_hash or not verify_password(req.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    if not user.is_active:
        raise HTTPException(403, "Account suspended")
    return AuthResponse(access_token=create_access_token(str(user.id), user.email), user=_user_dict(user))


@router.get("/github")
async def github_start():
    if not settings.GITHUB_CLIENT_ID:
        raise HTTPException(503, "GitHub OAuth not configured")
    state = secrets.token_urlsafe(32)
    _oauth_states[state] = datetime.now(timezone.utc)
    # prune stale
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=15)
    for k in [k for k, v in _oauth_states.items() if v < cutoff]:
        del _oauth_states[k]
    return RedirectResponse(
        f"https://github.com/login/oauth/authorize?client_id={settings.GITHUB_CLIENT_ID}"
        f"&redirect_uri={settings.GITHUB_CALLBACK_URL}&scope=user:email,read:user&state={state}"
    )


@router.get("/github/callback")
async def github_callback(code: str, state: str, db: AsyncSession = Depends(get_db)):
    fe = settings.CORS_ORIGINS[0] if settings.CORS_ORIGINS else "http://localhost:3000"
    if state not in _oauth_states:
        return RedirectResponse(f"{fe}/auth/login?error=invalid_state")
    age = (datetime.now(timezone.utc) - _oauth_states.pop(state)).total_seconds()
    if age > 600:
        return RedirectResponse(f"{fe}/auth/login?error=state_expired")

    async with httpx.AsyncClient(timeout=15.0) as c:
        tr = await c.post("https://github.com/login/oauth/access_token",
                          headers={"Accept": "application/json"},
                          json={"client_id": settings.GITHUB_CLIENT_ID,
                                "client_secret": settings.GITHUB_CLIENT_SECRET,
                                "code": code, "redirect_uri": settings.GITHUB_CALLBACK_URL})
        gh_token = tr.json().get("access_token")
        if not gh_token:
            return RedirectResponse(f"{fe}/auth/login?error=token_failed")
        h = {"Authorization": f"Bearer {gh_token}", "Accept": "application/vnd.github.v3+json"}
        profile = (await c.get("https://api.github.com/user", headers=h)).json()
        emails_resp = await c.get("https://api.github.com/user/emails", headers=h)
        emails = emails_resp.json() if emails_resp.status_code == 200 else []

    email = next((e["email"] for e in emails if isinstance(e, dict) and e.get("primary") and e.get("verified")), profile.get("email"))
    if not email:
        return RedirectResponse(f"{fe}/auth/login?error=no_email")

    github_id = str(profile["id"])
    user = await db.scalar(select(User).where(User.github_id == github_id))
    if not user:
        user = await db.scalar(select(User).where(User.email == email))

    if user:
        user.github_id = github_id
        user.github_username = profile.get("login")
        user.github_access_token = gh_token
        user.avatar_url = profile.get("avatar_url")
        user.is_verified = True
    else:
        user = User(email=email, github_id=github_id, github_username=profile.get("login"),
                    github_access_token=gh_token, avatar_url=profile.get("avatar_url"),
                    plan=PlanTier.FREE, credits=settings.FREE_TIER_CREDITS, is_active=True, is_verified=True)
        db.add(user)
        await db.flush()
        db.add(CreditTransaction(user_id=user.id, amount=settings.FREE_TIER_CREDITS,
                                 balance_after=settings.FREE_TIER_CREDITS, reason="signup_github_credits"))

    await db.commit()
    await db.refresh(user)
    logger.info(f"GitHub login: {user.email}")
    return RedirectResponse(f"{fe}/auth/callback?token={create_access_token(str(user.id), user.email)}", status_code=302)


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return _user_dict(current_user)
