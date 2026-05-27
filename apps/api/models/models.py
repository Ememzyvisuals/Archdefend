"""
ArchDefend — SQLAlchemy Models
"""

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text,
    ForeignKey, Enum, JSON, BigInteger
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum

from core.database import Base


class PlanTier(str, enum.Enum):
    FREE = "free"
    PRO = "pro"
    TEAM = "team"


class AnalysisStatus(str, enum.Enum):
    PENDING = "pending"
    CLONING = "cloning"
    PARSING = "parsing"
    ANALYZING = "analyzing"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class ExportFormat(str, enum.Enum):
    PDF = "pdf"
    PPTX = "pptx"
    MARKDOWN = "markdown"
    HTML = "html"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    github_id = Column(String(64), unique=True, nullable=True, index=True)
    github_username = Column(String(128), nullable=True)
    github_access_token = Column(Text, nullable=True)  # encrypted
    avatar_url = Column(String(512), nullable=True)
    plan = Column(Enum(PlanTier, values_callable=lambda x: [e.value for e in x]), default=PlanTier.FREE, nullable=False)
    credits = Column(Integer, default=20, nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    analyses = relationship("Analysis", back_populates="user", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="user")
    credit_transactions = relationship("CreditTransaction", back_populates="user")


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    repo_url = Column(String(1024), nullable=False)
    repo_name = Column(String(256), nullable=True)
    repo_owner = Column(String(128), nullable=True)
    repo_branch = Column(String(128), default="main")
    status = Column(Enum(AnalysisStatus, values_callable=lambda x: [e.value for e in x]), default=AnalysisStatus.PENDING)
    credits_used = Column(Integer, default=0)
    repo_size_mb = Column(Float, nullable=True)
    file_count = Column(Integer, nullable=True)
    language_stats = Column(JSON, nullable=True)  # {"python": 45, "typescript": 30, ...}
    progress_pct = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="analyses")
    report = relationship("AnalysisReport", back_populates="analysis", uselist=False)
    exports = relationship("Export", back_populates="analysis")


class AnalysisReport(Base):
    __tablename__ = "analysis_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_id = Column(UUID(as_uuid=True), ForeignKey("analyses.id"), unique=True)
    architecture_summary = Column(Text, nullable=True)
    dependency_graph = Column(JSON, nullable=True)      # nodes + edges
    security_findings = Column(JSON, nullable=True)     # list of findings
    api_inventory = Column(JSON, nullable=True)         # endpoints list
    scalability_score = Column(Integer, nullable=True)  # 0-100
    production_readiness_score = Column(Integer, nullable=True)
    interview_questions = Column(JSON, nullable=True)   # list of Q&A
    tech_stack = Column(JSON, nullable=True)
    recommendations = Column(JSON, nullable=True)
    hallucination_detected = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    analysis = relationship("Analysis", back_populates="report")


class Export(Base):
    __tablename__ = "exports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_id = Column(UUID(as_uuid=True), ForeignKey("analyses.id"), nullable=False)
    format = Column(Enum(ExportFormat, values_callable=lambda x: [e.value for e in x]), nullable=False)
    storage_path = Column(String(1024), nullable=True)
    download_url = Column(String(2048), nullable=True)
    file_size_bytes = Column(BigInteger, nullable=True)
    credits_used = Column(Integer, default=0)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    analysis = relationship("Analysis", back_populates="exports")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    plan = Column(Enum(PlanTier, values_callable=lambda x: [e.value for e in x]), nullable=False)
    nowpayments_payment_id = Column(String(256), unique=True, nullable=True)
    nowpayments_order_id = Column(String(256), nullable=True)
    status = Column(String(64), default="pending")  # pending, active, cancelled, expired
    amount_usd = Column(Float, nullable=True)
    currency = Column(String(32), nullable=True)
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="subscriptions")


class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    amount = Column(Integer, nullable=False)  # positive = add, negative = deduct
    balance_after = Column(Integer, nullable=False)
    reason = Column(String(256), nullable=False)
    reference_id = Column(String(256), nullable=True)  # analysis_id or subscription_id
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="credit_transactions")
