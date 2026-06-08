from datetime import datetime
from typing import Optional
import hashlib
import hmac
import json
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from pydantic import BaseModel
from database import get_session
from models import (
    Workspace, WorkspaceMembership, User, UserRole, Subscription,
    SubscriptionPlan, SubscriptionStatus, Payment, Notification
)
from auth import get_current_user
from config import settings

# ─── Workspaces ───────────────────────────────────────────────────────────────
workspaces_router = APIRouter(prefix="/workspaces", tags=["workspaces"])


class UpdateWorkspaceRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


@workspaces_router.get("/my")
async def get_my_workspaces(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(WorkspaceMembership).where(WorkspaceMembership.user_id == current_user.id)
    )
    memberships = result.scalars().all()

    workspaces = []
    for m in memberships:
        ws_result = await session.execute(
            select(Workspace).where(Workspace.id == m.workspace_id)
        )
        ws = ws_result.scalar_one_or_none()
        if not ws:
            continue

        sub_result = await session.execute(
            select(Subscription).where(Subscription.workspace_id == ws.id)
        )
        sub = sub_result.scalar_one_or_none()

        members_result = await session.execute(
            select(WorkspaceMembership).where(WorkspaceMembership.workspace_id == ws.id)
        )
        members_count = len(members_result.scalars().all())

        workspaces.append({
            "id": ws.id,
            "name": ws.name,
            "slug": ws.slug,
            "description": ws.description,
            "avatar_url": ws.avatar_url,
            "owner_id": ws.owner_id,
            "role": m.role.value,
            "plan": sub.plan.value if sub else "free",
            "members_count": members_count,
            "created_at": ws.created_at,
        })
    return workspaces


@workspaces_router.get("/{workspace_id}")
async def get_workspace(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    m_result = await session.execute(
        select(WorkspaceMembership).where(
            WorkspaceMembership.workspace_id == workspace_id,
            WorkspaceMembership.user_id == current_user.id,
        )
    )
    if not m_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Access denied")

    ws_result = await session.execute(
        select(Workspace).where(Workspace.id == workspace_id)
    )
    ws = ws_result.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    sub_result = await session.execute(
        select(Subscription).where(Subscription.workspace_id == workspace_id)
    )
    sub = sub_result.scalar_one_or_none()

    return {
        "id": ws.id,
        "name": ws.name,
        "slug": ws.slug,
        "description": ws.description,
        "owner_id": ws.owner_id,
        "plan": sub.plan.value if sub else "free",
        "created_at": ws.created_at,
    }


@workspaces_router.patch("/{workspace_id}")
async def update_workspace(
    workspace_id: str,
    body: UpdateWorkspaceRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    m_result = await session.execute(
        select(WorkspaceMembership).where(
            WorkspaceMembership.workspace_id == workspace_id,
            WorkspaceMembership.user_id == current_user.id,
            WorkspaceMembership.role.in_([UserRole.OWNER, UserRole.ADMIN]),
        )
    )
    if not m_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Only owners and admins can update workspace")

    ws_result = await session.execute(
        select(Workspace).where(Workspace.id == workspace_id)
    )
    ws = ws_result.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if body.name:
        ws.name = body.name
    if body.description is not None:
        ws.description = body.description
    ws.updated_at = datetime.utcnow()
    session.add(ws)
    await session.commit()
    return {"message": "Workspace updated"}


@workspaces_router.get("/{workspace_id}/members")
async def list_members(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    m_result = await session.execute(
        select(WorkspaceMembership).where(
            WorkspaceMembership.workspace_id == workspace_id,
            WorkspaceMembership.user_id == current_user.id,
        )
    )
    if not m_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Access denied")

    result = await session.execute(
        select(WorkspaceMembership).where(WorkspaceMembership.workspace_id == workspace_id)
    )
    memberships = result.scalars().all()

    members = []
    for m in memberships:
        u_result = await session.execute(select(User).where(User.id == m.user_id))
        u = u_result.scalar_one_or_none()
        if u:
            members.append({
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "avatar_url": u.avatar_url,
                "role": m.role.value,
                "joined_at": m.accepted_at,
            })
    return members


@workspaces_router.delete("/{workspace_id}/members/{user_id}")
async def remove_member(
    workspace_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    owner_check = await session.execute(
        select(WorkspaceMembership).where(
            WorkspaceMembership.workspace_id == workspace_id,
            WorkspaceMembership.user_id == current_user.id,
            WorkspaceMembership.role == UserRole.OWNER,
        )
    )
    if not owner_check.scalar_one_or_none() and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Only owners can remove members")

    result = await session.execute(
        select(WorkspaceMembership).where(
            WorkspaceMembership.workspace_id == workspace_id,
            WorkspaceMembership.user_id == user_id,
        )
    )
    membership = result.scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=404, detail="Member not found")
    if membership.role == UserRole.OWNER and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Cannot remove workspace owner")

    await session.delete(membership)
    await session.commit()
    return {"message": "Member removed"}


# ─── Notifications ────────────────────────────────────────────────────────────
notifications_router = APIRouter(prefix="/notifications", tags=["notifications"])


@notifications_router.get("/")
async def list_notifications(
    unread_only: bool = False,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    query = select(Notification).where(Notification.user_id == current_user.id)
    if unread_only:
        query = query.where(Notification.is_read == False)  # noqa: E712
    query = query.order_by(Notification.created_at.desc()).limit(limit)
    result = await session.execute(query)
    notifications = result.scalars().all()
    return [
        {
            "id": n.id,
            "type": n.type.value,
            "title": n.title,
            "message": n.message,
            "data": n.data,
            "is_read": n.is_read,
            "created_at": n.created_at,
        }
        for n in notifications
    ]


@notifications_router.post("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    notif.read_at = datetime.utcnow()
    session.add(notif)
    await session.commit()
    return {"message": "Marked as read"}


@notifications_router.post("/read-all")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Notification).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,  # noqa: E712
        )
    )
    notifications = result.scalars().all()
    now = datetime.utcnow()
    for n in notifications:
        n.is_read = True
        n.read_at = now
        session.add(n)
    await session.commit()
    return {"message": f"Marked {len(notifications)} as read"}


# ─── Payments ─────────────────────────────────────────────────────────────────
payments_router = APIRouter(prefix="/payments", tags=["payments"])

NOWPAYMENTS_API_URL = "https://api.nowpayments.io/v1"

PLAN_PRICES = {
    SubscriptionPlan.STARTER: 19.0,
    SubscriptionPlan.PRO: 49.0,
    SubscriptionPlan.ENTERPRISE: 149.0,
}

PLAN_LIMITS = {
    SubscriptionPlan.FREE:       {"repositories_limit": 1,    "analyses_per_month": 5,    "reports_per_month": 5},
    SubscriptionPlan.STARTER:    {"repositories_limit": 3,    "analyses_per_month": 30,   "reports_per_month": 30},
    SubscriptionPlan.PRO:        {"repositories_limit": 20,   "analyses_per_month": 200,  "reports_per_month": 100},
    SubscriptionPlan.ENTERPRISE: {"repositories_limit": 9999, "analyses_per_month": 9999, "reports_per_month": 9999},
}


class CreatePaymentRequest(BaseModel):
    workspace_id: str
    plan: SubscriptionPlan
    pay_currency: str = "usdttrc20"


@payments_router.post("/create")
async def create_payment(
    body: CreatePaymentRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    m_result = await session.execute(
        select(WorkspaceMembership).where(
            WorkspaceMembership.workspace_id == body.workspace_id,
            WorkspaceMembership.user_id == current_user.id,
            WorkspaceMembership.role.in_([UserRole.OWNER, UserRole.ADMIN]),
        )
    )
    if not m_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Only owners can manage billing")

    if body.plan == SubscriptionPlan.FREE:
        raise HTTPException(status_code=400, detail="Cannot purchase free plan")

    amount = PLAN_PRICES[body.plan]
    api_base = settings.GITHUB_CALLBACK_URL.rsplit("/api/v1", 1)[0]

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{NOWPAYMENTS_API_URL}/payment",
            json={
                "price_amount": amount,
                "price_currency": "usd",
                "pay_currency": body.pay_currency,
                "order_id": f"archdefend_{body.workspace_id}_{body.plan.value}",
                "order_description": f"ArchDefend {body.plan.value.capitalize()} Plan",
                "ipn_callback_url": f"{api_base}/api/v1/payments/webhook",
                "success_url": f"https://archdefend.vercel.app/dashboard/billing?success=1",
                "cancel_url": f"https://archdefend.vercel.app/dashboard/billing?cancelled=1",
            },
            headers={
                "x-api-key": settings.NOWPAYMENTS_API_KEY,
                "Content-Type": "application/json",
            },
            timeout=30,
        )

    if resp.status_code != 201:
        raise HTTPException(status_code=400, detail=f"Payment creation failed: {resp.text[:200]}")

    payment_data = resp.json()

    # Use payment_meta (renamed from metadata to avoid SQLAlchemy conflict)
    payment = Payment(
        workspace_id=body.workspace_id,
        nowpayments_payment_id=str(payment_data["payment_id"]),
        amount_usd=amount,
        currency="usd",
        pay_currency=body.pay_currency,
        payment_status=payment_data.get("payment_status", "waiting"),
        plan=body.plan,
        payment_meta={"response": payment_data},
    )
    session.add(payment)
    await session.commit()

    return {
        "payment_id": payment_data["payment_id"],
        "payment_url": payment_data.get("invoice_url") or f"https://nowpayments.io/payment/{payment_data['payment_id']}",
        "pay_address": payment_data.get("pay_address"),
        "pay_amount": payment_data.get("pay_amount"),
        "pay_currency": body.pay_currency,
        "status": payment_data.get("payment_status"),
    }


@payments_router.post("/webhook")
async def nowpayments_webhook(
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    body = await request.body()
    sig = request.headers.get("x-nowpayments-sig", "")

    sorted_body = json.dumps(json.loads(body), sort_keys=True, separators=(",", ":"))
    expected = hmac.new(
        settings.NOWPAYMENTS_IPN_SECRET.encode(),
        sorted_body.encode(),
        hashlib.sha512,
    ).hexdigest()

    if not hmac.compare_digest(expected, sig):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    data = json.loads(body)
    payment_id = str(data.get("payment_id", ""))
    payment_status = data.get("payment_status", "")

    result = await session.execute(
        select(Payment).where(Payment.nowpayments_payment_id == payment_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        return {"status": "ignored"}

    payment.payment_status = payment_status
    payment.updated_at = datetime.utcnow()
    session.add(payment)

    if payment_status in ("finished", "confirmed", "partially_paid"):
        sub_result = await session.execute(
            select(Subscription).where(Subscription.workspace_id == payment.workspace_id)
        )
        sub = sub_result.scalar_one_or_none()
        limits = PLAN_LIMITS[payment.plan]
        if sub:
            sub.plan = payment.plan
            sub.status = SubscriptionStatus.ACTIVE
            sub.nowpayments_payment_id = payment_id
            sub.amount_usd = payment.amount_usd
            sub.repositories_limit = limits["repositories_limit"]
            sub.analyses_per_month = limits["analyses_per_month"]
            sub.reports_per_month = limits["reports_per_month"]
            sub.current_period_start = datetime.utcnow()
            sub.updated_at = datetime.utcnow()
            session.add(sub)

    await session.commit()
    return {"status": "processed"}


@payments_router.get("/workspace/{workspace_id}/billing")
async def get_billing(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    m_result = await session.execute(
        select(WorkspaceMembership).where(
            WorkspaceMembership.workspace_id == workspace_id,
            WorkspaceMembership.user_id == current_user.id,
        )
    )
    if not m_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Access denied")

    sub_result = await session.execute(
        select(Subscription).where(Subscription.workspace_id == workspace_id)
    )
    sub = sub_result.scalar_one_or_none()

    payments_result = await session.execute(
        select(Payment)
        .where(Payment.workspace_id == workspace_id)
        .order_by(Payment.created_at.desc())
        .limit(20)
    )
    payments = payments_result.scalars().all()

    return {
        "subscription": {
            "plan": sub.plan.value if sub else "free",
            "status": sub.status.value if sub else "active",
            "repositories_limit": sub.repositories_limit if sub else 1,
            "analyses_per_month": sub.analyses_per_month if sub else 5,
            "reports_per_month": sub.reports_per_month if sub else 5,
            "current_period_end": sub.current_period_end if sub else None,
        },
        "payments": [
            {
                "id": p.id,
                "plan": p.plan.value,
                "amount_usd": p.amount_usd,
                "pay_currency": p.pay_currency,
                "status": p.payment_status,
                "created_at": p.created_at,
            }
            for p in payments
        ],
        "available_plans": [
            {"id": "starter",    "name": "Starter",    "price_usd": 19,  "repositories": 3,    "analyses": 30,   "reports": 30},
            {"id": "pro",        "name": "Pro",         "price_usd": 49,  "repositories": 20,   "analyses": 200,  "reports": 100, "popular": True},
            {"id": "enterprise", "name": "Enterprise",  "price_usd": 149, "repositories": 9999, "analyses": 9999, "reports": 9999},
        ],
    }
