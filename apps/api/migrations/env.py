import asyncio
import sys
import os
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import create_async_engine
from alembic import context

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings

config = context.config

# FIX: Alembic passes this value through Python's configparser which uses %
# for interpolation (e.g. %(VAR)s). URL-encoded passwords like %40 (for @)
# trigger "ValueError: invalid interpolation syntax".
# Solution: double every % so configparser reads %% → literal %.
# The actual DB engine calls (create_async_engine) use settings.DATABASE_URL
# directly and are NOT affected by this escaping.
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL.replace("%", "%%"))

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

from sqlmodel import SQLModel
import models  # noqa: F401 — registers all SQLModel tables

target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    # Use settings.DATABASE_URL directly here too — bypasses configparser
    # entirely so the raw URL (with % signs) is handled by SQLAlchemy, not
    # by the ini-file parser.
    context.configure(
        url=settings.DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    async_engine = create_async_engine(settings.DATABASE_URL, poolclass=pool.NullPool)
    async with async_engine.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await async_engine.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
