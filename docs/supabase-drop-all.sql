-- ArchDefend — Drop all existing tables before fresh migration
-- Run this in Supabase SQL Editor → then Alembic will rebuild everything

-- Step 1: Drop all tables in public schema (cascade handles foreign keys)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
    ) LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        RAISE NOTICE 'Dropped table: %', r.tablename;
    END LOOP;
END $$;

-- Step 2: Drop any stray sequences
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
    ) LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequence_name) || ' CASCADE';
    END LOOP;
END $$;

-- Step 3: Drop any stray types/enums
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT typname
        FROM pg_type
        JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
        WHERE pg_namespace.nspname = 'public'
        AND pg_type.typtype = 'e'
    ) LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;
END $$;

-- Step 4: Re-enable extensions (safe to run even if already enabled)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify: should return 0 rows if clean
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
