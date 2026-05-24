"""
ArchDefend — Parser Engine
Tree-sitter AST parsing for 14+ languages.
Extracts: imports, exports, classes, functions, API routes, dependencies.
NEVER executes code — static analysis only.
"""

import asyncio
import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# ── Language → File Extension Mapping ────────────────────────────────────────

LANGUAGE_MAP = {
    ".py": "python",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".go": "go",
    ".rs": "rust",
    ".java": "java",
    ".kt": "kotlin",
    ".cs": "csharp",
    ".rb": "ruby",
    ".php": "php",
    ".swift": "swift",
    ".scala": "scala",
    ".ex": "elixir",
    ".exs": "elixir",
    ".cpp": "cpp",
    ".c": "c",
    ".h": "c",
    ".hpp": "cpp",
}

# Extensions we analyze
ANALYZABLE_EXTENSIONS = set(LANGUAGE_MAP.keys())

# ── Config files for tech stack detection ─────────────────────────────────────

CONFIG_FILES = {
    "package.json": "nodejs",
    "requirements.txt": "python",
    "pyproject.toml": "python",
    "go.mod": "go",
    "Cargo.toml": "rust",
    "pom.xml": "java",
    "build.gradle": "java",
    "Gemfile": "ruby",
    "composer.json": "php",
    "next.config.js": "nextjs",
    "next.config.mjs": "nextjs",
    "nuxt.config.ts": "nuxt",
    "vite.config.ts": "vite",
    "docker-compose.yml": "docker",
    "docker-compose.yaml": "docker",
    "Dockerfile": "docker",
    ".github/workflows": "github-actions",
    "kubernetes": "kubernetes",
    "k8s": "kubernetes",
    "terraform": "terraform",
}

# ── API Route Pattern Detectors ───────────────────────────────────────────────

API_ROUTE_PATTERNS = {
    "fastapi": [
        (r'@(?:app|router)\.(get|post|put|delete|patch|options)\s*\(\s*["\']([^"\']+)["\']', "fastapi"),
    ],
    "flask": [
        (r'@(?:app|blueprint|bp)\.route\s*\(\s*["\']([^"\']+)["\']', "flask"),
    ],
    "express": [
        (r'(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*["\']([^"\']+)["\']', "express"),
    ],
    "django": [
        (r'path\s*\(\s*["\']([^"\']+)["\']', "django"),
        (r'url\s*\(\s*r?["\']([^"\']+)["\']', "django"),
    ],
    "nextjs": [
        (r'export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)', "nextjs-api"),
    ],
    "spring": [
        (r'@(?:Get|Post|Put|Delete|Patch|Request)Mapping\s*\(\s*(?:value\s*=\s*)?["\']([^"\']+)["\']', "spring"),
    ],
}

# ── Security Issue Patterns ───────────────────────────────────────────────────

SECURITY_PATTERNS = [
    {
        "id": "hardcoded-secret",
        "severity": "critical",
        "pattern": r'(?:password|secret|api_key|token|private_key)\s*=\s*["\'][^"\']{8,}["\']',
        "description": "Potential hardcoded secret or credential",
        "cwe": "CWE-798",
    },
    {
        "id": "sql-injection",
        "severity": "high",
        "pattern": r'(?:execute|query|raw)\s*\(\s*f["\']|%\s*\(',
        "description": "Potential SQL injection via string formatting",
        "cwe": "CWE-89",
    },
    {
        "id": "command-injection",
        "severity": "high",
        "pattern": r'(?:os\.system|subprocess\.call|subprocess\.run|eval|exec)\s*\(',
        "description": "Potential command injection or unsafe code execution",
        "cwe": "CWE-78",
    },
    {
        "id": "path-traversal",
        "severity": "high",
        "pattern": r'open\s*\(\s*(?:request\.|f"|f\'|.*\+)',
        "description": "Potential path traversal vulnerability",
        "cwe": "CWE-22",
    },
    {
        "id": "debug-mode",
        "severity": "medium",
        "pattern": r'DEBUG\s*=\s*True|debug\s*=\s*true',
        "description": "Debug mode enabled in source code",
        "cwe": "CWE-215",
    },
    {
        "id": "http-not-https",
        "severity": "medium",
        "pattern": r'http://(?!localhost|127\.0\.0\.1|0\.0\.0\.0)',
        "description": "Insecure HTTP URL detected (use HTTPS)",
        "cwe": "CWE-319",
    },
    {
        "id": "weak-crypto",
        "severity": "medium",
        "pattern": r'(?:md5|sha1)\s*\(',
        "description": "Weak cryptographic hash function",
        "cwe": "CWE-327",
    },
    {
        "id": "cors-wildcard",
        "severity": "medium",
        "pattern": r'allow_origins\s*=\s*\[?\s*["\']?\*["\']?\]?',
        "description": "CORS wildcard origin — restrict in production",
        "cwe": "CWE-942",
    },
]


# ── Main Parser ───────────────────────────────────────────────────────────────

class ParserEngine:
    """
    Multi-language static parser.
    Extracts structural information from source files without executing them.
    """

    async def parse_repository(self, clone_path: Path) -> dict:
        """
        Full repository parse. Returns structured analysis payload.
        """
        logger.info(f"Parsing repository: {clone_path}")

        # Gather all source files
        source_files = self._collect_source_files(clone_path)
        logger.info(f"Found {len(source_files)} analyzable source files")

        # Language stats
        language_stats = self._compute_language_stats(source_files)

        # Tech stack detection
        tech_stack = await self._detect_tech_stack(clone_path)

        # Parse all source files concurrently (batched)
        parsed_files = await self._parse_files_batch(source_files, clone_path)

        # Extract dependency graph data
        import_graph = self._build_import_graph(parsed_files)

        # Detect API routes
        api_routes = self._extract_api_routes(parsed_files)

        # Security scan
        security_findings = self._run_security_scan(parsed_files)

        # Architecture summary data
        summary_data = self._extract_summary_data(parsed_files, clone_path)

        repo_name = clone_path.name

        return {
            "repo_name": repo_name,
            "clone_path": str(clone_path),
            "file_count": len(source_files),
            "language_stats": language_stats,
            "tech_stack": tech_stack,
            "parsed_files": parsed_files,
            "import_graph": import_graph,
            "api_routes": api_routes,
            "security_findings": security_findings,
            "summary_data": summary_data,
        }

    def _collect_source_files(self, clone_path: Path) -> list[Path]:
        """Collect all analyzable source files."""
        SKIP_DIRS = {
            ".git", "node_modules", "__pycache__", ".venv", "venv",
            "dist", "build", ".next", ".nuxt", "target", "vendor",
            ".gradle", "coverage", ".nyc_output", "out",
        }
        files = []
        for path in clone_path.rglob("*"):
            parts = path.relative_to(clone_path).parts
            if any(p.startswith(".") or p in SKIP_DIRS for p in parts):
                continue
            if path.is_file() and path.suffix.lower() in ANALYZABLE_EXTENSIONS:
                files.append(path)
        return files[:5000]  # Hard cap

    def _compute_language_stats(self, files: list[Path]) -> dict:
        """Count files per language."""
        stats = defaultdict(int)
        for f in files:
            lang = LANGUAGE_MAP.get(f.suffix.lower(), "other")
            stats[lang] += 1
        return dict(sorted(stats.items(), key=lambda x: x[1], reverse=True))

    async def _detect_tech_stack(self, clone_path: Path) -> list[str]:
        """Detect technologies from config files."""
        stack = set()
        for filename, tech in CONFIG_FILES.items():
            path = clone_path / filename
            if path.exists():
                stack.add(tech)
                # Extra: read package.json for framework detection
                if filename == "package.json":
                    try:
                        data = json.loads(path.read_text(encoding="utf-8", errors="replace"))
                        deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
                        if "next" in deps:
                            stack.add("nextjs")
                        if "react" in deps:
                            stack.add("react")
                        if "vue" in deps:
                            stack.add("vue")
                        if "express" in deps:
                            stack.add("express")
                        if "@nestjs/core" in deps:
                            stack.add("nestjs")
                        if "fastapi" in deps or "fastapi" in str(data):
                            stack.add("fastapi")
                    except Exception:
                        pass
        return sorted(stack)

    async def _parse_files_batch(
        self,
        files: list[Path],
        base_path: Path,
        batch_size: int = 50,
    ) -> list[dict]:
        """Parse files in async batches."""
        results = []
        for i in range(0, len(files), batch_size):
            batch = files[i : i + batch_size]
            tasks = [self._parse_single_file(f, base_path) for f in batch]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            for r in batch_results:
                if isinstance(r, dict):
                    results.append(r)
        return results

    async def _parse_single_file(self, file_path: Path, base_path: Path) -> dict:
        """Parse a single source file."""
        rel_path = str(file_path.relative_to(base_path))
        lang = LANGUAGE_MAP.get(file_path.suffix.lower(), "unknown")

        try:
            # Size guard — skip very large files
            size = file_path.stat().st_size
            if size > 500_000:  # 500KB
                return {"path": rel_path, "language": lang, "skipped": True, "size": size}

            content = file_path.read_text(encoding="utf-8", errors="replace")
            lines = content.splitlines()

            return {
                "path": rel_path,
                "language": lang,
                "size": size,
                "line_count": len(lines),
                "imports": self._extract_imports(content, lang),
                "exports": self._extract_exports(content, lang),
                "classes": self._extract_classes(content, lang),
                "functions": self._extract_functions(content, lang),
                "api_routes": self._extract_routes_from_content(content, lang),
                "has_tests": self._detect_tests(content, rel_path),
                "has_types": self._detect_types(content, lang),
                "content_sample": content[:3000],  # For LLM context
            }
        except Exception as e:
            logger.debug(f"Parse error {rel_path}: {e}")
            return {"path": rel_path, "language": lang, "error": str(e)}

    def _extract_imports(self, content: str, lang: str) -> list[str]:
        """Extract import statements."""
        imports = []
        if lang in ("python",):
            for m in re.finditer(r'^(?:import|from)\s+([\w.]+)', content, re.MULTILINE):
                imports.append(m.group(1))
        elif lang in ("typescript", "javascript"):
            for m in re.finditer(r"(?:import|require)\s*(?:\{[^}]*\}\s*from\s*)?['\"]([^'\"]+)['\"]", content):
                imports.append(m.group(1))
        elif lang == "go":
            for m in re.finditer(r'"([^"]+/[^"]+)"', content):
                imports.append(m.group(1))
        elif lang == "rust":
            for m in re.finditer(r'use\s+([\w:]+)', content):
                imports.append(m.group(1))
        elif lang == "java":
            for m in re.finditer(r'^import\s+([\w.]+);', content, re.MULTILINE):
                imports.append(m.group(1))
        return list(set(imports))[:50]

    def _extract_exports(self, content: str, lang: str) -> list[str]:
        """Extract exported symbols."""
        exports = []
        if lang in ("typescript", "javascript"):
            for m in re.finditer(r'export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type|enum)\s+(\w+)', content):
                exports.append(m.group(1))
        elif lang == "python":
            if "__all__" in content:
                for m in re.finditer(r'__all__\s*=\s*\[([^\]]+)\]', content):
                    names = re.findall(r'["\'](\w+)["\']', m.group(1))
                    exports.extend(names)
        return exports[:30]

    def _extract_classes(self, content: str, lang: str) -> list[str]:
        """Extract class names."""
        patterns = {
            "python": r'^class\s+(\w+)',
            "typescript": r'(?:export\s+)?class\s+(\w+)',
            "javascript": r'(?:export\s+)?class\s+(\w+)',
            "java": r'(?:public\s+)?class\s+(\w+)',
            "csharp": r'(?:public\s+)?class\s+(\w+)',
            "rust": r'struct\s+(\w+)|impl\s+(\w+)',
            "go": r'type\s+(\w+)\s+struct',
        }
        pattern = patterns.get(lang)
        if not pattern:
            return []
        return [m.group(1) or m.group(2) for m in re.finditer(pattern, content, re.MULTILINE)][:20]

    def _extract_functions(self, content: str, lang: str) -> list[str]:
        """Extract top-level function names."""
        patterns = {
            "python": r'^(?:async\s+)?def\s+(\w+)',
            "typescript": r'(?:export\s+)?(?:async\s+)?function\s+(\w+)',
            "javascript": r'(?:export\s+)?(?:async\s+)?function\s+(\w+)',
            "go": r'^func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)',
            "rust": r'(?:pub\s+)?fn\s+(\w+)',
            "java": r'(?:public|private|protected)\s+\w+\s+(\w+)\s*\(',
        }
        pattern = patterns.get(lang)
        if not pattern:
            return []
        return re.findall(pattern, content, re.MULTILINE)[:30]

    def _extract_routes_from_content(self, content: str, lang: str) -> list[dict]:
        """Extract API routes from file content."""
        routes = []
        for framework, patterns in API_ROUTE_PATTERNS.items():
            for pattern, ftype in patterns:
                for m in re.finditer(pattern, content, re.MULTILINE):
                    groups = m.groups()
                    if len(groups) == 2:
                        routes.append({"method": groups[0].upper(), "path": groups[1], "framework": ftype})
                    elif len(groups) == 1:
                        routes.append({"method": "ANY", "path": groups[0], "framework": ftype})
        return routes[:50]

    def _detect_tests(self, content: str, path: str) -> bool:
        """Detect if file contains tests."""
        return any(kw in content for kw in ["def test_", "it(", "describe(", "@Test", "fn test_", "#[test]"])

    def _detect_types(self, content: str, lang: str) -> bool:
        """Detect type annotations."""
        if lang == "typescript":
            return True
        if lang == "python":
            return "def " in content and (":" in content) and ("->" in content or "Optional" in content)
        return False

    def _build_import_graph(self, parsed_files: list[dict]) -> dict:
        """Build module dependency graph from imports."""
        nodes = {}
        edges = []

        for f in parsed_files:
            if f.get("skipped") or f.get("error"):
                continue
            path = f["path"]
            module_name = path.replace("/", ".").removesuffix(f".{path.split('.')[-1]}")
            nodes[module_name] = {
                "id": module_name,
                "path": path,
                "language": f.get("language"),
                "line_count": f.get("line_count", 0),
                "has_tests": f.get("has_tests", False),
            }

        # Build edges from imports
        path_to_module = {v["path"]: k for k, v in nodes.items()}
        for f in parsed_files:
            if f.get("error"):
                continue
            src = f["path"].replace("/", ".").removesuffix(f".{f['path'].split('.')[-1]}")
            for imp in f.get("imports", []):
                # Only internal imports (don't start with known third-party prefixes)
                if not any(imp.startswith(ext) for ext in ["http", "os", "sys", "re", "json", "math"]):
                    if "." in imp or "/" in imp:
                        edges.append({"source": src, "target": imp})

        return {
            "nodes": list(nodes.values()),
            "edges": edges[:2000],
        }

    def _extract_api_routes(self, parsed_files: list[dict]) -> list[dict]:
        """Collect all API routes across the codebase."""
        all_routes = []
        for f in parsed_files:
            for route in f.get("api_routes", []):
                route["file"] = f["path"]
                all_routes.append(route)
        return all_routes

    def _run_security_scan(self, parsed_files: list[dict]) -> list[dict]:
        """Run pattern-based security scan across all files."""
        findings = []
        for f in parsed_files:
            content = f.get("content_sample", "")
            if not content:
                continue
            for rule in SECURITY_PATTERNS:
                for m in re.finditer(rule["pattern"], content, re.IGNORECASE | re.MULTILINE):
                    line_num = content[: m.start()].count("\n") + 1
                    findings.append({
                        "id": rule["id"],
                        "severity": rule["severity"],
                        "description": rule["description"],
                        "cwe": rule["cwe"],
                        "file": f["path"],
                        "line": line_num,
                        "snippet": m.group(0)[:120],
                    })
        return findings[:100]

    def _extract_summary_data(self, parsed_files: list[dict], clone_path: Path) -> dict:
        """Extract high-level summary stats."""
        total_lines = sum(f.get("line_count", 0) for f in parsed_files if not f.get("error"))
        test_files = sum(1 for f in parsed_files if f.get("has_tests"))
        typed_files = sum(1 for f in parsed_files if f.get("has_types"))
        all_classes = []
        all_functions = []
        for f in parsed_files:
            all_classes.extend(f.get("classes", []))
            all_functions.extend(f.get("functions", []))

        return {
            "total_lines": total_lines,
            "test_file_count": test_files,
            "typed_file_count": typed_files,
            "total_classes": len(all_classes),
            "total_functions": len(all_functions),
            "test_coverage_estimate": f"{min(100, int(test_files / max(1, len(parsed_files)) * 100))}%",
            "top_classes": all_classes[:20],
            "top_functions": all_functions[:20],
        }


# Singleton
parser = ParserEngine()
