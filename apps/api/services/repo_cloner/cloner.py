"""
ArchDefend — Repo Cloner Service (Python-importable)
Re-exports from the monorepo service with correct Python paths.
"""
import asyncio
import hashlib
import ipaddress
import os
import re
import shutil
import socket
import urllib.parse
from pathlib import Path
from typing import Optional, Callable, Awaitable
import logging

from core.config import settings

logger = logging.getLogger("archdefend.cloner")

ALLOWED_HOSTS = {"github.com", "gitlab.com", "bitbucket.org"}
GITHUB_URL_RE = re.compile(
    r'^https?://(?:www\.)?(?:github|gitlab|bitbucket)\.(?:com|org)/([a-zA-Z0-9_.-]+)/([a-zA-Z0-9_.-]+?)(?:\.git)?(?:/.*)?$'
)
PRIVATE_NETS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
]


def validate_github_url(url: str) -> tuple[str, str]:
    url = url.strip()
    if not url.startswith(("https://", "http://")):
        raise ValueError("URL must use HTTPS scheme")

    parsed = urllib.parse.urlparse(url)
    hostname = (parsed.hostname or "").lower()

    # SSRF: block private IPs
    try:
        for _, _, _, _, sockaddr in socket.getaddrinfo(hostname, None):
            ip = ipaddress.ip_address(sockaddr[0])
            for net in PRIVATE_NETS:
                if ip in net:
                    raise ValueError(f"Resolved IP {ip} is a private/reserved address")
    except socket.gaierror:
        raise ValueError(f"Cannot resolve hostname: {hostname}")

    if hostname not in ALLOWED_HOSTS:
        raise ValueError(f"Host '{hostname}' is not allowed. Use github.com, gitlab.com, or bitbucket.org")

    match = GITHUB_URL_RE.match(url)
    if not match:
        raise ValueError("Invalid repository URL. Expected: https://github.com/owner/repo")

    owner, repo = match.group(1), match.group(2)
    if ".." in owner or ".." in repo or "/" in owner:
        raise ValueError("Invalid repository path — path traversal detected")

    return owner, repo


ProgressCallback = Optional[Callable[[int, str], Awaitable[None]]]


class RepoCloner:
    def __init__(self):
        self.base = Path(settings.TEMP_CLONE_DIR)
        self.base.mkdir(parents=True, exist_ok=True)

    def _workspace(self, analysis_id: str) -> Path:
        safe = hashlib.sha256(analysis_id.encode()).hexdigest()[:20]
        return self.base / safe

    async def clone(
        self,
        repo_url: str,
        analysis_id: str,
        github_token: Optional[str] = None,
        progress: ProgressCallback = None,
    ) -> Path:
        owner, repo = validate_github_url(repo_url)
        ws = self._workspace(analysis_id)
        ws.mkdir(parents=True, exist_ok=True)
        dest = ws / "repo"

        auth_url = (
            f"https://{github_token}@github.com/{owner}/{repo}.git"
            if github_token else
            f"https://github.com/{owner}/{repo}.git"
        )

        logger.info(f"Cloning {owner}/{repo} → {dest}")
        if progress:
            await progress(10, "Cloning repository...")

        env = {
            **os.environ,
            "GIT_TERMINAL_PROMPT": "0",
            "GIT_ASKPASS": "echo",
            "HOME": str(ws),
            # Prevent git hooks from executing
            "GIT_CONFIG_NOSYSTEM": "1",
        }

        try:
            proc = await asyncio.create_subprocess_exec(
                "git", "clone",
                "--depth", "1",
                "--single-branch",
                "--no-tags",
                "--filter=blob:limit=5m",
                auth_url,
                str(dest),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env,
            )
            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(), timeout=settings.CLONE_TIMEOUT_SECONDS
                )
            except asyncio.TimeoutError:
                proc.kill()
                raise TimeoutError(f"Clone timed out after {settings.CLONE_TIMEOUT_SECONDS}s")

            if proc.returncode != 0:
                err = stderr.decode("utf-8", errors="replace")
                if "not found" in err.lower() or "repository" in err.lower():
                    raise ValueError("Repository not found or is private. Connect your GitHub account for private repos.")
                raise RuntimeError(f"git clone failed (exit {proc.returncode}): {err[:400]}")

        except Exception:
            self.cleanup(analysis_id)
            raise

        # ZIP bomb guard
        size = await self._dir_size(dest)
        max_bytes = settings.MAX_REPO_SIZE_MB * 1_048_576
        if size > max_bytes:
            self.cleanup(analysis_id)
            raise ValueError(
                f"Repository too large ({size / 1_048_576:.1f} MB). "
                f"Maximum allowed: {settings.MAX_REPO_SIZE_MB} MB"
            )

        if progress:
            await progress(26, f"Cloned {size / 1_048_576:.1f} MB · ready for parsing")

        logger.info(f"Cloned {owner}/{repo} — {size / 1_048_576:.1f} MB")
        return dest

    async def _dir_size(self, path: Path) -> int:
        total = 0
        for entry in path.rglob("*"):
            if entry.is_file() and not entry.is_symlink():
                try:
                    total += entry.stat().st_size
                except OSError:
                    pass
        return total

    def cleanup(self, analysis_id: str) -> None:
        ws = self._workspace(analysis_id)
        if ws.exists():
            shutil.rmtree(ws, ignore_errors=True)
            logger.info(f"Cleaned workspace for {analysis_id[:8]}")

    async def file_tree(self, clone_path: Path, max_files: int = 5000) -> list[dict]:
        SKIP_DIRS = {
            ".git", "node_modules", "__pycache__", ".venv", "venv",
            "dist", "build", ".next", ".nuxt", "target", "vendor",
            ".gradle", "coverage", ".nyc_output", "out", ".cache",
        }
        SKIP_EXT = {
            ".jpg", ".jpeg", ".png", ".gif", ".svg", ".ico", ".webp",
            ".woff", ".woff2", ".ttf", ".eot", ".otf", ".mp4", ".mp3",
            ".mov", ".zip", ".tar", ".gz", ".rar", ".exe", ".dll",
            ".so", ".dylib", ".pdf", ".psd", ".sketch", ".lock",
        }
        files = []
        for path in clone_path.rglob("*"):
            if len(files) >= max_files:
                break
            parts = path.relative_to(clone_path).parts
            if any(p.startswith(".") or p in SKIP_DIRS for p in parts):
                continue
            if path.is_file() and path.suffix.lower() not in SKIP_EXT:
                try:
                    files.append({
                        "path": str(path.relative_to(clone_path)),
                        "size": path.stat().st_size,
                        "ext": path.suffix.lower(),
                    })
                except OSError:
                    pass
        return files


repo_cloner = RepoCloner()
