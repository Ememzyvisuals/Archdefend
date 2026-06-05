from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional, List
from enum import Enum
from sqlmodel import Field, SQLModel, Relationship, Column
from sqlalchemy import JSON, Text, Index
import sqlalchemy as sa


def new_uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.utcnow()


# ─── Enums ────────────────────────────────────────────────────────────────────

class UserRole(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"


class AnalysisStatus(str, Enum):
    QUEUED = "queued"
    CLONING = "cloning"
    PARSING = "parsing"
    GRAPHING = "graphing"
    AI_PROCESSING = "ai_processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ReportType(str, Enum):
    ARCHITECTURE_OVERVIEW = "architecture_overview"
    ONBOARDING = "onboarding"
    INTERVIEW_DEFENSE = "interview_defense"
    DEPENDENCY_ANALYSIS = "dependency_analysis"
    SCALABILITY = "scalability"
    TECHNICAL_DEBT = "technical_debt"
    SECURITY = "security"


class ReportStatus(str, Enum):
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class NodeType(str, Enum):
    SERVICE = "service"
    MODULE = "module"
    CLASS = "class"
    FUNCTION = "function"
    API_ENDPOINT = "api_endpoint"
    DATABASE = "database"
    EXTERNAL = "external"


class EdgeType(str, Enum):
    IMPORTS = "imports"
    CALLS = "calls"
    EXTENDS = "extends"
    IMPLEMENTS = "implements"
    DEPENDS_ON = "depends_on"
    HTTP_CALL = "http_call"


class SubscriptionPlan(str, Enum):
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    CANCELLED = "cancelled"
    PAST_DUE = "past_due"
    TRIALING = "trialing"


class NotificationType(str, Enum):
    ANALYSIS_COMPLETED = "analysis_completed"
    ANALYSIS_FAILED = "analysis_failed"
    SECURITY_FINDING = "security_finding"
    DRIFT_DETECTED = "drift_detected"
    WORKSPACE_INVITE = "workspace_invite"
    REPORT_READY = "report_ready"


class SecuritySeverity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class ExportFormat(str, Enum):
    PDF = "pdf"
    MARKDOWN = "markdown"
    PPTX = "pptx"


# ─── Users ────────────────────────────────────────────────────────────────────

class User(SQLModel, table=True):
    __tablename__ = "users"

    id: str = Field(default_factory=new_uuid, primary_key=True)
    email: str = Field(unique=True, index=True, max_length=255)
    name: str = Field(max_length=255)
    avatar_url: Optional[str] = Field(default=None, max_length=500)
    github_id: Optional[str] = Field(default=None, unique=True, index=True, max_length=100)
    github_username: Optional[str] = Field(default=None, max_length=100)
    github_access_token: Optional[str] = Field(default=None, sa_column=Column(Text))
    google_id: Optional[str] = Field(default=None, unique=True, index=True, max_length=100)
    is_active: bool = Field(default=True)
    is_verified: bool = Field(default=False)
    credits: int = Field(default=100)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
    last_login_at: Optional[datetime] = Field(default=None)

    memberships: List["WorkspaceMembership"] = Relationship(back_populates="user")
    notifications: List["Notification"] = Relationship(back_populates="user")
    audit_logs: List["AuditLog"] = Relationship(back_populates="user")


# ─── Workspaces ───────────────────────────────────────────────────────────────

class Workspace(SQLModel, table=True):
    __tablename__ = "workspaces"

    id: str = Field(default_factory=new_uuid, primary_key=True)
    name: str = Field(max_length=255)
    slug: str = Field(unique=True, index=True, max_length=100)
    description: Optional[str] = Field(default=None, max_length=1000)
    avatar_url: Optional[str] = Field(default=None, max_length=500)
    owner_id: str = Field(foreign_key="users.id", index=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    memberships: List["WorkspaceMembership"] = Relationship(back_populates="workspace")
    repositories: List["Repository"] = Relationship(back_populates="workspace")
    subscription: Optional["Subscription"] = Relationship(back_populates="workspace")


class WorkspaceMembership(SQLModel, table=True):
    __tablename__ = "workspace_memberships"

    id: str = Field(default_factory=new_uuid, primary_key=True)
    workspace_id: str = Field(foreign_key="workspaces.id", index=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    role: UserRole = Field(default=UserRole.MEMBER)
    invited_by: Optional[str] = Field(default=None, foreign_key="users.id")
    accepted_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=utcnow)

    workspace: Optional[Workspace] = Relationship(back_populates="memberships")
    user: Optional[User] = Relationship(back_populates="memberships")


# ─── Repositories ─────────────────────────────────────────────────────────────

class Repository(SQLModel, table=True):
    __tablename__ = "repositories"

    id: str = Field(default_factory=new_uuid, primary_key=True)
    workspace_id: str = Field(foreign_key="workspaces.id", index=True)
    github_repo_id: Optional[int] = Field(default=None, index=True)
    full_name: str = Field(max_length=500)
    name: str = Field(max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)
    private: bool = Field(default=False)
    default_branch: str = Field(default="main", max_length=100)
    language: Optional[str] = Field(default=None, max_length=100)
    stars_count: int = Field(default=0)
    size_kb: int = Field(default=0)
    webhook_id: Optional[int] = Field(default=None)
    webhook_secret: Optional[str] = Field(default=None, max_length=255)
    is_active: bool = Field(default=True)
    last_synced_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    workspace: Optional[Workspace] = Relationship(back_populates="repositories")
    analyses: List["Analysis"] = Relationship(back_populates="repository")
    reports: List["Report"] = Relationship(back_populates="repository")


# ─── Analyses ─────────────────────────────────────────────────────────────────

class Analysis(SQLModel, table=True):
    __tablename__ = "analyses"

    id: str = Field(default_factory=new_uuid, primary_key=True)
    repository_id: str = Field(foreign_key="repositories.id", index=True)
    triggered_by: str = Field(foreign_key="users.id")
    status: AnalysisStatus = Field(default=AnalysisStatus.QUEUED, index=True)
    commit_sha: Optional[str] = Field(default=None, max_length=40)
    branch: str = Field(default="main", max_length=100)
    error_message: Optional[str] = Field(default=None, sa_column=Column(Text))
    progress_percent: int = Field(default=0)
    files_parsed: int = Field(default=0)
    nodes_extracted: int = Field(default=0)
    edges_extracted: int = Field(default=0)
    languages_detected: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    ai_summary: Optional[str] = Field(default=None, sa_column=Column(Text))
    architecture_overview: Optional[str] = Field(default=None, sa_column=Column(Text))
    tech_stack: Optional[list] = Field(default=None, sa_column=Column(JSON))
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=utcnow)

    repository: Optional[Repository] = Relationship(back_populates="analyses")
    nodes: List["ArchitectureNode"] = Relationship(back_populates="analysis")
    edges: List["ArchitectureEdge"] = Relationship(back_populates="analysis")
    security_findings: List["SecurityFinding"] = Relationship(back_populates="analysis")


# ─── Architecture Graph ───────────────────────────────────────────────────────

class ArchitectureNode(SQLModel, table=True):
    __tablename__ = "architecture_nodes"

    id: str = Field(default_factory=new_uuid, primary_key=True)
    analysis_id: str = Field(foreign_key="analyses.id", index=True)
    node_id: str = Field(max_length=500)
    name: str = Field(max_length=255)
    type: NodeType
    file_path: Optional[str] = Field(default=None, max_length=1000)
    line_start: Optional[int] = Field(default=None)
    line_end: Optional[int] = Field(default=None)
    language: Optional[str] = Field(default=None, max_length=50)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    metadata: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    pos_x: Optional[float] = Field(default=None)
    pos_y: Optional[float] = Field(default=None)
    created_at: datetime = Field(default_factory=utcnow)

    analysis: Optional[Analysis] = Relationship(back_populates="nodes")

    __table_args__ = (
        Index("ix_arch_nodes_analysis_type", "analysis_id", "type"),
    )


class ArchitectureEdge(SQLModel, table=True):
    __tablename__ = "architecture_edges"

    id: str = Field(default_factory=new_uuid, primary_key=True)
    analysis_id: str = Field(foreign_key="analyses.id", index=True)
    source_id: str = Field(max_length=500)
    target_id: str = Field(max_length=500)
    edge_type: EdgeType
    label: Optional[str] = Field(default=None, max_length=255)
    weight: float = Field(default=1.0)
    metadata: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=utcnow)

    analysis: Optional[Analysis] = Relationship(back_populates="edges")


# ─── Security ─────────────────────────────────────────────────────────────────

class SecurityFinding(SQLModel, table=True):
    __tablename__ = "security_findings"

    id: str = Field(default_factory=new_uuid, primary_key=True)
    analysis_id: str = Field(foreign_key="analyses.id", index=True)
    severity: SecuritySeverity = Field(index=True)
    category: str = Field(max_length=100)
    title: str = Field(max_length=500)
    description: str = Field(sa_column=Column(Text))
    file_path: Optional[str] = Field(default=None, max_length=1000)
    line_number: Optional[int] = Field(default=None)
    recommendation: Optional[str] = Field(default=None, sa_column=Column(Text))
    is_resolved: bool = Field(default=False)
    resolved_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=utcnow)

    analysis: Optional[Analysis] = Relationship(back_populates="security_findings")


# ─── Reports ──────────────────────────────────────────────────────────────────

class Report(SQLModel, table=True):
    __tablename__ = "reports"

    id: str = Field(default_factory=new_uuid, primary_key=True)
    repository_id: str = Field(foreign_key="repositories.id", index=True)
    analysis_id: str = Field(foreign_key="analyses.id", index=True)
    generated_by: str = Field(foreign_key="users.id")
    type: ReportType
    status: ReportStatus = Field(default=ReportStatus.GENERATING)
    title: str = Field(max_length=500)
    content: Optional[str] = Field(default=None, sa_column=Column(Text))
    structured_data: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    file_url: Optional[str] = Field(default=None, max_length=1000)
    export_format: Optional[ExportFormat] = Field(default=None)
    error_message: Optional[str] = Field(default=None, sa_column=Column(Text))
    created_at: datetime = Field(default_factory=utcnow)
    completed_at: Optional[datetime] = Field(default=None)

    repository: Optional[Repository] = Relationship(back_populates="reports")


# ─── Notifications ────────────────────────────────────────────────────────────

class Notification(SQLModel, table=True):
    __tablename__ = "notifications"

    id: str = Field(default_factory=new_uuid, primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    type: NotificationType
    title: str = Field(max_length=500)
    message: str = Field(sa_column=Column(Text))
    data: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    is_read: bool = Field(default=False)
    read_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=utcnow)

    user: Optional[User] = Relationship(back_populates="notifications")


# ─── Subscriptions ────────────────────────────────────────────────────────────

class Subscription(SQLModel, table=True):
    __tablename__ = "subscriptions"

    id: str = Field(default_factory=new_uuid, primary_key=True)
    workspace_id: str = Field(foreign_key="workspaces.id", unique=True, index=True)
    plan: SubscriptionPlan = Field(default=SubscriptionPlan.FREE)
    status: SubscriptionStatus = Field(default=SubscriptionStatus.ACTIVE)
    nowpayments_payment_id: Optional[str] = Field(default=None, max_length=255)
    nowpayments_invoice_id: Optional[str] = Field(default=None, max_length=255)
    amount_usd: Optional[float] = Field(default=None)
    currency: Optional[str] = Field(default=None, max_length=10)
    repositories_limit: int = Field(default=1)
    analyses_per_month: int = Field(default=5)
    reports_per_month: int = Field(default=5)
    current_period_start: Optional[datetime] = Field(default=None)
    current_period_end: Optional[datetime] = Field(default=None)
    cancelled_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    workspace: Optional[Workspace] = Relationship(back_populates="subscription")


class Payment(SQLModel, table=True):
    __tablename__ = "payments"

    id: str = Field(default_factory=new_uuid, primary_key=True)
    workspace_id: str = Field(foreign_key="workspaces.id", index=True)
    nowpayments_payment_id: str = Field(unique=True, max_length=255)
    amount_usd: float
    currency: str = Field(max_length=10)
    pay_amount: Optional[float] = Field(default=None)
    pay_currency: Optional[str] = Field(default=None, max_length=20)
    payment_status: str = Field(max_length=50)
    plan: SubscriptionPlan
    metadata: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


# ─── Audit Logs ───────────────────────────────────────────────────────────────

class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_logs"

    id: str = Field(default_factory=new_uuid, primary_key=True)
    user_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    workspace_id: Optional[str] = Field(default=None, index=True)
    action: str = Field(max_length=100, index=True)
    resource_type: str = Field(max_length=100)
    resource_id: Optional[str] = Field(default=None, max_length=255)
    details: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    ip_address: Optional[str] = Field(default=None, max_length=45)
    user_agent: Optional[str] = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=utcnow)

    user: Optional[User] = Relationship(back_populates="audit_logs")
