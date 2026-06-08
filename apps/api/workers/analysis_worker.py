"""
ArchDefend Analysis Worker
Background task that runs the full repository analysis pipeline.
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
    SecurityFinding, SecuritySeverity, NodeType, EdgeType,
    Notification, NotificationType, User
)
from services.analysis_engine import clone_repository, analyze_repository
from services.ai_service import analyze_architecture, scan_security
from config import settings

log = structlog.get_logger()


async def trigger_analysis(analysis_id: str) -> None:
    log.info("analysis_triggered", analysis_id=analysis_id)
    async with AsyncSessionLocal() as session:
        try:
            await _run_analysis(analysis_id, session)
        except Exception as e:
            log.error("analysis_unhandled_error", analysis_id=analysis_id, error=str(e))
            await _mark_failed(analysis_id, str(e), session)


async def _update_status(
    analysis_id: str,
    status: AnalysisStatus,
    progress: int,
    session: AsyncSession,
    **kwargs,
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
    if not analysis:
        return

    analysis.status = AnalysisStatus.FAILED
    analysis.error_message = error[:2000]
    analysis.progress_percent = 0
    session.add(analysis)

    repo_result = await session.execute(
        select(Repository).where(Repository.id == analysis.repository_id)
    )
    repo = repo_result.scalar_one_or_none()

    user_result = await session.execute(
        select(User).where(User.id == analysis.triggered_by)
    )
    user = user_result.scalar_one_or_none()

    if user and repo:
        notif = Notification(
            user_id=user.id,
            type=NotificationType.ANALYSIS_FAILED,
            title="Analysis Failed",
            message=f"Analysis of {repo.full_name} failed: {error[:200]}",
            data={"analysis_id": analysis_id, "repository_id": str(analysis.repository_id)},
        )
        session.add(notif)

    await session.commit()


async def _run_analysis(analysis_id: str, session: AsyncSession) -> None:
    # Load analysis
    result = await session.execute(select(Analysis).where(Analysis.id == analysis_id))
    analysis = result.scalar_one_or_none()
    if not analysis:
        log.error("analysis_not_found", analysis_id=analysis_id)
        return

    # Load repository
    repo_result = await session.execute(
        select(Repository).where(Repository.id == analysis.repository_id)
    )
    repo = repo_result.scalar_one_or_none()
    if not repo:
        await _mark_failed(analysis_id, "Repository not found", session)
        return

    # Load user for GitHub token
    user_result = await session.execute(
        select(User).where(User.id == analysis.triggered_by)
    )
    user = user_result.scalar_one_or_none()
    if not user or not user.github_access_token:
        await _mark_failed(analysis_id, "GitHub access token not available. Please reconnect GitHub.", session)
        return

    # Size check
    if repo.size_kb > settings.MAX_REPO_SIZE_MB * 1024:
        await _mark_failed(
            analysis_id,
            f"Repository too large ({repo.size_kb // 1024} MB). Max: {settings.MAX_REPO_SIZE_MB} MB",
            session,
        )
        return

    # Mark started
    analysis.started_at = datetime.utcnow()
    session.add(analysis)
    await session.commit()

    clone_dir = None
    try:
        # ── Step 1: Clone ──────────────────────────────────────────────────
        await _update_status(analysis_id, AnalysisStatus.CLONING, 5, session)
        log.info("cloning_repo", repo=repo.full_name)

        clone_dir = await clone_repository(
            full_name=repo.full_name,
            access_token=user.github_access_token,
            target_dir=settings.TEMP_CLONE_DIR,
            branch=analysis.branch,
            timeout=settings.CLONE_TIMEOUT_SECONDS,
        )

        # ── Step 2: Parse ──────────────────────────────────────────────────
        await _update_status(analysis_id, AnalysisStatus.PARSING, 15, session)
        log.info("parsing_repo", repo=repo.full_name)

        async def on_progress(pct: int) -> None:
            await _update_status(analysis_id, AnalysisStatus.PARSING, pct, session)

        analysis_result = await analyze_repository(clone_dir, on_progress=on_progress)

        # ── Step 3: Build Graph ────────────────────────────────────────────
        await _update_status(analysis_id, AnalysisStatus.GRAPHING, 75, session)
        log.info("building_graph", nodes=len(analysis_result.symbols))

        # Save nodes — use node_meta (renamed from metadata to avoid SQLAlchemy conflict)
        node_batch = []
        for sym in analysis_result.symbols[:5000]:
            try:
                node_type = NodeType(sym.symbol_type)
            except ValueError:
                node_type = NodeType.MODULE

            node = ArchitectureNode(
                analysis_id=analysis_id,
                node_id=sym.symbol_id[:500],
                name=sym.name[:255],
                type=node_type,
                file_path=sym.file_path[:1000] if sym.file_path else None,
                line_start=sym.line_start,
                line_end=sym.line_end,
                language=sym.language,
                pos_x=sym.metadata.get("pos_x") if sym.metadata else None,
                pos_y=sym.metadata.get("pos_y") if sym.metadata else None,
                node_meta=sym.metadata,  # renamed field — not 'metadata'
            )
            node_batch.append(node)

        session.add_all(node_batch)
        await session.flush()

        # Save edges — use edge_meta (renamed from metadata)
        edge_batch = []
        for edge in analysis_result.edges[:10000]:
            try:
                edge_type = EdgeType(edge.edge_type)
            except ValueError:
                edge_type = EdgeType.DEPENDS_ON

            arch_edge = ArchitectureEdge(
                analysis_id=analysis_id,
                source_id=edge.source_id[:500],
                target_id=edge.target_id[:500],
                edge_type=edge_type,
                label=edge.label[:255] if edge.label else None,
                weight=edge.weight,
                edge_meta=None,  # renamed field
            )
            edge_batch.append(arch_edge)

        session.add_all(edge_batch)
        await session.flush()

        # ── Step 4: AI Processing ──────────────────────────────────────────
        await _update_status(analysis_id, AnalysisStatus.AI_PROCESSING, 82, session)

        symbols_summary = (
            f"{len(analysis_result.symbols)} symbols: "
            f"{sum(1 for s in analysis_result.symbols if s.symbol_type == 'module')} modules, "
            f"{sum(1 for s in analysis_result.symbols if s.symbol_type == 'class')} classes, "
            f"{sum(1 for s in analysis_result.symbols if s.symbol_type == 'api_endpoint')} API endpoints"
        )

        try:
            ai_analysis = await analyze_architecture(
                repo_summary=(
                    f"{repo.full_name}: {repo.description or 'No description'}. "
                    f"{analysis_result.architecture_summary}"
                ),
                tech_stack=analysis_result.tech_stack,
                symbols_summary=symbols_summary,
            )
        except Exception as ai_err:
            log.warning("ai_analysis_failed", error=str(ai_err))
            ai_analysis = {"overview": analysis_result.architecture_summary}

        # ── Step 5: Security Scan ──────────────────────────────────────────
        await _update_status(analysis_id, AnalysisStatus.AI_PROCESSING, 90, session)

        code_samples = []
        scanned_paths: set = set()
        for sym in analysis_result.symbols:
            if sym.file_path and sym.file_path not in scanned_paths:
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
                        scanned_paths.add(sym.file_path)
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
        except Exception as sec_err:
            log.warning("security_scan_failed", error=str(sec_err))

        # ── Finalize ───────────────────────────────────────────────────────
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

        # Completion notification
        if user:
            notif = Notification(
                user_id=user.id,
                type=NotificationType.ANALYSIS_COMPLETED,
                title="Analysis Complete",
                message=(
                    f"{repo.full_name} analyzed. "
                    f"Found {len(analysis_result.symbols)} symbols across {analysis_result.files_parsed} files."
                ),
                data={
                    "analysis_id": analysis_id,
                    "repository_id": str(repo.id),
                    "nodes": len(analysis_result.symbols),
                    "files": analysis_result.files_parsed,
                },
            )
            session.add(notif)

        await session.commit()
        log.info("analysis_completed", analysis_id=analysis_id, nodes=len(analysis_result.symbols))

    except Exception as e:
        log.error("analysis_pipeline_error", analysis_id=analysis_id, error=str(e))
        await _mark_failed(analysis_id, str(e), session)
    finally:
        if clone_dir and os.path.exists(clone_dir):
            shutil.rmtree(clone_dir, ignore_errors=True)
