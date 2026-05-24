"""
ArchDefend — Repository Cloner Service
Secure GitHub repository cloning with SSRF + path traversal protection.
NEVER executes cloned code.
"""

import asyncio
import hashlib
import ipaddress
import os
import re
import shutil
import socket
import tempfile
import urllib.parse
from pathlib import Path
from typing import Optional
import logging
import aiofiles

from core.config import settings

logger = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────────────

ALLOWED_HOSTS = {"github.com", "gitlab.com", "bitbucket.org"}
GITHUB_URL_PATTERN = re.compile(
    r'^https?://(?:www\.)?github\.com/([a-zA-Z0-9_.-]+)/([a-zA-Z0-9_.-]+?)(?:\.git)?(?:/.*)?$'
)
MAX_REPO_SIZE_BYTES = settings.MAX_REPO_SIZE_MB * 1024 * 1024

# Private/reserved IP ranges (SSRF protection)
BLOCKED_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
]


# ── SSRF Validation ──────────────────────────────────────────────────────────

def validate_github_url(url: str) -> tuple[str, str]:
    """
    Validate GitHub URL and extract (owner, repo).
    Raises ValueError on invalid or suspicious URLs.
    """
    url = url.strip()

    if not url.startswith(("https://", "http://")):
        raise ValueError("URL must use HTTP(S) scheme")

    parsed = urllib.parse.urlparse(url)
    hostname = parsed.hostname or ""

    # Block private IPs via DNS resolution
    _check_ssrf_dns(hostname)

    # Validate host is allowed
    if hostname not in ALLOWED_HOSTS:
        raise ValueError(f"Host '{hostname}' is not in the allowed list: {ALLOWED_HOSTS}")

    # Extract owner/repo via pattern
    match = GITHUB_URL_PATTERN.match(url)
    if not match:
        raise ValueError("Invalid GitHub repository URL format. Expected: https://github.com/owner/repo")

    owner, repo = match.group(1), match.group(2)

    # Sanitize: prevent path traversal
    if ".." in owner or ".." in repo:
        raise ValueError("Invalid repository path")

    return owner, repo


def _check_ssrf_dns(hostname: str) -> None:
    """Resolve hostname and block private IP ranges."""
    try:
        addr_infos = socket.getaddrinfo(hostname, None)
        for _, _, _, _, sockaddr in addr_infos:
            ip_str = sockaddr[0]
            try:
                ip = ipaddress.ip_address(ip_str)
                for network in BLOCKED_NETWORKS:
                    if ip in network:
                        raise ValueError(f"Resolved IP {ip_str} is in a blocked private range")
            except ValueError as e:
                if "blocked" in str(e):
                    raise
    except socket.gaierror:
        raise ValueError(f"Cannot resolve hostname: {hostname}")


# ── Clone Service ─────────────────────────────────────────────────────────────

class RepoCloner:
    """Secure, sandboxed GitHub repository cloner."""

    def __init__(self):
        self.base_dir = Path(settings.TEMP_CLONE_DIR)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _get_workspace_path(self, analysis_id: str) -> Path:
        """Return isolated workspace path for this analysis."""
        safe_id = hashlib.sha256(analysis_id.encode()).hexdigest()[:16]
        return self.base_dir / safe_id

    async def clone(
        self,
        repo_url: str,
        analysis_id: str,
        github_token: Optional[str] = None,
        progress_callback=None,
    ) -> Path:
        """
        Clone repository into isolated workspace.
        Returns path to cloned repo directory.
        """
        owner, repo = validate_github_url(repo_url)
        workspace = self._get_workspace_path(analysis_id)
        workspace.mkdir(parents=True, exist_ok=True)
        clone_path = workspace / "repo"

        # Build authenticated URL if token provided
        if github_token:
            clone_url = f"https://{github_token}@github.com/{owner}/{repo}.git"
        else:
            clone_url = f"https://github.com/{owner}/{repo}.git"

        logger.info(f"Cloning {owner}/{repo} → {clone_path}")

        if progress_callback:
            await progress_callback(10, "Cloning repository...")

        try:
            # Shallow clone — depth=1 for speed, no full history needed
            proc = await asyncio.create_subprocess_exec(
                "git", "clone",
                "--depth", "1",
                "--single-branch",
                "--no-tags",
                "--filter=blob:limit=5m",  # Skip large binary files
                clone_url,
                str(clone_path),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env={
                    **os.environ,
                    "GIT_TERMINAL_PROMPT": "0",
                    "GIT_ASKPASS": "echo",
                    "HOME": str(workspace),
                },
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(),
                    timeout=settings.CLONE_TIMEOUT_SECONDS,
                )
            except asyncio.TimeoutError:
                proc.kill()
                raise TimeoutError(f"Repository clone timed out after {settings.CLONE_TIMEOUT_SECONDS}s")

            if proc.returncode != 0:
                err = stderr.decode("utf-8", errors="replace")
                if "Repository not found" in err or "not found" in err.lower():
                    raise ValueError("Repository not found or is private. Connect GitHub account for private repos.")
                raise RuntimeError(f"Clone failed: {err[:500]}")

        except Exception:
            self.cleanup(analysis_id)
            raise

        # Validate clone size (ZIP bomb protection)
        repo_size = await self._get_dir_size(clone_path)
        if repo_size > MAX_REPO_SIZE_BYTES:
            self.cleanup(analysis_id)
            raise ValueError(
                f"Repository too large: {repo_size / 1024 / 1024:.1f}MB "
                f"(max: {settings.MAX_REPO_SIZE_MB}MB)"
            )

        if progress_callback:
            await progress_callback(25, f"Cloned successfully ({repo_size / 1024 / 1024:.1f}MB)")

        logger.info(f"✅ Cloned {owner}/{repo} ({repo_size / 1024 / 1024:.1f}MB)")
        return clone_path

    async def _get_dir_size(self, path: Path) -> int:
        """Calculate total directory size efficiently."""
        total = 0
        try:
            for entry in path.rglob("*"):
                if entry.is_file() and not entry.is_symlink():
                    try:
                        total += entry.stat().st_size
                    except (OSError, PermissionError):
                        pass
        except Exception as e:
            logger.warning(f"Size calculation error: {e}")
        return total

    def cleanup(self, analysis_id: str) -> None:
        """Securely remove cloned workspace."""
        workspace = self._get_workspace_path(analysis_id)
        if workspace.exists():
            shutil.rmtree(workspace, ignore_errors=True)
            logger.info(f"🗑️  Cleaned up workspace for {analysis_id}")

    async def get_file_tree(self, clone_path: Path, max_files: int = 5000) -> list[dict]:
        """Return file tree as structured list, excluding binary/generated files."""
        SKIP_DIRS = {
            ".git", "node_modules", "__pycache__", ".venv", "venv",
            "dist", "build", ".next", ".nuxt", "target", "vendor",
            ".gradle", "Pods", ".dart_tool", "coverage", ".nyc_output",
        }
        SKIP_EXTENSIONS = {
            ".jpg", ".jpeg", ".png", ".gif", ".svg", ".ico", ".webp",
            ".woff", ".woff2", ".ttf", ".eot", ".otf",
            ".mp4", ".mp3", ".mov", ".avi", ".wav",
            ".zip", ".tar", ".gz", ".rar", ".7z",
            ".exe", ".dll", ".so", ".dylib",
            ".pdf", ".psd", ".ai", ".sketch",
            ".lock",  # package-lock.json etc
        }

        files = []
        count = 0

        for path in clone_path.rglob("*"):
            if count >= max_files:
                break

            # Skip hidden and generated directories
            parts = path.relative_to(clone_path).parts
            if any(p.startswith(".") or p in SKIP_DIRS for p in parts):
                continue

            if path.is_file():
                ext = path.suffix.lower()
                if ext in SKIP_EXTENSIONS:
                    continue

                try:
                    size = path.stat().st_size
                    files.append({
                        "path": str(path.relative_to(clone_path)),
                        "size": size,
                        "extension": ext,
                    })
                    count += 1
                except (OSError, PermissionError):
                    continue

        return files


# Singleton
repo_cloner = RepoCloner()
