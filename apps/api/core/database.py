"""
ArchDefend — Async Database Configuration
SQLAlchemy 2.0 + asyncpg + Supabase Supavisor
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from sqlalchemy import text
import logging

from .config import settings

logger = logging.getLogger(__name__)


def _build_engine():
    url = settings.DATABASE_URL
    is_transaction_pooler = ":6543" in url

    if is_transaction_pooler:
        logger.info("🔌 Using Supabase transaction pooler (port 6543) — NullPool mode")
        return create_async_engine(
            url,
            poolclass=NullPool,
            echo=settings.DEBUG,
            connect_args={
                "statement_cache_size": 0,
                "prepared_statement_cache_size": 0,
            },
        )
    else:
        logger.info("🔌 Using direct connection (port 5432)")
        return create_async_engine(
            url,
            pool_size=settings.DATABASE_POOL_SIZE,
            max_overflow=settings.DATABASE_MAX_OVERFLOW,
            echo=settings.DEBUG,
            pool_pre_ping=True,
            connect_args={
                "statement_cache_size": 0,
                "prepared_statement_cache_size": 0,
            },
        )


engine = _build_engine()

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    """FastAPI dependency for database sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database — enable pgvector, create tables."""
    async with engine.begin() as conn:
        try:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            logger.info("✅ pgvector extension enabled")
        except Exception as e:
            logger.warning(f"pgvector extension setup: {e}")

        await conn.run_sync(Base.metadata.create_all)
        logger.info("✅ All database tables created")
