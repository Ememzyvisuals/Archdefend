"""
ArchDefend — Reports Router
Export analysis reports in multiple formats.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import io
import logging

from core.database import get_db
from core.config import settings
from models.models import Analysis, AnalysisReport, Export, ExportFormat, AnalysisStatus, User
from core.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/{analysis_id}/pdf")
async def export_pdf(
    analysis_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export analysis report as PDF."""
    analysis, report = await _get_completed_report(analysis_id, current_user, db)

    # Deduct credits for PPTX/PDF (PDF is free for all plans)
    from services.export_engine.exporter import export_engine

    pdf_bytes = await export_engine.pdf(
        report_data=_report_to_dict(report),
        analysis_meta={"repo_name": analysis.repo_name, "repo_url": analysis.repo_url, "file_count": analysis.file_count},
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="archdefend-{analysis.repo_name or analysis_id}.pdf"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )


@router.get("/{analysis_id}/pptx")
async def export_pptx(
    analysis_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export analysis report as PPTX. Costs 5 credits."""
    if current_user.plan.value == "free":
        raise HTTPException(status_code=402, detail="PPTX export requires Pro plan or higher")

    if current_user.credits < settings.PPTX_EXPORT_CREDITS:
        raise HTTPException(status_code=402, detail=f"Insufficient credits. PPTX export costs {settings.PPTX_EXPORT_CREDITS} credits.")

    analysis, report = await _get_completed_report(analysis_id, current_user, db)

    from services.export_engine.exporter import export_engine
    from sqlalchemy import update
    from models.models import CreditTransaction

    pptx_bytes = await export_engine.pptx(
        report_data=_report_to_dict(report),
        analysis_meta={"repo_name": analysis.repo_name, "repo_url": analysis.repo_url},
    )

    # Deduct credits
    new_balance = current_user.credits - settings.PPTX_EXPORT_CREDITS
    await db.execute(update(User).where(User.id == current_user.id).values(credits=new_balance))
    db.add(CreditTransaction(
        user_id=current_user.id,
        amount=-settings.PPTX_EXPORT_CREDITS,
        balance_after=new_balance,
        reason="pptx_export",
        reference_id=analysis_id,
    ))
    await db.commit()

    return Response(
        content=pptx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={
            "Content-Disposition": f'attachment; filename="archdefend-{analysis.repo_name or analysis_id}.pptx"',
            "Content-Length": str(len(pptx_bytes)),
        },
    )


@router.get("/{analysis_id}/markdown")
async def export_markdown(
    analysis_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export analysis report as Markdown."""
    analysis, report = await _get_completed_report(analysis_id, current_user, db)

    from services.export_engine.exporter import export_engine
    md = await export_engine.markdown(
        report_data=_report_to_dict(report),
        analysis_meta={"repo_url": analysis.repo_url, "file_count": analysis.file_count},
    )

    return Response(
        content=md.encode("utf-8"),
        media_type="text/markdown",
        headers={
            "Content-Disposition": f'attachment; filename="archdefend-{analysis.repo_name or analysis_id}.md"',
        },
    )


async def _get_completed_report(analysis_id: str, user: User, db: AsyncSession):
    """Helper to fetch completed analysis + report or raise 404."""
    result = await db.execute(
        select(Analysis, AnalysisReport)
        .join(AnalysisReport, Analysis.id == AnalysisReport.analysis_id)
        .where(
            Analysis.id == analysis_id,
            Analysis.user_id == user.id,
            Analysis.status == AnalysisStatus.COMPLETED,
        )
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Report not found or analysis not complete")
    return row


def _report_to_dict(report: AnalysisReport) -> dict:
    return {
        "architecture_summary": report.architecture_summary,
        "dependency_graph": report.dependency_graph,
        "security_findings": report.security_findings or [],
        "api_inventory": report.api_inventory or [],
        "scalability_score": report.scalability_score,
        "production_readiness_score": report.production_readiness_score,
        "interview_questions": report.interview_questions or [],
        "tech_stack": report.tech_stack or [],
        "recommendations": report.recommendations or [],
    }
