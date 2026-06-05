import secrets
from datetime import datetime
from typing import Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from pydantic import BaseModel
from config import settings
from database import get_session
from models import User, Workspace, WorkspaceMembership, Subscription, SubscriptionPlan, UserRole
from auth import create_access_token, create_refresh_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_USER_EMAILS_URL = "https://api.github.com/user/emails"

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RefreshRequest(BaseModel):
    refresh_token: str


async def _get_or_create_workspace(session: AsyncSession, user: User) -> Workspace:
    result = await session.execute(
        select(WorkspaceMembership).where(WorkspaceMembership.user_id == user.id)
    )
    membership = result.scalar_one_or_none()
    if membership:
        ws_result = await session.execute(
            select(Workspace).where(Workspace.id == membership.workspace_id)
        )
        return ws_result.scalar_one()

    slug_base = (user.github_username or user.email.split("@")[0]).lower().replace(" ", "-")
    slug = slug_base
    counter = 0
    while True:
        existing = await session.execute(select(Workspace).where(Workspace.slug == slug))
        if not existing.scalar_one_or_none():
            break
        counter += 1
        slug = f"{slug_base}-{counter}"

    workspace = Workspace(
        name=f"{user.name}'s Workspace",
        slug=slug,
        owner_id=user.id,
    )
    session.add(workspace)
    await session.flush()

    membership = WorkspaceMembership(
        workspace_id=workspace.id,
        user_id=user.id,
        role=UserRole.OWNER,
        accepted_at=datetime.utcnow(),
    )
    session.add(membership)

    subscription = Subscription(
        workspace_id=workspace.id,
        plan=SubscriptionPlan.FREE,
        repositories_limit=1,
        analyses_per_month=5,
        reports_per_month=5,
    )
    session.add(subscription)
    await session.flush()
    return workspace


@router.get("/github")
async def github_login():
    state = secrets.token_urlsafe(32)
    params = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": settings.GITHUB_CALLBACK_URL,
        "scope": "read:user user:email repo",
        "state": state,
    }
    url = GITHUB_AUTH_URL + "?" + "&".join(f"{k}={v}" for k, v in params.items())
    return {"url": url, "state": state}


@router.get("/github/callback")
async def github_callback(
    code: str,
    state: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
):
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            GITHUB_TOKEN_URL,
            data={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": settings.GITHUB_CALLBACK_URL,
            },
            headers={"Accept": "application/json"},
            timeout=30,
        )
        token_data = token_resp.json()

    if "error" in token_data:
        raise HTTPException(status_code=400, detail=token_data.get("error_description", "GitHub OAuth failed"))

    access_token = token_data["access_token"]

    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"token {access_token}", "Accept": "application/json"}
        user_resp = await client.get(GITHUB_USER_URL, headers=headers, timeout=30)
        github_user = user_resp.json()

        emails_resp = await client.get(GITHUB_USER_EMAILS_URL, headers=headers, timeout=30)
        emails = emails_resp.json()

    primary_email = next((e["email"] for e in emails if e.get("primary") and e.get("verified")), None)
    if not primary_email:
        primary_email = github_user.get("email") or f"{github_user['login']}@github.noreply.com"

    result = await session.execute(
        select(User).where(User.github_id == str(github_user["id"]))
    )
    user = result.scalar_one_or_none()

    if not user:
        email_result = await session.execute(select(User).where(User.email == primary_email))
        user = email_result.scalar_one_or_none()

    if user:
        user.github_id = str(github_user["id"])
        user.github_username = github_user["login"]
        user.github_access_token = access_token
        user.avatar_url = github_user.get("avatar_url")
        user.name = github_user.get("name") or github_user["login"]
        user.last_login_at = datetime.utcnow()
        user.is_verified = True
        session.add(user)
    else:
        user = User(
            email=primary_email,
            name=github_user.get("name") or github_user["login"],
            avatar_url=github_user.get("avatar_url"),
            github_id=str(github_user["id"]),
            github_username=github_user["login"],
            github_access_token=access_token,
            is_verified=True,
            last_login_at=datetime.utcnow(),
        )
        session.add(user)
        await session.flush()

    await _get_or_create_workspace(session, user)
    await session.commit()
    await session.refresh(user)

    jwt_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=jwt_token,
        refresh_token=refresh_token,
        user={
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "avatar_url": user.avatar_url,
            "github_username": user.github_username,
        },
    )


@router.post("/google")
async def google_oauth(
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    body = await request.json()
    id_token_str = body.get("id_token")
    if not id_token_str:
        raise HTTPException(status_code=400, detail="id_token required")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token_str}",
            timeout=30,
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Invalid Google token")

    google_data = resp.json()
    google_id = google_data.get("sub")
    email = google_data.get("email")
    name = google_data.get("name", "")
    avatar_url = google_data.get("picture")

    if not google_id or not email:
        raise HTTPException(status_code=400, detail="Invalid Google token payload")

    result = await session.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    if not user:
        email_result = await session.execute(select(User).where(User.email == email))
        user = email_result.scalar_one_or_none()

    if user:
        user.google_id = google_id
        user.avatar_url = avatar_url
        user.name = name or user.name
        user.last_login_at = datetime.utcnow()
        user.is_verified = True
        session.add(user)
    else:
        user = User(
            email=email,
            name=name or email.split("@")[0],
            avatar_url=avatar_url,
            google_id=google_id,
            is_verified=True,
            last_login_at=datetime.utcnow(),
        )
        session.add(user)
        await session.flush()

    await _get_or_create_workspace(session, user)
    await session.commit()
    await session.refresh(user)

    jwt_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=jwt_token,
        refresh_token=refresh_token,
        user={
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "avatar_url": user.avatar_url,
            "github_username": user.github_username,
            "has_github": bool(user.github_id),
        },
    )


@router.post("/refresh")
async def refresh_token(body: RefreshRequest, session: AsyncSession = Depends(get_session)):
    from auth import decode_token
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=400, detail="Invalid refresh token")

    user_id = payload.get("sub")
    result = await session.execute(select(User).where(User.id == user_id, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    new_access_token = create_access_token({"sub": user.id})
    new_refresh_token = create_refresh_token(user.id)

    return {"access_token": new_access_token, "refresh_token": new_refresh_token, "token_type": "bearer"}


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "avatar_url": current_user.avatar_url,
        "github_username": current_user.github_username,
        "has_github": bool(current_user.github_id),
        "has_google": bool(current_user.google_id),
        "credits": current_user.credits,
        "created_at": current_user.created_at,
        "last_login_at": current_user.last_login_at,
    }


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Logged out successfully"}
