-- ArchDefend — PostgreSQL Initialization
-- Run automatically on first Docker Compose launch

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- trigram search on repo names

-- Performance indexes (beyond what Alembic creates)
-- These run after Alembic migrations have created the tables.
-- Safe to run multiple times.

DO $$
BEGIN
  -- Users
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_users_github_id') THEN
    CREATE INDEX ix_users_github_id ON users(github_id) WHERE github_id IS NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_users_plan') THEN
    CREATE INDEX ix_users_plan ON users(plan);
  END IF;

  -- Analyses
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_analyses_status') THEN
    CREATE INDEX ix_analyses_status ON analyses(status);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_analyses_created_at') THEN
    CREATE INDEX ix_analyses_created_at ON analyses(created_at DESC);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_analyses_user_status') THEN
    CREATE INDEX ix_analyses_user_status ON analyses(user_id, status);
  END IF;

  -- Repo name trigram index for search
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_analyses_repo_name_trgm') THEN
    CREATE INDEX ix_analyses_repo_name_trgm ON analyses USING gin(repo_name gin_trgm_ops) WHERE repo_name IS NOT NULL;
  END IF;

  -- Subscriptions
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_subscriptions_status') THEN
    CREATE INDEX ix_subscriptions_status ON subscriptions(status);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_subscriptions_period_end') THEN
    CREATE INDEX ix_subscriptions_period_end ON subscriptions(current_period_end) WHERE status = 'active';
  END IF;

  -- Credit transactions
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_credits_created_at') THEN
    CREATE INDEX ix_credits_created_at ON credit_transactions(created_at DESC);
  END IF;

EXCEPTION
  WHEN undefined_table THEN
    -- Tables don't exist yet (Alembic hasn't run). Indexes will be created separately.
    RAISE NOTICE 'Tables not yet created — skipping index creation. Run alembic upgrade head first.';
END $$;

-- Default configuration
ALTER DATABASE archdefend SET timezone TO 'UTC';
