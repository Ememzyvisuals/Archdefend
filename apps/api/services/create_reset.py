"""
ArchDefend — Daily Credit Reset
Resets free tier users to 20 credits every 24 hours.
Called on every API startup and checked via a background task.
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta

logger = logging.getLogger("archdefend.credit_reset")

RESET_CREDITS = 20
RESET_INTERVAL_HOURS = 24


async def reset_free_credits():
    """Reset all free-tier users back to 20 credits if 24h have passed since last reset."""
    from core.database import AsyncSessionLocal
    from models.models import User, PlanTier, CreditTransaction
    from sqlalchemy import select, update

    async with AsyncSessionLocal() as db:
        try:
            cutoff = datetime.now(timezone.utc) - timedelta(hours=RESET_INTERVAL_HOURS)

            # Find free users whose credits were last reset > 24h ago
            # We use updated_at on the user as a proxy for last credit reset
            result = await db.execute(
                select(User).where(
                    User.plan == PlanTier.FREE,
                    User.credits < RESET_CREDITS,
                )
            )
            users = result.scalars().all()

            reset_count = 0
            for user in users:
                # Check if 24h have passed since last update
                last_update = user.updated_at or user.created_at
                if last_update and last_update.tzinfo is None:
                    last_update = last_update.replace(tzinfo=timezone.utc)

                if last_update and (datetime.now(timezone.utc) - last_update) >= timedelta(hours=RESET_INTERVAL_HOURS):
                    user.credits = RESET_CREDITS
                    # Log credit transaction
                    tx = CreditTransaction(
                        user_id=user.id,
                        amount=RESET_CREDITS - user.credits,
                        balance_after=RESET_CREDITS,
                        reason="daily_reset",
                    )
                    db.add(tx)
                    reset_count += 1

            if reset_count > 0:
                await db.commit()
                logger.info(f"✅ Daily credit reset: {reset_count} users reset to {RESET_CREDITS} credits")
        except Exception as e:
            logger.error(f"Credit reset failed: {e}")
            await db.rollback()


async def run_credit_reset_loop():
    """Background loop — check every 30 minutes for users due a reset."""
    while True:
        try:
            await reset_free_credits()
        except Exception as e:
            logger.error(f"Credit reset loop error: {e}")
        await asyncio.sleep(30 * 60)  # Check every 30 minutes
