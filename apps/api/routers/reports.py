from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
import io
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from pydantic import BaseModel
from database import get_session
from models import (
    Report, Repository, Analysis, AnalysisStatus, ReportType, ReportStatus,
    ExportFormat, User, WorkspaceMembership
)
from auth import get_current_user
from services.ai_service import generate_report

router = APIRouter(prefix="/reports", tags=["reports"])


class GenerateReportRequest(BaseModel):
    repository_id: str
    analysis_id: str
    report_type: ReportType
    export_format: Optional[ExportFormat] = None


@router.post("/generate")
async def generate_architecture_report(
    body: GenerateReportRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    repo_result = await session.execute(
        select(Repository).where(Repository.id == body.repository_id)
    )
    repo = repo_result.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    membership = await session.execute(
        select(WorkspaceMembership).where(
            WorkspaceMembership.workspace_id == repo.workspace_id,
            WorkspaceMembership.user_id == current_user.id,
        )
    )
    if not membership.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Access denied")

    analysis_result = await session.execute(
        select(Analysis).where(
            Analysis.id == body.analysis_id,
            Analysis.status == AnalysisStatus.COMPLETED,
        )
    )
    analysis = analysis_result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Completed analysis not found")

    report = Report(
        repository_id=body.repository_id,
        analysis_id=body.analysis_id,
        generated_by=current_user.id,
        type=body.report_type,
        status=ReportStatus.GENERATING,
        title=f"{body.report_type.value.replace('_', ' ').title()} - {repo.name}",
        export_format=body.export_format,
    )
    session.add(report)
    await session.commit()
    await session.refresh(report)

    background_tasks.add_task(_generate_report_task, report.id, analysis, repo, body.report_type)

    return {"report_id": report.id, "status": "generating"}


async def _generate_report_task(
    report_id: str,
    analysis: Analysis,
    repo: Repository,
    report_type: ReportType,
) -> None:
    async with __import__("database").AsyncSessionLocal() as session:
        try:
            arch_data = {
                "overview": analysis.ai_summary or "",
                "tech_stack": analysis.tech_stack or [],
                "nodes": analysis.nodes_extracted,
                "files": analysis.files_parsed,
                "languages": analysis.languages_detected or {},
            }
            if analysis.architecture_overview:
                import ast as _ast
                try:
                    arch_data.update(_ast.literal_eval(analysis.architecture_overview))
                except Exception:
                    arch_data["raw"] = analysis.architecture_overview

            content = await generate_report(
                report_type=report_type.value,
                repo_name=repo.full_name,
                architecture_data=arch_data,
                tech_stack=analysis.tech_stack or [],
            )

            report_result = await session.execute(select(Report).where(Report.id == report_id))
            report = report_result.scalar_one()
            report.content = content
            report.status = ReportStatus.COMPLETED
            report.completed_at = datetime.utcnow()
            session.add(report)
            await session.commit()

        except Exception as e:
            report_result = await session.execute(select(Report).where(Report.id == report_id))
            report = report_result.scalar_one_or_none()
            if report:
                report.status = ReportStatus.FAILED
                report.error_message = str(e)
                session.add(report)
                await session.commit()


@router.get("/repository/{repo_id}")
async def list_repository_reports(
    repo_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    repo_result = await session.execute(select(Repository).where(Repository.id == repo_id))
    repo = repo_result.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    membership = await session.execute(
        select(WorkspaceMembership).where(
            WorkspaceMembership.workspace_id == repo.workspace_id,
            WorkspaceMembership.user_id == current_user.id,
        )
    )
    if not membership.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Access denied")

    result = await session.execute(
        select(Report)
        .where(Report.repository_id == repo_id)
        .order_by(Report.created_at.desc())
    )
    reports = result.scalars().all()
    return [
        {
            "id": r.id,
            "type": r.type.value,
            "status": r.status.value,
            "title": r.title,
            "export_format": r.export_format.value if r.export_format else None,
            "created_at": r.created_at,
            "completed_at": r.completed_at,
        }
        for r in reports
    ]


@router.get("/{report_id}")
async def get_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    repo_result = await session.execute(select(Repository).where(Repository.id == report.repository_id))
    repo = repo_result.scalar_one()

    membership = await session.execute(
        select(WorkspaceMembership).where(
            WorkspaceMembership.workspace_id == repo.workspace_id,
            WorkspaceMembership.user_id == current_user.id,
        )
    )
    if not membership.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Access denied")

    return {
        "id": report.id,
        "type": report.type.value,
        "status": report.status.value,
        "title": report.title,
        "content": report.content,
        "export_format": report.export_format.value if report.export_format else None,
        "error_message": report.error_message,
        "created_at": report.created_at,
        "completed_at": report.completed_at,
    }


@router.get("/{report_id}/export/pdf")
async def export_report_pdf(
    report_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report or report.status != ReportStatus.COMPLETED:
        raise HTTPException(status_code=404, detail="Completed report not found")

    content = report.content or "# Report\nNo content available."
    try:
        import markdown as md
        html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; }}
h1 {{ color: #0a0a0a; border-bottom: 2px solid #6366f1; padding-bottom: 8px; }}
h2 {{ color: #1e293b; margin-top: 32px; }}
h3 {{ color: #334155; }}
code {{ background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }}
pre {{ background: #f1f5f9; padding: 16px; border-radius: 8px; overflow-x: auto; }}
blockquote {{ border-left: 4px solid #6366f1; margin: 0; padding-left: 16px; color: #64748b; }}
table {{ width: 100%; border-collapse: collapse; }}
th, td {{ padding: 8px 12px; border: 1px solid #e2e8f0; text-align: left; }}
th {{ background: #f8fafc; }}
.header {{ background: linear-gradient(135deg, #1e1b4b, #312e81); color: white; padding: 32px; margin: -20px -20px 32px; }}
.header h1 {{ color: white; border-bottom: none; }}
.footer {{ margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 0.8em; text-align: center; }}
</style>
</head>
<body>
<div class="header">
<h1>ArchDefend Analysis Report</h1>
<p>Generated by ArchDefend · Built by Ememzyvisuals</p>
</div>
{md.markdown(content, extensions=['tables', 'fenced_code', 'toc'])}
<div class="footer">
<p>© Ememzyvisuals · ArchDefend · Architecture Intelligence for Real Engineering Teams</p>
</div>
</body>
</html>"""

        try:
            import weasyprint
            pdf_bytes = weasyprint.HTML(string=html_content).write_pdf()
        except Exception:
            from reportlab.pdfgen import canvas
            from reportlab.lib.pagesizes import A4
            buf = io.BytesIO()
            c = canvas.Canvas(buf, pagesize=A4)
            c.setFont("Helvetica-Bold", 16)
            c.drawString(50, 800, report.title)
            c.setFont("Helvetica", 10)
            y = 760
            for line in content.split("\n")[:100]:
                if y < 50:
                    c.showPage()
                    y = 800
                c.drawString(50, y, line[:100])
                y -= 14
            c.save()
            pdf_bytes = buf.getvalue()

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={report_id}.pdf"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


@router.get("/{report_id}/export/markdown")
async def export_report_markdown(
    report_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report or report.status != ReportStatus.COMPLETED:
        raise HTTPException(status_code=404, detail="Completed report not found")

    content = report.content or "# Report\nNo content available."
    return StreamingResponse(
        io.BytesIO(content.encode("utf-8")),
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename={report_id}.md"},
    )
