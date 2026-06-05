"""
ArchDefend Analysis Engine
Parses repositories using tree-sitter and builds architecture graphs with NetworkX.
"""
from __future__ import annotations
import os
import shutil
import asyncio
import subprocess
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, field
import networkx as nx
import structlog
from config import settings

log = structlog.get_logger()

SUPPORTED_EXTENSIONS = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".rs": "rust",
    ".go": "go",
    ".java": "java",
    ".rb": "ruby",
    ".php": "php",
    ".cs": "csharp",
    ".cpp": "cpp",
    ".c": "c",
    ".swift": "swift",
    ".kt": "kotlin",
}

IGNORE_DIRS = {
    "node_modules", ".git", "__pycache__", ".next", "dist", "build",
    "venv", ".venv", "env", ".env", "coverage", ".pytest_cache",
    "target", "vendor", "Pods", ".gradle",
}

MAX_FILE_SIZE_BYTES = 1_000_000  # 1 MB


@dataclass
class ParsedSymbol:
    symbol_id: str
    name: str
    symbol_type: str
    file_path: str
    line_start: int
    line_end: int
    language: str
    parent: Optional[str] = None
    description: Optional[str] = None
    metadata: dict = field(default_factory=dict)


@dataclass
class ParsedEdge:
    source_id: str
    target_id: str
    edge_type: str
    label: Optional[str] = None
    weight: float = 1.0


@dataclass
class AnalysisResult:
    symbols: list[ParsedSymbol]
    edges: list[ParsedEdge]
    languages: dict[str, int]
    files_parsed: int
    tech_stack: list[str]
    architecture_summary: str
    graph: Optional[nx.DiGraph] = None


async def clone_repository(
    full_name: str,
    access_token: str,
    target_dir: str,
    branch: str = "main",
    timeout: int = 300,
) -> str:
    clone_url = f"https://x-access-token:{access_token}@github.com/{full_name}.git"
    repo_dir = os.path.join(target_dir, full_name.replace("/", "_"))

    if os.path.exists(repo_dir):
        shutil.rmtree(repo_dir)

    os.makedirs(repo_dir, exist_ok=True)

    cmd = [
        "git", "clone",
        "--depth=1",
        f"--branch={branch}",
        "--single-branch",
        clone_url,
        repo_dir,
    ]

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)

        if proc.returncode != 0:
            error_msg = stderr.decode()
            if "Remote branch" in error_msg:
                cmd[3] = "--branch=master"
                proc = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
                if proc.returncode != 0:
                    raise RuntimeError(f"Clone failed: {stderr.decode()}")
            else:
                raise RuntimeError(f"Clone failed: {error_msg}")

        log.info("Repository cloned", repo=full_name, path=repo_dir)
        return repo_dir

    except asyncio.TimeoutError:
        shutil.rmtree(repo_dir, ignore_errors=True)
        raise RuntimeError(f"Clone timed out after {timeout}s")


def _collect_files(repo_dir: str) -> list[tuple[str, str]]:
    """Collect all parseable source files."""
    files = []
    for root, dirs, filenames in os.walk(repo_dir):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for fname in filenames:
            ext = Path(fname).suffix.lower()
            if ext in SUPPORTED_EXTENSIONS:
                fpath = os.path.join(root, fname)
                if os.path.getsize(fpath) <= MAX_FILE_SIZE_BYTES:
                    rel_path = os.path.relpath(fpath, repo_dir)
                    files.append((fpath, rel_path))
    return files


def _parse_python_file(content: str, rel_path: str) -> tuple[list[ParsedSymbol], list[ParsedEdge]]:
    """Parse Python files using ast module."""
    import ast
    symbols = []
    edges = []
    module_id = f"module:{rel_path}"

    try:
        tree = ast.parse(content)
    except SyntaxError:
        return symbols, edges

    module_symbol = ParsedSymbol(
        symbol_id=module_id,
        name=Path(rel_path).stem,
        symbol_type="module",
        file_path=rel_path,
        line_start=1,
        line_end=len(content.splitlines()),
        language="python",
    )
    symbols.append(module_symbol)

    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            class_id = f"class:{rel_path}:{node.name}"
            symbols.append(ParsedSymbol(
                symbol_id=class_id,
                name=node.name,
                symbol_type="class",
                file_path=rel_path,
                line_start=node.lineno,
                line_end=getattr(node, "end_lineno", node.lineno),
                language="python",
                parent=module_id,
            ))
            edges.append(ParsedEdge(source_id=module_id, target_id=class_id, edge_type="contains"))

            for base in node.bases:
                if isinstance(base, ast.Name):
                    edges.append(ParsedEdge(
                        source_id=class_id,
                        target_id=f"class::{base.id}",
                        edge_type="extends",
                        label=base.id,
                    ))

        elif isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef):
            if not any(isinstance(p, ast.ClassDef) for p in ast.walk(tree)):
                func_id = f"function:{rel_path}:{node.name}"
                symbols.append(ParsedSymbol(
                    symbol_id=func_id,
                    name=node.name,
                    symbol_type="function",
                    file_path=rel_path,
                    line_start=node.lineno,
                    line_end=getattr(node, "end_lineno", node.lineno),
                    language="python",
                    parent=module_id,
                ))

        elif isinstance(node, (ast.Import, ast.ImportFrom)):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    edges.append(ParsedEdge(
                        source_id=module_id,
                        target_id=f"module:{alias.name}",
                        edge_type="imports",
                        label=alias.name,
                    ))
            elif node.module:
                edges.append(ParsedEdge(
                    source_id=module_id,
                    target_id=f"module:{node.module}",
                    edge_type="imports",
                    label=node.module,
                ))

    return symbols, edges


def _detect_api_endpoints(content: str, rel_path: str, language: str) -> list[ParsedSymbol]:
    """Detect API endpoint patterns."""
    endpoints = []
    lines = content.splitlines()

    patterns = {
        "python": [
            ("@app.route", "flask"),
            ("@router.get", "fastapi"),
            ("@router.post", "fastapi"),
            ("@router.put", "fastapi"),
            ("@router.delete", "fastapi"),
            ("@app.get", "fastapi"),
            ("@app.post", "fastapi"),
        ],
        "javascript": [
            ("app.get(", "express"),
            ("app.post(", "express"),
            ("router.get(", "express"),
            ("router.post(", "express"),
        ],
        "typescript": [
            ("@Get(", "nestjs"),
            ("@Post(", "nestjs"),
            ("@Put(", "nestjs"),
            ("@Delete(", "nestjs"),
        ],
    }

    lang_patterns = patterns.get(language, [])
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        for pattern, framework in lang_patterns:
            if stripped.startswith(pattern):
                endpoints.append(ParsedSymbol(
                    symbol_id=f"api:{rel_path}:{i}",
                    name=stripped[:80],
                    symbol_type="api_endpoint",
                    file_path=rel_path,
                    line_start=i,
                    line_end=i,
                    language=language,
                    metadata={"framework": framework},
                ))
                break

    return endpoints


def _build_graph(symbols: list[ParsedSymbol], edges: list[ParsedEdge]) -> nx.DiGraph:
    G = nx.DiGraph()
    for sym in symbols:
        G.add_node(sym.symbol_id, **{
            "name": sym.name,
            "type": sym.symbol_type,
            "file_path": sym.file_path,
            "language": sym.language,
            "line_start": sym.line_start,
        })
    for edge in edges:
        if G.has_node(edge.source_id):
            G.add_edge(edge.source_id, edge.target_id, type=edge.edge_type, weight=edge.weight)
    return G


def _detect_circular_dependencies(G: nx.DiGraph) -> list[list[str]]:
    try:
        cycles = list(nx.simple_cycles(G))
        return [c for c in cycles if len(c) > 1][:20]
    except Exception:
        return []


def _compute_layout(G: nx.DiGraph, symbols: list[ParsedSymbol]) -> dict[str, tuple[float, float]]:
    """Compute node positions for React Flow visualization."""
    if len(G.nodes) == 0:
        return {}
    try:
        pos = nx.spring_layout(G, k=2, iterations=50, seed=42)
        scaled = {}
        for node_id, (x, y) in pos.items():
            scaled[node_id] = (float(x) * 800 + 800, float(y) * 600 + 400)
        return scaled
    except Exception:
        return {node: (i * 200, 0) for i, node in enumerate(G.nodes)}


def _infer_tech_stack(languages: dict[str, int], symbols: list[ParsedSymbol]) -> list[str]:
    stack = []
    sorted_langs = sorted(languages.items(), key=lambda x: x[1], reverse=True)
    for lang, count in sorted_langs[:5]:
        if count > 0:
            stack.append(lang.capitalize())

    all_files = " ".join(s.file_path for s in symbols)
    framework_hints = {
        "React": ["jsx", "tsx", "react"],
        "Next.js": ["pages/", "app/", "_app.tsx"],
        "FastAPI": ["fastapi", "APIRouter"],
        "Django": ["django", "models.py", "views.py"],
        "Flask": ["flask", "app.py"],
        "Express": ["express", "app.js"],
        "NestJS": ["nestjs", "nest"],
        "PostgreSQL": ["postgres", "psycopg", "supabase"],
        "Redis": ["redis"],
        "Docker": ["Dockerfile", "docker-compose"],
    }
    for tech, hints in framework_hints.items():
        if any(hint.lower() in all_files.lower() for hint in hints):
            if tech not in stack:
                stack.append(tech)

    return stack[:10]


async def analyze_repository(
    repo_dir: str,
    on_progress=None,
) -> AnalysisResult:
    """Full repository analysis pipeline."""
    files = _collect_files(repo_dir)
    all_symbols: list[ParsedSymbol] = []
    all_edges: list[ParsedEdge] = []
    languages: dict[str, int] = {}
    files_parsed = 0

    total = len(files)
    for i, (abs_path, rel_path) in enumerate(files):
        ext = Path(rel_path).suffix.lower()
        language = SUPPORTED_EXTENSIONS.get(ext, "unknown")
        languages[language] = languages.get(language, 0) + 1

        try:
            with open(abs_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

            if language == "python":
                syms, edges = _parse_python_file(content, rel_path)
                all_symbols.extend(syms)
                all_edges.extend(edges)
            else:
                module_id = f"module:{rel_path}"
                all_symbols.append(ParsedSymbol(
                    symbol_id=module_id,
                    name=Path(rel_path).stem,
                    symbol_type="module",
                    file_path=rel_path,
                    line_start=1,
                    line_end=len(content.splitlines()),
                    language=language,
                ))

            endpoints = _detect_api_endpoints(content, rel_path, language)
            all_symbols.extend(endpoints)
            files_parsed += 1

        except Exception as e:
            log.warning("Failed to parse file", path=rel_path, error=str(e))

        if on_progress and i % 10 == 0:
            pct = int((i / max(total, 1)) * 70) + 10
            await on_progress(pct)

    G = _build_graph(all_symbols, all_edges)
    tech_stack = _infer_tech_stack(languages, all_symbols)
    cycles = _detect_circular_dependencies(G)
    positions = _compute_layout(G, all_symbols)

    for sym in all_symbols:
        if sym.symbol_id in positions:
            sym.metadata["pos_x"], sym.metadata["pos_y"] = positions[sym.symbol_id]

    arch_summary = _generate_architecture_summary(
        repo_dir, languages, all_symbols, all_edges, tech_stack, cycles
    )

    return AnalysisResult(
        symbols=all_symbols,
        edges=all_edges,
        languages=languages,
        files_parsed=files_parsed,
        tech_stack=tech_stack,
        architecture_summary=arch_summary,
        graph=G,
    )


def _generate_architecture_summary(
    repo_dir: str,
    languages: dict,
    symbols: list,
    edges: list,
    tech_stack: list,
    cycles: list,
) -> str:
    primary_lang = max(languages, key=languages.get) if languages else "unknown"
    module_count = sum(1 for s in symbols if s.symbol_type == "module")
    class_count = sum(1 for s in symbols if s.symbol_type == "class")
    function_count = sum(1 for s in symbols if s.symbol_type == "function")
    api_count = sum(1 for s in symbols if s.symbol_type == "api_endpoint")

    return (
        f"Repository contains {module_count} modules, {class_count} classes, "
        f"{function_count} functions, and {api_count} API endpoints. "
        f"Primary language: {primary_lang}. "
        f"Tech stack: {', '.join(tech_stack[:5])}. "
        f"{'Circular dependencies detected: ' + str(len(cycles)) if cycles else 'No circular dependencies detected.'}"
    )
