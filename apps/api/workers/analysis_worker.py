"""
ArchDefend Analysis Worker
Background task that runs repository analysis pipeline.
"""
from __future__ import annotations
import asyncio
import os
import shutil
from datetime import datetime
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from database import AsyncSessionLocal
from models import (
    Analysis, AnalysisStatus, Repository, ArchitectureNode, ArchitectureEdge,
    SecurityFinding, SecuritySeverity, NodeType, EdgeType, Notification, NotificationType, User
)
from services.analysis_engine import clone_repository, analyze_repository
from services.ai_service import analyze_architecture, scan_security
from config import settings

log = structlog.get_logger()


async def trigger_analysis(analysis_id: str) -> None:
    """Entry point for background analysis task."""
    log.info("Analysis triggered", analysis_id=analysis_id)
    async with AsyncSessionLocal() as session:
        try:
            await _run_analysis(analysis_id, session)
        except Exception as e:
            log.error("Analysis failed with unhandled error", analysis_id=analysis_id, error=str(e))
            await _mark_failed(analysis_id, str(e), session)


async def _update_status(
    analysis_id: str,
    status: AnalysisStatus,
    progress: int,
    session: AsyncSession,
    **kwargs
) -> None:
    result = await session.execute(select(Analysis).where(Analysis.id == analysis_id))
    analysis = result.scalar_one_or_none()
    if analysis:
        analysis.status = status
        analysis.progress_percent = progress
        for k, v in kwargs.items():
            setattr(analysis, k, v)
        session.add(analysis)
        await session.commit()


async def _mark_failed(analysis_id: str, error: str, session: AsyncSession) -> None:
    result = await session.execute(select(Analysis).where(Analysis.id == analysis_id))
    analysis = result.scalar_one_or_none()
    if analysis:
        analysis.status = AnalysisStatus.FAILED
        analysis.error_message = error
        analysis.progress_percent = 0
        session.add(analysis)

        repo_result = await session.execute(
            select(Repository).where(Repository.id == analysis.repository_id)
        )
        repo = repo_result.scalar_one_or_none()

        user_result = await session.execute(select(User).where(User.id == analysis.triggered_by))
        user = user_result.scalar_one_or_none()

        if user and repo:
            notification = Notification(
                user_id=user.id,
                type=NotificationType.ANALYSIS_FAILED,
                title="Analysis Failed",
                message=f"Analysis of {repo.full_name} failed: {error[:200]}",
                data={"analysis_id": analysis_id, "repository_id": analysis.repository_id},
            )
            session.add(notification)

        await session.commit()


async def _run_analysis(analysis_id: str, session: AsyncSession) -> None:
    result = await session.execute(select(Analysis).where(Analysis.id == analysis_id))
    analysis = result.scalar_one_or_none()
    if not analysis:
        log.error("Analysis not found", analysis_id=analysis_id)
        return

    repo_result = await session.execute(
        select(Repository).where(Repository.id == analysis.repository_id)
    )
    repo = repo_result.scalar_one_or_none()
    if not repo:
        await _mark_failed(analysis_id, "Repository not found", session)
        return

    user_result = await session.execute(select(User).where(User.id == analysis.triggered_by))
    user = user_result.scalar_one_or_none()
    if not user or not user.github_access_token:
        await _mark_failed(analysis_id, "GitHub access token not available", session)
        return

    # Check repo size
    if repo.size_kb > settings.MAX_REPO_SIZE_MB * 1024:
        await _mark_failed(
            analysis_id,
            f"Repository too large ({repo.size_kb // 1024} MB). Maximum: {settings.MAX_REPO_SIZE_MB} MB",
            session,
        )
        return

    analysis.started_at = datetime.utcnow()
    session.add(analysis)
    await session.commit()

    clone_dir = None
    try:
        # Step 1: Clone
        await _update_status(analysis_id, AnalysisStatus.CLONING, 5, session)
        log.info("Cloning repository", repo=repo.full_name)

        clone_dir = await clone_repository(
            full_name=repo.full_name,
            access_token=user.github_access_token,
            target_dir=settings.TEMP_CLONE_DIR,
            branch=analysis.branch,
            timeout=settings.CLONE_TIMEOUT_SECONDS,
        )

        # Step 2: Parse
        await _update_status(analysis_id, AnalysisStatus.PARSING, 15, session)
        log.info("Parsing repository", repo=repo.full_name)

        async def on_progress(pct: int):
            await _update_status(analysis_id, AnalysisStatus.PARSING, pct, session)

        analysis_result = await analyze_repository(clone_dir, on_progress=on_progress)

        # Step 3: Build graph
        await _update_status(analysis_id, AnalysisStatus.GRAPHING, 75, session)
        log.info("Building graph", nodes=len(analysis_result.symbols))

        # Save nodes
        node_batch = []
        for sym in analysis_result.symbols[:5000]:
            node = ArchitectureNode(
                analysis_id=analysis_id,
                node_id=sym.symbol_id,
                name=sym.name[:255],
                type=NodeType(sym.symbol_type) if sym.symbol_type in NodeType._value2member_map_ else NodeType.MODULE,
                file_path=sym.file_path[:1000] if sym.file_path else None,
                line_start=sym.line_start,
                line_end=sym.line_end,
                language=sym.language,
                pos_x=sym.metadata.get("pos_x"),
                pos_y=sym.metadata.get("pos_y"),
                metadata=sym.metadata,
            )
            node_batch.append(node)

        session.add_all(node_batch)
        await session.flush()

        edge_batch = []
        for edge in analysis_result.edges[:10000]:
            arch_edge = ArchitectureEdge(
                analysis_id=analysis_id,
                source_id=edge.source_id[:500],
                target_id=edge.target_id[:500],
                edge_type=EdgeType(edge.edge_type) if edge.edge_type in EdgeType._value2member_map_ else EdgeType.DEPENDS_ON,
                label=edge.label[:255] if edge.label else None,
                weight=edge.weight,
            )
            edge_batch.append(arch_edge)

        session.add_all(edge_batch)
        await session.flush()

        # Step 4: AI Processing
        await _update_status(analysis_id, AnalysisStatus.AI_PROCESSING, 82, session)

        symbols_summary = (
            f"{len(analysis_result.symbols)} symbols: "
            f"{sum(1 for s in analysis_result.symbols if s.symbol_type == 'module')} modules, "
            f"{sum(1 for s in analysis_result.symbols if s.symbol_type == 'class')} classes, "
            f"{sum(1 for s in analysis_result.symbols if s.symbol_type == 'api_endpoint')} API endpoints"
        )

        try:
            ai_analysis = await analyze_architecture(
                repo_summary=f"{repo.full_name}: {repo.description or 'No description'}. {analysis_result.architecture_summary}",
                tech_stack=analysis_result.tech_stack,
                symbols_summary=symbols_summary,
            )
        except Exception as e:
            log.warning("AI analysis failed, using basic summary", error=str(e))
            ai_analysis = {"overview": analysis_result.architecture_summary}

        # Security scan
        await _update_status(analysis_id, AnalysisStatus.AI_PROCESSING, 90, session)
        code_samples = []
        files_scanned = set()
        for sym in analysis_result.symbols:
            if sym.file_path and sym.file_path not in files_scanned:
                full_path = os.path.join(clone_dir, sym.file_path)
                if os.path.exists(full_path):
                    try:
                        with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                        code_samples.append({
                            "path": sym.file_path,
                            "language": sym.language,
                            "content": content[:3000],
                        })
                        files_scanned.add(sym.file_path)
                        if len(code_samples) >= 20:
                            break
                    except Exception:
                        pass

        try:
            security_findings = await scan_security(code_samples, repo.full_name)
            for finding in security_findings:
                sev_str = finding.get("severity", "info").lower()
                try:
                    severity = SecuritySeverity(sev_str)
                except ValueError:
                    severity = SecuritySeverity.INFO

                sf = SecurityFinding(
                    analysis_id=analysis_id,
                    severity=severity,
                    category=finding.get("category", "Unknown")[:100],
                    title=finding.get("title", "Security Issue")[:500],
                    description=finding.get("description", ""),
                    file_path=finding.get("file_path"),
                    line_number=finding.get("line_number"),
                    recommendation=finding.get("recommendation"),
                )
                session.add(sf)
        except Exception as e:
            log.warning("Security scan failed", error=str(e))

        # Finalize
        result2 = await session.execute(select(Analysis).where(Analysis.id == analysis_id))
        analysis = result2.scalar_one()
        analysis.status = AnalysisStatus.COMPLETED
        analysis.progress_percent = 100
        analysis.files_parsed = analysis_result.files_parsed
        analysis.nodes_extracted = len(analysis_result.symbols)
        analysis.edges_extracted = len(analysis_result.edges)
        analysis.languages_detected = analysis_result.languages
        analysis.tech_stack = analysis_result.tech_stack
        analysis.ai_summary = ai_analysis.get("overview", "")
        analysis.architecture_overview = str(ai_analysis)
        analysis.completed_at = datetime.utcnow()
        session.add(analysis)

        # Send completion notification
        if user:
            notification = Notification(
                user_id=user.id,
                type=NotificationType.ANALYSIS_COMPLETED,
                title="Analysis Complete",
                message=f"{repo.full_name} analysis complete. Found {len(analysis_result.symbols)} symbols across {analysis_result.files_parsed} files.",
                data={
                    "analysis_id": analysis_id,
                    "repository_id": repo.id,
                    "nodes": len(analysis_result.symbols),
                    "files": analysis_result.files_parsed,
                },
            )
            session.add(notification)

        await session.commit()
        log.info("Analysis completed", analysis_id=analysis_id, nodes=len(analysis_result.symbols))

    except Exception as e:
        log.error("Analysis pipeline error", analysis_id=analysis_id, error=str(e))
        await _mark_failed(analysis_id, str(e), session)
    finally:
        if clone_dir and os.path.exists(clone_dir):
            shutil.rmtree(clone_dir, ignore_errors=True)
