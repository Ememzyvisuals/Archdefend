from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from database import get_session
from models import (
    Analysis, ArchitectureNode, ArchitectureEdge, SecurityFinding,
    Repository, WorkspaceMembership, User, AnalysisStatus
)
from auth import get_current_user

router = APIRouter(prefix="/analyses", tags=["analyses"])


async def _verify_analysis_access(analysis_id: str, user: User, session: AsyncSession) -> Analysis:
    result = await session.execute(select(Analysis).where(Analysis.id == analysis_id))
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    repo_result = await session.execute(
        select(Repository).where(Repository.id == analysis.repository_id)
    )
    repo = repo_result.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    membership = await session.execute(
        select(WorkspaceMembership).where(
            WorkspaceMembership.workspace_id == repo.workspace_id,
            WorkspaceMembership.user_id == user.id,
        )
    )
    if not membership.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Access denied")

    return analysis


@router.get("/{analysis_id}")
async def get_analysis(
    analysis_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    analysis = await _verify_analysis_access(analysis_id, current_user, session)
    return {
        "id": analysis.id,
        "repository_id": analysis.repository_id,
        "status": analysis.status.value,
        "progress_percent": analysis.progress_percent,
        "branch": analysis.branch,
        "commit_sha": analysis.commit_sha,
        "files_parsed": analysis.files_parsed,
        "nodes_extracted": analysis.nodes_extracted,
        "edges_extracted": analysis.edges_extracted,
        "languages_detected": analysis.languages_detected,
        "tech_stack": analysis.tech_stack,
        "ai_summary": analysis.ai_summary,
        "architecture_overview": analysis.architecture_overview,
        "error_message": analysis.error_message,
        "started_at": analysis.started_at,
        "completed_at": analysis.completed_at,
        "created_at": analysis.created_at,
    }


@router.get("/{analysis_id}/graph")
async def get_analysis_graph(
    analysis_id: str,
    node_type: Optional[str] = Query(None),
    limit: int = Query(500, le=2000),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Return React Flow compatible nodes and edges."""
    analysis = await _verify_analysis_access(analysis_id, current_user, session)

    if analysis.status != AnalysisStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Analysis not yet completed")

    nodes_query = select(ArchitectureNode).where(ArchitectureNode.analysis_id == analysis_id)
    if node_type:
        nodes_query = nodes_query.where(ArchitectureNode.type == node_type)
    nodes_query = nodes_query.limit(limit)

    nodes_result = await session.execute(nodes_query)
    nodes = nodes_result.scalars().all()

    node_ids = {n.node_id for n in nodes}

    edges_result = await session.execute(
        select(ArchitectureEdge).where(ArchitectureEdge.analysis_id == analysis_id).limit(limit * 2)
    )
    edges = edges_result.scalars().all()
    filtered_edges = [e for e in edges if e.source_id in node_ids or e.target_id in node_ids]

    COLOR_MAP = {
        "module": "#6366f1",
        "class": "#8b5cf6",
        "function": "#06b6d4",
        "api_endpoint": "#10b981",
        "database": "#f59e0b",
        "service": "#ef4444",
        "external": "#94a3b8",
    }

    rf_nodes = []
    for n in nodes:
        color = COLOR_MAP.get(n.type.value if hasattr(n.type, 'value') else str(n.type), "#6366f1")
        rf_nodes.append({
            "id": n.node_id,
            "type": "archNode",
            "position": {
                "x": float(n.pos_x) if n.pos_x is not None else 0,
                "y": float(n.pos_y) if n.pos_y is not None else 0,
            },
            "data": {
                "id": n.id,
                "name": n.name,
                "type": n.type.value if hasattr(n.type, 'value') else str(n.type),
                "file_path": n.file_path,
                "line_start": n.line_start,
                "line_end": n.line_end,
                "language": n.language,
                "description": n.description,
                "color": color,
            },
        })

    rf_edges = []
    for e in filtered_edges:
        rf_edges.append({
            "id": e.id,
            "source": e.source_id,
            "target": e.target_id,
            "type": "smoothstep",
            "label": e.label,
            "data": {
                "edge_type": e.edge_type.value if hasattr(e.edge_type, 'value') else str(e.edge_type),
                "weight": e.weight,
            },
            "style": {"stroke": "#4f46e5", "strokeWidth": max(1, int(e.weight))},
            "markerEnd": {"type": "arrowclosed", "color": "#4f46e5"},
        })

    return {
        "nodes": rf_nodes,
        "edges": rf_edges,
        "total_nodes": len(rf_nodes),
        "total_edges": len(rf_edges),
        "languages": analysis.languages_detected or {},
        "tech_stack": analysis.tech_stack or [],
    }


@router.get("/{analysis_id}/security")
async def get_security_findings(
    analysis_id: str,
    severity: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    analysis = await _verify_analysis_access(analysis_id, current_user, session)

    query = select(SecurityFinding).where(SecurityFinding.analysis_id == analysis_id)
    if severity:
        query = query.where(SecurityFinding.severity == severity)
    query = query.order_by(SecurityFinding.severity)

    result = await session.execute(query)
    findings = result.scalars().all()

    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
    sorted_findings = sorted(findings, key=lambda f: severity_order.get(
        f.severity.value if hasattr(f.severity, 'value') else str(f.severity), 5
    ))

    return {
        "findings": [
            {
                "id": f.id,
                "severity": f.severity.value if hasattr(f.severity, 'value') else str(f.severity),
                "category": f.category,
                "title": f.title,
                "description": f.description,
                "file_path": f.file_path,
                "line_number": f.line_number,
                "recommendation": f.recommendation,
                "is_resolved": f.is_resolved,
                "created_at": f.created_at,
            }
            for f in sorted_findings
        ],
        "summary": {
            "total": len(findings),
            "critical": sum(1 for f in findings if (f.severity.value if hasattr(f.severity, 'value') else str(f.severity)) == "critical"),
            "high": sum(1 for f in findings if (f.severity.value if hasattr(f.severity, 'value') else str(f.severity)) == "high"),
            "medium": sum(1 for f in findings if (f.severity.value if hasattr(f.severity, 'value') else str(f.severity)) == "medium"),
            "low": sum(1 for f in findings if (f.severity.value if hasattr(f.severity, 'value') else str(f.severity)) == "low"),
        },
    }


@router.get("/{analysis_id}/nodes")
async def get_analysis_nodes(
    analysis_id: str,
    node_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100, le=1000),
    offset: int = Query(0),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    await _verify_analysis_access(analysis_id, current_user, session)

    query = select(ArchitectureNode).where(ArchitectureNode.analysis_id == analysis_id)
    if node_type:
        query = query.where(ArchitectureNode.type == node_type)
    if search:
        query = query.where(ArchitectureNode.name.ilike(f"%{search}%"))
    query = query.offset(offset).limit(limit)

    result = await session.execute(query)
    nodes = result.scalars().all()

    return [
        {
            "id": n.id,
            "node_id": n.node_id,
            "name": n.name,
            "type": n.type.value if hasattr(n.type, 'value') else str(n.type),
            "file_path": n.file_path,
            "line_start": n.line_start,
            "line_end": n.line_end,
            "language": n.language,
            "description": n.description,
        }
        for n in nodes
    ]
