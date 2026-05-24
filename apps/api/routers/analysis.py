"""
ArchDefend — Analysis API Router
Handles repository analysis job submission, status, and results.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel, HttpUrl, validator
import uuid
import json
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

from core.database import get_db
from core.config import settings
from models.models import User, Analysis, AnalysisReport, AnalysisStatus
from core.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────────────

class AnalysisRequest(BaseModel):
    repo_url: str
    branch: Optional[str] = "main"
    include_security: bool = True
    include_interview_prep: bool = True

    @validator("repo_url")
    def validate_repo_url(cls, v):
        v = v.strip()
        if not v.startswith(("https://github.com/", "http://github.com/")):
            raise ValueError("Only GitHub repository URLs are supported")
        return v


class AnalysisResponse(BaseModel):
    analysis_id: str
    status: str
    credits_required: int
    credits_remaining: int
    message: str


class AnalysisStatusResponse(BaseModel):
    analysis_id: str
    status: str
    progress_pct: int
    repo_name: Optional[str]
    file_count: Optional[int]
    language_stats: Optional[dict]
    error_message: Optional[str]
    created_at: str
    completed_at: Optional[str]


# ── Credit Estimation ─────────────────────────────────────────────────────────

def estimate_credits(repo_url: str, include_security: bool) -> int:
    """Estimate credit cost before cloning. Default to medium."""
    base = settings.MEDIUM_REPO_CREDITS  # 15 credits
    if include_security:
        base += settings.SECURITY_SCAN_CREDITS  # +15
    return base


async def deduct_credits(
    db: AsyncSession,
    user: User,
    amount: int,
    reason: str,
    reference_id: str,
) -> bool:
    """Atomically deduct credits. Returns False if insufficient."""
    from models.models import CreditTransaction

    if user.credits < amount:
        return False

    new_balance = user.credits - amount
    await db.execute(
        update(User)
        .where(User.id == user.id, User.credits >= amount)
        .values(credits=new_balance)
    )

    transaction = CreditTransaction(
        user_id=user.id,
        amount=-amount,
        balance_after=new_balance,
        reason=reason,
        reference_id=reference_id,
    )
    db.add(transaction)
    return True


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/start", response_model=AnalysisResponse)
async def start_analysis(
    request: AnalysisRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit a repository for analysis.
    Validates URL, estimates credits, deducts, enqueues background job.
    """
    # Estimate credits
    credits_required = estimate_credits(request.repo_url, request.include_security)

    if current_user.credits < credits_required:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "Insufficient credits",
                "credits_required": credits_required,
                "credits_available": current_user.credits,
            },
        )

    # Check concurrent analysis limit
    active_analyses = await db.scalar(
        select(Analysis)
        .where(
            Analysis.user_id == current_user.id,
            Analysis.status.in_([AnalysisStatus.PENDING, AnalysisStatus.CLONING,
                                   AnalysisStatus.PARSING, AnalysisStatus.ANALYZING]),
        )
    )
    if active_analyses:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="You already have an active analysis in progress. Please wait for it to complete.",
        )

    # Create analysis record
    analysis_id = str(uuid.uuid4())
    analysis = Analysis(
        id=analysis_id,
        user_id=current_user.id,
        repo_url=request.repo_url,
        repo_branch=request.branch or "main",
        status=AnalysisStatus.PENDING,
        credits_used=credits_required,
    )
    db.add(analysis)

    # Deduct credits atomically
    success = await deduct_credits(
        db, current_user, credits_required,
        "analysis_start", analysis_id
    )
    if not success:
        raise HTTPException(status_code=402, detail="Insufficient credits (concurrent request race)")

    await db.commit()

    # Enqueue background analysis pipeline
    background_tasks.add_task(
        run_analysis_pipeline,
        analysis_id=analysis_id,
        repo_url=request.repo_url,
        user_id=str(current_user.id),
        include_security=request.include_security,
        include_interview_prep=request.include_interview_prep,
        github_token=current_user.github_access_token,
    )

    logger.info(f"🚀 Analysis {analysis_id} queued for {request.repo_url}")

    return AnalysisResponse(
        analysis_id=analysis_id,
        status="pending",
        credits_required=credits_required,
        credits_remaining=current_user.credits - credits_required,
        message="Analysis queued. Cloning repository...",
    )


@router.get("/{analysis_id}/status", response_model=AnalysisStatusResponse)
async def get_analysis_status(
    analysis_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get real-time analysis status and progress."""
    result = await db.execute(
        select(Analysis).where(
            Analysis.id == analysis_id,
            Analysis.user_id == current_user.id,
        )
    )
    analysis = result.scalar_one_or_none()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return AnalysisStatusResponse(
        analysis_id=str(analysis.id),
        status=analysis.status.value,
        progress_pct=analysis.progress_pct or 0,
        repo_name=analysis.repo_name,
        file_count=analysis.file_count,
        language_stats=analysis.language_stats,
        error_message=analysis.error_message,
        created_at=analysis.created_at.isoformat(),
        completed_at=analysis.completed_at.isoformat() if analysis.completed_at else None,
    )


@router.get("/{analysis_id}/stream")
async def stream_analysis_progress(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
    # EventSource (SSE) cannot send headers, so token comes as query param
    token: Optional[str] = None,
):
    """Server-Sent Events stream. Token passed as query param since EventSource can't set headers."""
    from core.security import decode_token
    from models.models import User as UserModel
    from sqlalchemy import select as sa_select
    if not token:
        from fastapi.responses import JSONResponse
        return JSONResponse({"error": "Missing token"}, status_code=401)
    try:
        payload = decode_token(token)
        user_result = await db.execute(sa_select(UserModel).where(UserModel.id == payload["sub"]))
        current_user = user_result.scalar_one_or_none()
        if not current_user:
            from fastapi.responses import JSONResponse
            return JSONResponse({"error": "User not found"}, status_code=401)
    except Exception:
        from fastapi.responses import JSONResponse
        return JSONResponse({"error": "Invalid token"}, status_code=401)

    result = await db.execute(
        select(Analysis).where(
            Analysis.id == analysis_id,
            Analysis.user_id == current_user.id,
        )
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    async def event_generator():
        last_status = None
        last_progress = -1
        timeout = 300  # 5 min max stream

        for _ in range(timeout * 2):  # Poll every 0.5s
            await asyncio.sleep(0.5)

            # Re-fetch from DB
            await db.refresh(analysis)
            current_status = analysis.status.value
            current_progress = analysis.progress_pct or 0

            if current_status != last_status or current_progress != last_progress:
                last_status = current_status
                last_progress = current_progress

                event_data = json.dumps({
                    "status": current_status,
                    "progress": current_progress,
                    "message": _status_message(current_status, current_progress),
                })
                yield f"data: {event_data}\n\n"

                if current_status in ("completed", "failed"):
                    yield "data: {\"done\": true}\n\n"
                    break

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{analysis_id}/report")
async def get_analysis_report(
    analysis_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve completed analysis report."""
    result = await db.execute(
        select(Analysis, AnalysisReport)
        .join(AnalysisReport, Analysis.id == AnalysisReport.analysis_id)
        .where(
            Analysis.id == analysis_id,
            Analysis.user_id == current_user.id,
            Analysis.status == AnalysisStatus.COMPLETED,
        )
    )
    row = result.first()

    if not row:
        raise HTTPException(status_code=404, detail="Report not found or analysis not complete")

    analysis, report = row

    return {
        "analysis_id": str(analysis.id),
        "repo_url": analysis.repo_url,
        "repo_name": analysis.repo_name,
        "language_stats": analysis.language_stats,
        "file_count": analysis.file_count,
        "architecture_summary": report.architecture_summary,
        "dependency_graph": report.dependency_graph,
        "security_findings": report.security_findings,
        "api_inventory": report.api_inventory,
        "scalability_score": report.scalability_score,
        "production_readiness_score": report.production_readiness_score,
        "interview_questions": report.interview_questions,
        "tech_stack": report.tech_stack,
        "recommendations": report.recommendations,
        "completed_at": analysis.completed_at.isoformat() if analysis.completed_at else None,
    }


@router.get("/history")
async def get_analysis_history(
    limit: int = 10,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's analysis history."""
    result = await db.execute(
        select(Analysis)
        .where(Analysis.user_id == current_user.id)
        .order_by(Analysis.created_at.desc())
        .limit(min(limit, 50))
        .offset(offset)
    )
    analyses = result.scalars().all()

    return {
        "analyses": [
            {
                "id": str(a.id),
                "repo_url": a.repo_url,
                "repo_name": a.repo_name,
                "status": a.status.value,
                "credits_used": a.credits_used,
                "created_at": a.created_at.isoformat(),
                "completed_at": a.completed_at.isoformat() if a.completed_at else None,
            }
            for a in analyses
        ]
    }


# ── Background Pipeline ───────────────────────────────────────────────────────

async def run_analysis_pipeline(
    analysis_id: str,
    repo_url: str,
    user_id: str,
    include_security: bool,
    include_interview_prep: bool,
    github_token: Optional[str],
):
    """
    Full analysis pipeline — runs as background task.
    Stages: clone → parse → graph → LLM → report
    """
    from services.repo_cloner.cloner import repo_cloner
    from services.parser_engine.parser import parser
    from services.graph_engine.graph_builder import graph_builder
    from services.llm_analyzer.analyzer import analyzer

    from core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        try:
            await _update_status(db, analysis_id, AnalysisStatus.CLONING, 5)

            # Stage 1: Clone
            async def _clone_progress(pct: int, msg: str) -> None:
                await _update_status(db, analysis_id, AnalysisStatus.CLONING, pct)

            clone_path = await repo_cloner.clone(
                repo_url, analysis_id, github_token,
                progress=_clone_progress,
            )

            await _update_status(db, analysis_id, AnalysisStatus.PARSING, 30)

            # Stage 2: Parse
            parse_result = await parser.parse_repository(clone_path)

            await _update_status(db, analysis_id, AnalysisStatus.ANALYZING, 50)

            # Update metadata
            await db.execute(
                update(Analysis)
                .where(Analysis.id == analysis_id)
                .values(
                    repo_name=parse_result["repo_name"],
                    file_count=parse_result["file_count"],
                    language_stats=parse_result["language_stats"],
                )
            )
            await db.commit()

            # Stage 3: Graph
            graph_data = await graph_builder.build_graph(parse_result)

            await _update_status(db, analysis_id, AnalysisStatus.ANALYZING, 65)

            # Stage 4: LLM Analysis
            report_data = await analyzer.generate_full_report(
                parse_result=parse_result,
                graph_data=graph_data,
                include_security=include_security,
                include_interview_prep=include_interview_prep,
            )

            await _update_status(db, analysis_id, AnalysisStatus.GENERATING, 85)

            # Stage 5: Save Report
            report = AnalysisReport(
                analysis_id=analysis_id,
                **report_data,
            )
            db.add(report)

            await db.execute(
                update(Analysis)
                .where(Analysis.id == analysis_id)
                .values(
                    status=AnalysisStatus.COMPLETED,
                    progress_pct=100,
                    completed_at=datetime.now(timezone.utc),
                )
            )
            await db.commit()

            logger.info(f"✅ Analysis {analysis_id} completed successfully")

        except Exception as e:
            logger.error(f"❌ Analysis {analysis_id} failed: {e}", exc_info=True)
            await db.execute(
                update(Analysis)
                .where(Analysis.id == analysis_id)
                .values(
                    status=AnalysisStatus.FAILED,
                    error_message=str(e)[:1000],
                )
            )
            await db.commit()

        finally:
            # Always cleanup cloned files
            try:
                repo_cloner.cleanup(analysis_id)
            except Exception:
                pass


async def _update_status(
    db: AsyncSession,
    analysis_id: str,
    status: AnalysisStatus,
    progress: int,
):
    await db.execute(
        update(Analysis)
        .where(Analysis.id == analysis_id)
        .values(status=status, progress_pct=progress)
    )
    await db.commit()


def _status_message(status: str, progress: int) -> str:
    messages = {
        "pending": "Queued for processing...",
        "cloning": "Cloning repository from GitHub...",
        "parsing": "Parsing source files with AST engine...",
        "analyzing": "AI analyzing architecture and dependencies...",
        "generating": "Generating reports and exports...",
        "completed": "Analysis complete! Report ready.",
        "failed": "Analysis failed. Credits refunded.",
    }
    return messages.get(status, f"Processing... {progress}%")
