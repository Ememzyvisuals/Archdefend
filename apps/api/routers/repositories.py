from datetime import datetime
from typing import Optional
import hashlib
import hmac
import json
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from pydantic import BaseModel
from config import settings
from database import get_session
from models import Repository, Workspace, WorkspaceMembership, Analysis, AnalysisStatus, User
from auth import get_current_user

router = APIRouter(prefix="/repositories", tags=["repositories"])


class ConnectRepositoryRequest(BaseModel):
    workspace_id: str
    github_repo_full_name: str
    branch: str = "main"


class RepositoryResponse(BaseModel):
    id: str
    workspace_id: str
    full_name: str
    name: str
    description: Optional[str]
    private: bool
    default_branch: str
    language: Optional[str]
    stars_count: int
    size_kb: int
    is_active: bool
    last_synced_at: Optional[datetime]
    created_at: datetime
    latest_analysis_status: Optional[str] = None
    analyses_count: int = 0


async def _verify_workspace_access(
    workspace_id: str, user: User, session: AsyncSession
) -> Workspace:
    result = await session.execute(
        select(WorkspaceMembership).where(
            WorkspaceMembership.workspace_id == workspace_id,
            WorkspaceMembership.user_id == user.id,
        )
    )
    membership = result.scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=403, detail="Access denied to this workspace")

    ws_result = await session.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = ws_result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace


async def _get_github_repo(full_name: str, access_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://api.github.com/repos/{full_name}",
            headers={
                "Authorization": f"token {access_token}",
                "Accept": "application/json",
            },
            timeout=30,
        )
    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail="GitHub repository not found or not accessible")
    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch GitHub repository")
    return resp.json()


async def _list_github_repos(access_token: str, page: int = 1) -> list[dict]:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.github.com/user/repos",
            params={"per_page": 100, "page": page, "sort": "updated", "type": "all"},
            headers={"Authorization": f"token {access_token}", "Accept": "application/json"},
            timeout=30,
        )
    return resp.json() if resp.status_code == 200 else []


@router.get("/github/list")
async def list_github_repositories(
    page: int = 1,
    current_user: User = Depends(get_current_user),
):
    if not current_user.github_access_token:
        raise HTTPException(status_code=400, detail="GitHub not connected. Please connect GitHub first.")

    repos = await _list_github_repos(current_user.github_access_token, page)
    return [
        {
            "id": r["id"],
            "full_name": r["full_name"],
            "name": r["name"],
            "description": r.get("description"),
            "private": r["private"],
            "default_branch": r.get("default_branch", "main"),
            "language": r.get("language"),
            "stars_count": r.get("stargazers_count", 0),
            "size_kb": r.get("size", 0),
            "updated_at": r.get("updated_at"),
        }
        for r in repos
        if isinstance(r, dict)
    ]


@router.post("/connect", response_model=RepositoryResponse)
async def connect_repository(
    body: ConnectRepositoryRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if not current_user.github_access_token:
        raise HTTPException(
            status_code=400,
            detail="GitHub not connected. Please sign in with GitHub to connect repositories.",
        )

    await _verify_workspace_access(body.workspace_id, current_user, session)

    existing = await session.execute(
        select(Repository).where(
            Repository.workspace_id == body.workspace_id,
            Repository.full_name == body.github_repo_full_name,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Repository already connected to this workspace")

    github_repo = await _get_github_repo(body.github_repo_full_name, current_user.github_access_token)

    import secrets as sec
    webhook_secret = sec.token_hex(32)

    repo = Repository(
        workspace_id=body.workspace_id,
        github_repo_id=github_repo["id"],
        full_name=github_repo["full_name"],
        name=github_repo["name"],
        description=github_repo.get("description"),
        private=github_repo["private"],
        default_branch=body.branch or github_repo.get("default_branch", "main"),
        language=github_repo.get("language"),
        stars_count=github_repo.get("stargazers_count", 0),
        size_kb=github_repo.get("size", 0),
        webhook_secret=webhook_secret,
        last_synced_at=datetime.utcnow(),
    )
    session.add(repo)
    await session.flush()

    analysis = Analysis(
        repository_id=repo.id,
        triggered_by=current_user.id,
        status=AnalysisStatus.QUEUED,
        branch=body.branch or github_repo.get("default_branch", "main"),
    )
    session.add(analysis)
    await session.commit()
    await session.refresh(repo)

    from workers.analysis_worker import trigger_analysis
    background_tasks.add_task(trigger_analysis, str(analysis.id))

    return RepositoryResponse(
        id=repo.id,
        workspace_id=repo.workspace_id,
        full_name=repo.full_name,
        name=repo.name,
        description=repo.description,
        private=repo.private,
        default_branch=repo.default_branch,
        language=repo.language,
        stars_count=repo.stars_count,
        size_kb=repo.size_kb,
        is_active=repo.is_active,
        last_synced_at=repo.last_synced_at,
        created_at=repo.created_at,
        latest_analysis_status=AnalysisStatus.QUEUED.value,
        analyses_count=1,
    )


@router.get("/workspace/{workspace_id}")
async def list_workspace_repositories(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    await _verify_workspace_access(workspace_id, current_user, session)

    result = await session.execute(
        select(Repository)
        .where(Repository.workspace_id == workspace_id, Repository.is_active == True)
        .order_by(Repository.created_at.desc())
    )
    repos = result.scalars().all()

    output = []
    for repo in repos:
        analyses_result = await session.execute(
            select(Analysis)
            .where(Analysis.repository_id == repo.id)
            .order_by(Analysis.created_at.desc())
            .limit(1)
        )
        latest = analyses_result.scalar_one_or_none()

        count_result = await session.execute(
            select(Analysis).where(Analysis.repository_id == repo.id)
        )
        count = len(count_result.scalars().all())

        output.append(
            RepositoryResponse(
                id=repo.id,
                workspace_id=repo.workspace_id,
                full_name=repo.full_name,
                name=repo.name,
                description=repo.description,
                private=repo.private,
                default_branch=repo.default_branch,
                language=repo.language,
                stars_count=repo.stars_count,
                size_kb=repo.size_kb,
                is_active=repo.is_active,
                last_synced_at=repo.last_synced_at,
                created_at=repo.created_at,
                latest_analysis_status=latest.status.value if latest else None,
                analyses_count=count,
            )
        )
    return output


@router.get("/{repo_id}")
async def get_repository(
    repo_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Repository).where(Repository.id == repo_id))
    repo = result.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    await _verify_workspace_access(repo.workspace_id, current_user, session)

    analyses_result = await session.execute(
        select(Analysis)
        .where(Analysis.repository_id == repo_id)
        .order_by(Analysis.created_at.desc())
        .limit(10)
    )
    analyses = analyses_result.scalars().all()

    return {
        "repository": {
            "id": repo.id,
            "workspace_id": repo.workspace_id,
            "full_name": repo.full_name,
            "name": repo.name,
            "description": repo.description,
            "private": repo.private,
            "default_branch": repo.default_branch,
            "language": repo.language,
            "stars_count": repo.stars_count,
            "size_kb": repo.size_kb,
            "is_active": repo.is_active,
            "last_synced_at": repo.last_synced_at,
            "created_at": repo.created_at,
            "updated_at": repo.updated_at,
        },
        "analyses": [
            {
                "id": a.id,
                "status": a.status.value,
                "branch": a.branch,
                "commit_sha": a.commit_sha,
                "progress_percent": a.progress_percent,
                "files_parsed": a.files_parsed,
                "nodes_extracted": a.nodes_extracted,
                "edges_extracted": a.edges_extracted,
                "created_at": a.created_at,
                "completed_at": a.completed_at,
            }
            for a in analyses
        ],
    }


@router.post("/{repo_id}/analyze")
async def trigger_new_analysis(
    repo_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Repository).where(Repository.id == repo_id))
    repo = result.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    await _verify_workspace_access(repo.workspace_id, current_user, session)

    running = await session.execute(
        select(Analysis).where(
            Analysis.repository_id == repo_id,
            Analysis.status.in_([AnalysisStatus.QUEUED, AnalysisStatus.CLONING, AnalysisStatus.PARSING]),
        )
    )
    if running.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Analysis already in progress")

    analysis = Analysis(
        repository_id=repo_id,
        triggered_by=current_user.id,
        status=AnalysisStatus.QUEUED,
        branch=repo.default_branch,
    )
    session.add(analysis)
    await session.commit()
    await session.refresh(analysis)

    from workers.analysis_worker import trigger_analysis
    background_tasks.add_task(trigger_analysis, analysis.id)

    return {"analysis_id": analysis.id, "status": "queued"}


@router.post("/{repo_id}/webhook")
async def github_webhook(
    repo_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Repository).where(Repository.id == repo_id))
    repo = result.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    body = await request.body()
    signature_header = request.headers.get("X-Hub-Signature-256", "")

    if repo.webhook_secret:
        expected = "sha256=" + hmac.new(
            repo.webhook_secret.encode(), body, hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected, signature_header):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    payload = json.loads(body)
    event = request.headers.get("X-GitHub-Event", "")

    if event == "push":
        ref = payload.get("ref", "")
        branch = ref.replace("refs/heads/", "")
        if branch == repo.default_branch:
            commit_sha = payload.get("after")
            analysis = Analysis(
                repository_id=repo_id,
                triggered_by=repo.workspace_id,
                status=AnalysisStatus.QUEUED,
                branch=branch,
                commit_sha=commit_sha,
            )
            session.add(analysis)
            await session.commit()
            await session.refresh(analysis)
            from workers.analysis_worker import trigger_analysis
            background_tasks.add_task(trigger_analysis, analysis.id)

    return {"status": "received"}


@router.delete("/{repo_id}")
async def disconnect_repository(
    repo_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(Repository).where(Repository.id == repo_id))
    repo = result.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    await _verify_workspace_access(repo.workspace_id, current_user, session)

    repo.is_active = False
    session.add(repo)
    await session.commit()
    return {"message": "Repository disconnected"}
