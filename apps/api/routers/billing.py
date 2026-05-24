"""
ArchDefend — Billing Router
Correct NOWPayments integration based on their actual API documentation.

KEY FACTS about NOWPayments (researched from official docs):
─────────────────────────────────────────────────────────────
1. NOWPayments is NON-CUSTODIAL — funds go directly to your wallet, not held by them.
2. TWO flows available:
   a) PAYMENT API (/v1/payment) → returns pay_address + pay_amount for customer to send to
   b) INVOICE API (/v1/invoice) → returns invoice_url (hosted payment page) ← we use this
3. IPN signature: Sort body JSON alphabetically → HMAC-SHA512 with IPN secret → hexdigest
   Header is: x-nowpayments-sig (FastAPI reads as x_nowpayments_sig)
4. Full payment status lifecycle:
   waiting → confirming → confirmed → sending → partially_paid / finished / failed / expired / refunded
5. ONLY activate subscription on "finished" status (fully settled to merchant wallet)
   "confirmed" is NOT enough — funds still in transit at that point
6. The IPN secret from your screenshots: stored in NOWPAYMENTS_IPN_SECRET env var
   Your API key: stored in NOWPAYMENTS_API_KEY env var
"""

import hashlib
import hmac
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from core.security import get_current_user
from models.models import CreditTransaction, PlanTier, Subscription, User

logger = logging.getLogger("archdefend.billing")
router = APIRouter()

# ── Plan definitions ────────────────────────────────────────────────────────────

PLANS: dict[str, dict] = {
    "pro": {
        "name": "Pro",
        "price_usd": 19.0,
        "credits": 250,
        "tier": PlanTier.PRO,
        "desc": "250 credits/month — full analysis suite",
    },
    "team": {
        "name": "Team",
        "price_usd": 79.0,
        "credits": 1200,
        "tier": PlanTier.TEAM,
        "desc": "1,200 credits/month — team workspace",
    },
}

# ── NOWPayments Client ──────────────────────────────────────────────────────────

class NOWPaymentsClient:
    """
    Correct NOWPayments API client.

    Uses the INVOICE API (not the payment API) because:
    - Invoices generate a hosted payment page URL we can redirect users to
    - Simpler UX — customer doesn't need to copy a wallet address manually
    - NOWPayments handles the currency selection UI

    Supports both sandbox and production via NOWPAYMENTS_BASE_URL:
      Production: https://api.nowpayments.io/v1
      Sandbox:    https://api-sandbox.nowpayments.io/v1
    """

    def __init__(self, api_key: str, ipn_secret: str):
        self._api_key = api_key
        self._ipn_secret = ipn_secret
        # Use the configurable base URL — swap sandbox/production via env
        self._base = settings.NOWPAYMENTS_BASE_URL
        self._http = httpx.AsyncClient(timeout=30.0)

    async def create_invoice(
        self,
        price_amount: float,
        order_id: str,
        order_description: str,
        ipn_callback_url: str,
        success_url: str,
        cancel_url: str,
    ) -> dict:
        """
        POST /v1/invoice
        Returns invoice_url — a hosted NOWPayments payment page.
        Customer selects currency and pays on their hosted page.
        We get notified via IPN webhook when payment status changes.
        """
        payload = {
            "price_amount": price_amount,
            "price_currency": "usd",
            "ipn_callback_url": ipn_callback_url,
            "order_id": order_id,
            "order_description": order_description,
            "success_url": success_url,
            "cancel_url": cancel_url,
        }
        r = await self._http.post(
            f"{self._base}/invoice",
            headers={
                "x-api-key": self._api_key,
                "Content-Type": "application/json",
            },
            json=payload,
        )
        if r.status_code not in (200, 201):
            logger.error(f"NOWPayments invoice error {r.status_code}: {r.text[:300]}")
            raise RuntimeError(f"NOWPayments error {r.status_code}: {r.text[:200]}")
        return r.json()

    async def get_payment_status(self, payment_id: str) -> dict:
        """GET /v1/payment/{payment_id} — poll payment status manually."""
        r = await self._http.get(
            f"{self._base}/payment/{payment_id}",
            headers={"x-api-key": self._api_key},
        )
        if r.status_code != 200:
            raise RuntimeError(f"Status check failed {r.status_code}: {r.text[:200]}")
        return r.json()

    def verify_ipn_signature(self, raw_body: bytes, received_sig: str) -> bool:
        """
        Correct IPN signature verification per NOWPayments docs:

        1. Parse the JSON body
        2. Sort ALL keys alphabetically (recursive for nested objects)
        3. Re-serialize with separators=(',',':') and sort_keys=True
        4. HMAC-SHA512 with the IPN secret key
        5. Compare hexdigest with x-nowpayments-sig header

        Reference: https://nowpayments.zendesk.com/hc/en-us/articles/21395546303389-IPN-and-how-to-setup
        """
        if not self._ipn_secret:
            logger.warning("IPN secret not configured — skipping signature check (INSECURE)")
            return True

        try:
            body_dict = json.loads(raw_body)
        except json.JSONDecodeError:
            logger.error("IPN body is not valid JSON")
            return False

        # Sort ALL keys alphabetically (json.dumps with sort_keys handles nested too)
        sorted_body = json.dumps(body_dict, sort_keys=True, separators=(',', ':'))

        computed = hmac.new(
            self._ipn_secret.encode("utf-8"),
            sorted_body.encode("utf-8"),
            hashlib.sha512,
        ).hexdigest()

        is_valid = hmac.compare_digest(computed, received_sig.lower())
        if not is_valid:
            logger.warning(
                f"IPN signature mismatch. "
                f"Expected: {computed[:20]}... Got: {received_sig[:20]}..."
            )
        return is_valid

    async def close(self):
        await self._http.aclose()


# Singleton — only instantiated if keys are configured
_client: Optional[NOWPaymentsClient] = None

def get_nowpayments() -> NOWPaymentsClient:
    global _client
    if _client is None:
        if not settings.NOWPAYMENTS_API_KEY:
            raise HTTPException(503, "Payment processor not configured. Set NOWPAYMENTS_API_KEY.")
        _client = NOWPaymentsClient(
            api_key=settings.NOWPAYMENTS_API_KEY,
            ipn_secret=settings.NOWPAYMENTS_IPN_SECRET,
        )
    return _client


# ── Schemas ─────────────────────────────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    plan: str  # "pro" | "team"


class CheckoutResponse(BaseModel):
    invoice_url: str   # Hosted NOWPayments payment page — redirect user here
    invoice_id: str
    order_id: str
    plan: str
    amount_usd: float


# ── Routes ───────────────────────────────────────────────────────────────────────

@router.get("/plans")
async def get_plans():
    """Return available subscription plans with pricing."""
    return {
        "plans": [
            {
                "id": plan_id,
                "name": plan["name"],
                "price_usd": plan["price_usd"],
                "credits": plan["credits"],
                "description": plan["desc"],
            }
            for plan_id, plan in PLANS.items()
        ],
        "free": {
            "credits": settings.FREE_TIER_CREDITS,
            "description": "20 analysis credits, no credit card required",
        },
    }


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    req: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a NOWPayments invoice and return the hosted payment URL.
    User is redirected to invoice_url to complete payment on NOWPayments' page.
    Credits are ONLY granted after IPN webhook confirms payment is "finished".
    """
    plan = PLANS.get(req.plan)
    if not plan:
        raise HTTPException(400, f"Unknown plan: {req.plan}. Available: {list(PLANS.keys())}")

    client = get_nowpayments()

    # Order ID format: arch_{user_id}_{plan}_{timestamp}
    # This is what we match in the webhook to identify the subscription
    order_id = f"arch_{str(current_user.id)[:8]}_{req.plan}_{int(datetime.now().timestamp())}"

    # Create a pending subscription record BEFORE calling NOWPayments
    # So we can match the order_id in the webhook
    subscription = Subscription(
        user_id=current_user.id,
        plan=plan["tier"],
        nowpayments_order_id=order_id,
        amount_usd=plan["price_usd"],
        status="pending",
    )
    db.add(subscription)
    await db.commit()
    await db.refresh(subscription)

    # Build callback URLs
    frontend_url = settings.CORS_ORIGINS[0] if settings.CORS_ORIGINS else "http://localhost:3000"
    backend_url = settings.CORS_ORIGINS[0].replace("3000", "8000") if settings.CORS_ORIGINS else "http://localhost:8000"

    try:
        invoice = await client.create_invoice(
            price_amount=plan["price_usd"],
            order_id=order_id,
            order_description=f"ArchDefend {plan['name']} — {plan['credits']} credits/month",
            ipn_callback_url=f"{backend_url}/api/v1/billing/webhook/nowpayments",
            success_url=f"{frontend_url}/billing/success?plan={req.plan}&order={order_id}",
            cancel_url=f"{frontend_url}/pricing?cancelled=1",
        )
    except RuntimeError as e:
        # Clean up pending subscription on API error
        await db.delete(subscription)
        await db.commit()
        logger.error(f"NOWPayments invoice creation failed: {e}")
        raise HTTPException(502, "Payment gateway temporarily unavailable. Please try again.")

    # Update subscription with the invoice ID from NOWPayments
    invoice_id = invoice.get("id", "")
    await db.execute(
        update(Subscription)
        .where(Subscription.id == subscription.id)
        .values(nowpayments_payment_id=invoice_id)
    )
    await db.commit()

    invoice_url = invoice.get("invoice_url", "")
    logger.info(f"Invoice created: {invoice_id} for user {current_user.email} — {plan['name']}")

    return CheckoutResponse(
        invoice_url=invoice_url,
        invoice_id=invoice_id,
        order_id=order_id,
        plan=req.plan,
        amount_usd=plan["price_usd"],
    )


@router.post("/webhook/nowpayments")
async def nowpayments_ipn_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    # FastAPI automatically converts header x-nowpayments-sig → x_nowpayments_sig
    x_nowpayments_sig: Optional[str] = Header(None),
):
    """
    NOWPayments IPN (Instant Payment Notification) webhook handler.

    Called by NOWPayments on EVERY payment status change.
    Status lifecycle: waiting → confirming → confirmed → sending → finished

    SECURITY: We ONLY trust the IPN signature — never frontend state.
    CREDITS: Only granted when status == "finished" (fully settled).

    Payment statuses from NOWPayments docs:
    - waiting:       Customer hasn't sent payment yet
    - confirming:    Transaction detected on blockchain, waiting for confirmations
    - confirmed:     Enough blockchain confirmations received
    - sending:       NOWPayments sending funds to your wallet
    - partially_paid: Customer sent less than required amount
    - finished:      ✅ Funds fully settled in merchant wallet — GRANT CREDITS HERE
    - failed:        Payment failed
    - expired:       Payment window expired
    - refunded:      Payment was refunded
    """
    # Read raw body BEFORE any parsing (needed for signature verification)
    raw_body = await request.body()

    # ── Step 1: Verify IPN signature ─────────────────────────────────────────
    if not x_nowpayments_sig:
        logger.warning("IPN received without x-nowpayments-sig header — rejecting")
        raise HTTPException(403, "Missing IPN signature")

    try:
        client = get_nowpayments()
    except HTTPException:
        # Payment processor not configured — log and return 200 to prevent retries
        logger.error("NOWPayments not configured but received IPN webhook")
        return {"received": True, "processed": False}

    if not client.verify_ipn_signature(raw_body, x_nowpayments_sig):
        logger.warning(f"IPN signature verification FAILED — possible spoofing attempt")
        raise HTTPException(403, "Invalid IPN signature")

    # ── Step 2: Parse body ────────────────────────────────────────────────────
    try:
        data = json.loads(raw_body)
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON body")

    payment_id    = str(data.get("payment_id", ""))
    payment_status = data.get("payment_status", "")
    order_id      = str(data.get("order_id", ""))
    actually_paid = float(data.get("actually_paid", 0))
    price_amount  = float(data.get("price_amount", 0))

    logger.info(
        f"IPN received: payment_id={payment_id} status={payment_status} "
        f"order_id={order_id} paid={actually_paid}/{price_amount}"
    )

    # ── Step 3: Find the subscription ─────────────────────────────────────────
    subscription = await db.scalar(
        select(Subscription).where(Subscription.nowpayments_order_id == order_id)
    )
    if not subscription:
        # Could be a different order or race condition — log and return 200
        logger.warning(f"IPN for unknown order_id: {order_id}")
        return {"received": True, "processed": False, "reason": "order_not_found"}

    # ── Step 4: Handle each status ─────────────────────────────────────────────

    if payment_status == "finished":
        # ✅ FINAL SUCCESS — funds fully settled in merchant wallet
        # This is the ONLY status where we should grant credits

        if subscription.status == "active":
            # Already processed (duplicate IPN webhook — NOWPayments can send multiple)
            logger.info(f"Duplicate 'finished' IPN for order {order_id} — ignoring")
            return {"received": True, "processed": False, "reason": "already_processed"}

        plan = PLANS.get(subscription.plan.value)
        if not plan:
            logger.error(f"Unknown plan in subscription {subscription.id}: {subscription.plan}")
            return {"received": True, "processed": False}

        now = datetime.now(timezone.utc)

        # Activate subscription
        await db.execute(
            update(Subscription)
            .where(Subscription.id == subscription.id)
            .values(
                status="active",
                nowpayments_payment_id=payment_id,
                current_period_start=now,
                current_period_end=now + timedelta(days=30),
            )
        )

        # Fetch user and upgrade plan + add credits atomically
        user = await db.scalar(select(User).where(User.id == subscription.user_id))
        if user:
            new_credits = user.credits + plan["credits"]
            await db.execute(
                update(User)
                .where(User.id == user.id)
                .values(plan=plan["tier"], credits=new_credits)
            )
            db.add(CreditTransaction(
                user_id=user.id,
                amount=plan["credits"],
                balance_after=new_credits,
                reason=f"subscription_{plan['tier'].value}_activated",
                reference_id=str(subscription.id),
            ))
            await db.commit()
            logger.info(
                f"✅ {plan['name']} activated for {user.email} "
                f"(+{plan['credits']} credits, balance={new_credits})"
            )

    elif payment_status == "partially_paid":
        # Customer sent less than required
        # NOWPayments still considers this a valid payment in some cases
        # For simplicity: mark as partially_paid, don't grant credits, notify user
        await db.execute(
            update(Subscription)
            .where(Subscription.id == subscription.id)
            .values(status="partially_paid")
        )
        await db.commit()
        logger.warning(
            f"Partial payment for order {order_id}: "
            f"paid {actually_paid} of {price_amount} USD"
        )

    elif payment_status in ("failed", "expired", "refunded"):
        # Terminal failure states
        await db.execute(
            update(Subscription)
            .where(Subscription.id == subscription.id)
            .values(status=payment_status)
        )
        await db.commit()
        logger.info(f"Subscription {subscription.id} → {payment_status}")

    elif payment_status in ("waiting", "confirming", "confirmed", "sending"):
        # Intermediate states — update for UI display but don't grant credits yet
        await db.execute(
            update(Subscription)
            .where(Subscription.id == subscription.id)
            .values(status=payment_status)
        )
        await db.commit()
        logger.info(f"Subscription {subscription.id} → {payment_status} (pending)")

    else:
        logger.warning(f"Unknown payment_status received: {payment_status}")

    # Always return 200 to NOWPayments — otherwise they'll retry
    return {"received": True, "processed": True}


@router.get("/credits")
async def get_credits(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's credit balance and recent transaction history."""
    transactions = (
        await db.execute(
            select(CreditTransaction)
            .where(CreditTransaction.user_id == current_user.id)
            .order_by(CreditTransaction.created_at.desc())
            .limit(20)
        )
    ).scalars().all()

    return {
        "credits": current_user.credits,
        "plan": current_user.plan.value,
        "transactions": [
            {
                "amount": t.amount,
                "balance_after": t.balance_after,
                "reason": t.reason,
                "created_at": t.created_at.isoformat(),
            }
            for t in transactions
        ],
    }


@router.get("/subscription")
async def get_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current active subscription details."""
    subscription = await db.scalar(
        select(Subscription)
        .where(
            Subscription.user_id == current_user.id,
            Subscription.status == "active",
        )
        .order_by(Subscription.created_at.desc())
    )
    if not subscription:
        return {"subscription": None}

    return {
        "subscription": {
            "plan": subscription.plan.value,
            "status": subscription.status,
            "current_period_end": (
                subscription.current_period_end.isoformat()
                if subscription.current_period_end else None
            ),
        }
    }
