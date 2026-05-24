"""
ArchDefend — Analysis Pipeline Orchestrator
Wires together all services into a clean, observable pipeline.
Every stage is logged and timed. Workspace always cleaned up.
"""

import asyncio
import logging
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("archdefend.pipeline")


class PipelineStage:
    """Context manager that logs stage entry/exit and updates DB progress."""

    def __init__(
        self,
        name: str,
        db: AsyncSession,
        analysis_id: str,
        status_enum,
        progress: int,
        status_model,
    ):
        self.name = name
        self.db = db
        self.analysis_id = analysis_id
        self.status_enum = status_enum
        self.progress = progress
        self.status_model = status_model
        self._start = 0.0

    async def __aenter__(self):
        self._start = time.perf_counter()
        logger.info(f"[{self.analysis_id[:8]}] ▶ {self.name} ({self.progress}%)")
        await self.db.execute(
            update(self.status_model)
            .where(self.status_model.id == self.analysis_id)
            .values(status=self.status_enum, progress_pct=self.progress)
        )
        await self.db.commit()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        elapsed = time.perf_counter() - self._start
        if exc_type:
            logger.error(f"[{self.analysis_id[:8]}] ✗ {self.name} failed after {elapsed:.2f}s — {exc_val}")
        else:
            logger.info(f"[{self.analysis_id[:8]}] ✓ {self.name} completed in {elapsed:.2f}s")
        return False  # Re-raise exceptions


async def run_full_pipeline(
    analysis_id: str,
    repo_url: str,
    user_id: str,
    include_security: bool,
    include_interview_prep: bool,
    github_token: Optional[str],
    db_session_factory,
) -> None:
    """
    Full ArchDefend analysis pipeline.

    Stages:
    1. Clone        — Secure shallow git clone
    2. Parse        — Tree-sitter AST across all files
    3. Graph        — NetworkX dependency graph
    4. Analyze      — LLM-powered intelligence (grounded)
    5. Report       — Persist to database
    6. Cleanup      — Always runs, even on failure

    All stages write progress to DB for SSE streaming.
    """
    from services.repo_cloner.cloner import repo_cloner
    from services.parser_engine.parser import parser
    from services.graph_engine.graph_builder import graph_builder
    from services.llm_analyzer.analyzer import analyzer
    from models.models import Analysis, AnalysisReport, AnalysisStatus, CreditTransaction
    from sqlalchemy import select

    clone_path: Optional[Path] = None

    async with db_session_factory() as db:
        try:
            # ── Stage 1: Clone ────────────────────────────────────────────────
            async with PipelineStage("Repository Clone", db, analysis_id, AnalysisStatus.CLONING, 8, Analysis):
                clone_path = await repo_cloner.clone(
                    repo_url=repo_url,
                    analysis_id=analysis_id,
                    github_token=github_token,
                )

            # ── Stage 2: Parse ────────────────────────────────────────────────
            async with PipelineStage("AST Parsing", db, analysis_id, AnalysisStatus.PARSING, 30, Analysis):
                parse_result = await parser.parse_repository(clone_path)

            # Write metadata immediately (file count, languages visible in UI)
            await db.execute(
                update(Analysis)
                .where(Analysis.id == analysis_id)
                .values(
                    repo_name=parse_result["repo_name"],
                    file_count=parse_result["file_count"],
                    language_stats=parse_result["language_stats"],
                    repo_size_mb=round(
                        sum(f.get("size", 0) for f in parse_result.get("parsed_files", [])) / 1_048_576,
                        2,
                    ),
                )
            )
            await db.commit()

            # ── Stage 3: Graph ────────────────────────────────────────────────
            async with PipelineStage("Graph Construction", db, analysis_id, AnalysisStatus.ANALYZING, 52, Analysis):
                graph_data = await graph_builder.build_graph(parse_result)

            # ── Stage 4: LLM Analysis ─────────────────────────────────────────
            async with PipelineStage("AI Analysis", db, analysis_id, AnalysisStatus.ANALYZING, 72, Analysis):
                report_data = await analyzer.generate_full_report(
                    parse_result=parse_result,
                    graph_data=graph_data,
                    include_security=include_security,
                    include_interview_prep=include_interview_prep,
                )

            # ── Stage 5: Persist Report ───────────────────────────────────────
            async with PipelineStage("Report Generation", db, analysis_id, AnalysisStatus.GENERATING, 90, Analysis):
                report = AnalysisReport(
                    analysis_id=analysis_id,
                    architecture_summary=report_data["architecture_summary"],
                    dependency_graph=report_data["dependency_graph"],
                    security_findings=report_data["security_findings"],
                    api_inventory=report_data["api_inventory"],
                    scalability_score=report_data["scalability_score"],
                    production_readiness_score=report_data["production_readiness_score"],
                    interview_questions=report_data["interview_questions"],
                    tech_stack=report_data["tech_stack"],
                    recommendations=report_data["recommendations"],
                    hallucination_detected=report_data["hallucination_detected"],
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

            logger.info(f"[{analysis_id[:8]}] ✅ Pipeline complete — {parse_result['file_count']} files analyzed")

        except Exception as exc:
            logger.exception(f"[{analysis_id[:8]}] ❌ Pipeline failed: {exc}")
            try:
                await db.execute(
                    update(Analysis)
                    .where(Analysis.id == analysis_id)
                    .values(
                        status=AnalysisStatus.FAILED,
                        error_message=str(exc)[:1000],
                    )
                )
                # Refund credits on failure
                result = await db.execute(
                    select(Analysis).where(Analysis.id == analysis_id)
                )
                analysis = result.scalar_one_or_none()
                if analysis and analysis.credits_used > 0:
                    from models.models import User
                    await db.execute(
                        update(User)
                        .where(User.id == analysis.user_id)
                        .values(credits=User.credits + analysis.credits_used)
                    )
                    db.add(CreditTransaction(
                        user_id=analysis.user_id,
                        amount=analysis.credits_used,
                        balance_after=0,  # Will be recalculated
                        reason="analysis_failed_refund",
                        reference_id=analysis_id,
                    ))
                    await db.commit()
                    logger.info(f"[{analysis_id[:8]}] 💸 Refunded {analysis.credits_used} credits")
            except Exception as refund_exc:
                logger.error(f"[{analysis_id[:8]}] Failed to persist error state: {refund_exc}")

        finally:
            # ── Always clean up the cloned workspace ─────────────────────────
            if clone_path:
                try:
                    repo_cloner.cleanup(analysis_id)
                except Exception as cleanup_exc:
                    logger.warning(f"[{analysis_id[:8]}] Cleanup error: {cleanup_exc}")
