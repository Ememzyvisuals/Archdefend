"""Initial schema

Revision ID: 001_initial
Revises:
Create Date: 2025-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable pgvector
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # Users
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("avatar_url", sa.String(500)),
        sa.Column("github_id", sa.String(100), unique=True),
        sa.Column("github_username", sa.String(100)),
        sa.Column("github_access_token", sa.Text()),
        sa.Column("google_id", sa.String(100), unique=True),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("is_verified", sa.Boolean(), default=False, nullable=False),
        sa.Column("credits", sa.Integer(), default=100, nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("last_login_at", sa.DateTime()),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_github_id", "users", ["github_id"])
    op.create_index("ix_users_google_id", "users", ["google_id"])

    # Workspaces
    op.create_table(
        "workspaces",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(100), unique=True, nullable=False),
        sa.Column("description", sa.String(1000)),
        sa.Column("avatar_url", sa.String(500)),
        sa.Column("owner_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_workspaces_slug", "workspaces", ["slug"])
    op.create_index("ix_workspaces_owner_id", "workspaces", ["owner_id"])

    # Workspace memberships
    op.create_table(
        "workspace_memberships",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("workspace_id", sa.String(36), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(20), default="member", nullable=False),
        sa.Column("invited_by", sa.String(36), sa.ForeignKey("users.id")),
        sa.Column("accepted_at", sa.DateTime()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_wm_workspace_id", "workspace_memberships", ["workspace_id"])
    op.create_index("ix_wm_user_id", "workspace_memberships", ["user_id"])

    # Subscriptions
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("workspace_id", sa.String(36), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("plan", sa.String(20), default="free", nullable=False),
        sa.Column("status", sa.String(20), default="active", nullable=False),
        sa.Column("nowpayments_payment_id", sa.String(255)),
        sa.Column("nowpayments_invoice_id", sa.String(255)),
        sa.Column("amount_usd", sa.Float()),
        sa.Column("currency", sa.String(10)),
        sa.Column("repositories_limit", sa.Integer(), default=1, nullable=False),
        sa.Column("analyses_per_month", sa.Integer(), default=5, nullable=False),
        sa.Column("reports_per_month", sa.Integer(), default=5, nullable=False),
        sa.Column("current_period_start", sa.DateTime()),
        sa.Column("current_period_end", sa.DateTime()),
        sa.Column("cancelled_at", sa.DateTime()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    # Payments
    op.create_table(
        "payments",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("workspace_id", sa.String(36), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("nowpayments_payment_id", sa.String(255), unique=True, nullable=False),
        sa.Column("amount_usd", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(10), nullable=False),
        sa.Column("pay_amount", sa.Float()),
        sa.Column("pay_currency", sa.String(20)),
        sa.Column("payment_status", sa.String(50), nullable=False),
        sa.Column("plan", sa.String(20), nullable=False),
        sa.Column("metadata", JSON()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_payments_workspace_id", "payments", ["workspace_id"])

    # Repositories
    op.create_table(
        "repositories",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("workspace_id", sa.String(36), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("github_repo_id", sa.BigInteger()),
        sa.Column("full_name", sa.String(500), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.String(1000)),
        sa.Column("private", sa.Boolean(), default=False, nullable=False),
        sa.Column("default_branch", sa.String(100), default="main", nullable=False),
        sa.Column("language", sa.String(100)),
        sa.Column("stars_count", sa.Integer(), default=0, nullable=False),
        sa.Column("size_kb", sa.Integer(), default=0, nullable=False),
        sa.Column("webhook_id", sa.BigInteger()),
        sa.Column("webhook_secret", sa.String(255)),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("last_synced_at", sa.DateTime()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_repositories_workspace_id", "repositories", ["workspace_id"])
    op.create_index("ix_repositories_github_repo_id", "repositories", ["github_repo_id"])

    # Analyses
    op.create_table(
        "analyses",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("repository_id", sa.String(36), sa.ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False),
        sa.Column("triggered_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(30), default="queued", nullable=False),
        sa.Column("commit_sha", sa.String(40)),
        sa.Column("branch", sa.String(100), default="main", nullable=False),
        sa.Column("error_message", sa.Text()),
        sa.Column("progress_percent", sa.Integer(), default=0, nullable=False),
        sa.Column("files_parsed", sa.Integer(), default=0, nullable=False),
        sa.Column("nodes_extracted", sa.Integer(), default=0, nullable=False),
        sa.Column("edges_extracted", sa.Integer(), default=0, nullable=False),
        sa.Column("languages_detected", JSON()),
        sa.Column("ai_summary", sa.Text()),
        sa.Column("architecture_overview", sa.Text()),
        sa.Column("tech_stack", JSON()),
        sa.Column("started_at", sa.DateTime()),
        sa.Column("completed_at", sa.DateTime()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_analyses_repository_id", "analyses", ["repository_id"])
    op.create_index("ix_analyses_status", "analyses", ["status"])

    # Architecture nodes
    op.create_table(
        "architecture_nodes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("analysis_id", sa.String(36), sa.ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("node_id", sa.String(500), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("file_path", sa.String(1000)),
        sa.Column("line_start", sa.Integer()),
        sa.Column("line_end", sa.Integer()),
        sa.Column("language", sa.String(50)),
        sa.Column("description", sa.Text()),
        sa.Column("metadata", JSON()),
        sa.Column("pos_x", sa.Float()),
        sa.Column("pos_y", sa.Float()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_arch_nodes_analysis_id", "architecture_nodes", ["analysis_id"])
    op.create_index("ix_arch_nodes_analysis_type", "architecture_nodes", ["analysis_id", "type"])

    # Architecture edges
    op.create_table(
        "architecture_edges",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("analysis_id", sa.String(36), sa.ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_id", sa.String(500), nullable=False),
        sa.Column("target_id", sa.String(500), nullable=False),
        sa.Column("edge_type", sa.String(50), nullable=False),
        sa.Column("label", sa.String(255)),
        sa.Column("weight", sa.Float(), default=1.0, nullable=False),
        sa.Column("metadata", JSON()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_arch_edges_analysis_id", "architecture_edges", ["analysis_id"])

    # Security findings
    op.create_table(
        "security_findings",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("analysis_id", sa.String(36), sa.ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("severity", sa.String(20), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("file_path", sa.String(1000)),
        sa.Column("line_number", sa.Integer()),
        sa.Column("recommendation", sa.Text()),
        sa.Column("is_resolved", sa.Boolean(), default=False, nullable=False),
        sa.Column("resolved_at", sa.DateTime()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_security_findings_analysis_id", "security_findings", ["analysis_id"])
    op.create_index("ix_security_findings_severity", "security_findings", ["severity"])

    # Reports
    op.create_table(
        "reports",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("repository_id", sa.String(36), sa.ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False),
        sa.Column("analysis_id", sa.String(36), sa.ForeignKey("analyses.id"), nullable=False),
        sa.Column("generated_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("status", sa.String(20), default="generating", nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("content", sa.Text()),
        sa.Column("structured_data", JSON()),
        sa.Column("file_url", sa.String(1000)),
        sa.Column("export_format", sa.String(20)),
        sa.Column("error_message", sa.Text()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime()),
    )
    op.create_index("ix_reports_repository_id", "reports", ["repository_id"])

    # Notifications
    op.create_table(
        "notifications",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("data", JSON()),
        sa.Column("is_read", sa.Boolean(), default=False, nullable=False),
        sa.Column("read_at", sa.DateTime()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_is_read", "notifications", ["is_read"])

    # Audit logs
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id")),
        sa.Column("workspace_id", sa.String(36)),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("resource_type", sa.String(100), nullable=False),
        sa.Column("resource_id", sa.String(255)),
        sa.Column("details", JSON()),
        sa.Column("ip_address", sa.String(45)),
        sa.Column("user_agent", sa.String(500)),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("notifications")
    op.drop_table("reports")
    op.drop_table("security_findings")
    op.drop_table("architecture_edges")
    op.drop_table("architecture_nodes")
    op.drop_table("analyses")
    op.drop_table("repositories")
    op.drop_table("payments")
    op.drop_table("subscriptions")
    op.drop_table("workspace_memberships")
    op.drop_table("workspaces")
    op.drop_table("users")
