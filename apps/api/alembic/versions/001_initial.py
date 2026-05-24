"""Initial schema

Revision ID: 001_initial
Revises:
Create Date: 2026-05-08
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable pgvector
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"")

    # Enums
    op.execute("CREATE TYPE plantier AS ENUM ('free', 'pro', 'team')")
    op.execute("CREATE TYPE analysisstatus AS ENUM ('pending', 'cloning', 'parsing', 'analyzing', 'generating', 'completed', 'failed')")
    op.execute("CREATE TYPE exportformat AS ENUM ('pdf', 'pptx', 'markdown', 'html')")

    # users
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('password_hash', sa.String(255)),
        sa.Column('github_id', sa.String(64), unique=True),
        sa.Column('github_username', sa.String(128)),
        sa.Column('github_access_token', sa.Text()),
        sa.Column('avatar_url', sa.String(512)),
        sa.Column('plan', sa.Enum('free', 'pro', 'team', name='plantier'), nullable=False, server_default='free'),
        sa.Column('credits', sa.Integer(), nullable=False, server_default='20'),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('is_verified', sa.Boolean(), server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    op.create_index('ix_users_email', 'users', ['email'])
    op.create_index('ix_users_github_id', 'users', ['github_id'])

    # analyses
    op.create_table(
        'analyses',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('repo_url', sa.String(1024), nullable=False),
        sa.Column('repo_name', sa.String(256)),
        sa.Column('repo_owner', sa.String(128)),
        sa.Column('repo_branch', sa.String(128), server_default='main'),
        sa.Column('status', sa.Enum('pending','cloning','parsing','analyzing','generating','completed','failed', name='analysisstatus'), server_default='pending'),
        sa.Column('credits_used', sa.Integer(), server_default='0'),
        sa.Column('repo_size_mb', sa.Float()),
        sa.Column('file_count', sa.Integer()),
        sa.Column('language_stats', postgresql.JSONB()),
        sa.Column('progress_pct', sa.Integer(), server_default='0'),
        sa.Column('error_message', sa.Text()),
        sa.Column('completed_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_analyses_user_id', 'analyses', ['user_id'])

    # analysis_reports
    op.create_table(
        'analysis_reports',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('analysis_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('analyses.id', ondelete='CASCADE'), unique=True),
        sa.Column('architecture_summary', sa.Text()),
        sa.Column('dependency_graph', postgresql.JSONB()),
        sa.Column('security_findings', postgresql.JSONB()),
        sa.Column('api_inventory', postgresql.JSONB()),
        sa.Column('scalability_score', sa.Integer()),
        sa.Column('production_readiness_score', sa.Integer()),
        sa.Column('interview_questions', postgresql.JSONB()),
        sa.Column('tech_stack', postgresql.JSONB()),
        sa.Column('recommendations', postgresql.JSONB()),
        sa.Column('hallucination_detected', sa.Boolean(), server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # subscriptions
    op.create_table(
        'subscriptions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('plan', sa.Enum('free', 'pro', 'team', name='plantier'), nullable=False),
        sa.Column('nowpayments_payment_id', sa.String(256), unique=True),
        sa.Column('nowpayments_order_id', sa.String(256)),
        sa.Column('status', sa.String(64), server_default='pending'),
        sa.Column('amount_usd', sa.Float()),
        sa.Column('currency', sa.String(32)),
        sa.Column('current_period_start', sa.DateTime(timezone=True)),
        sa.Column('current_period_end', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # credit_transactions
    op.create_table(
        'credit_transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('balance_after', sa.Integer(), nullable=False),
        sa.Column('reason', sa.String(256), nullable=False),
        sa.Column('reference_id', sa.String(256)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_credit_transactions_user_id', 'credit_transactions', ['user_id'])


def downgrade() -> None:
    op.drop_table('credit_transactions')
    op.drop_table('subscriptions')
    op.drop_table('analysis_reports')
    op.drop_table('analyses')
    op.drop_table('users')
    op.execute("DROP TYPE IF EXISTS plantier")
    op.execute("DROP TYPE IF EXISTS analysisstatus")
    op.execute("DROP TYPE IF EXISTS exportformat")
