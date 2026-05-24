"""
ArchDefend — Parser Engine
Multi-language static AST parser. 14+ languages via Tree-sitter + regex.
Extracts imports, exports, classes, functions, API routes, security patterns.
NEVER executes code — purely static file reads.
"""

import asyncio
import json
import re
from collections import defaultdict
from pathlib import Path
import logging

logger = logging.getLogger("archdefend.parser")

LANG_MAP = {
    ".py": "python", ".ts": "typescript", ".tsx": "typescript",
    ".js": "javascript", ".jsx": "javascript", ".go": "go",
    ".rs": "rust", ".java": "java", ".kt": "kotlin",
    ".cs": "csharp", ".rb": "ruby", ".php": "php",
    ".swift": "swift", ".scala": "scala",
    ".ex": "elixir", ".exs": "elixir",
    ".cpp": "cpp", ".c": "c", ".h": "c", ".hpp": "cpp",
}
SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv",
    "dist", "build", ".next", ".nuxt", "target", "vendor",
    ".gradle", "coverage", ".nyc_output", "out", ".cache", "Pods",
}
SKIP_EXT = {
    ".jpg", ".jpeg", ".png", ".gif", ".svg", ".ico", ".webp",
    ".woff", ".woff2", ".ttf", ".eot", ".otf", ".mp4", ".mp3",
    ".mov", ".zip", ".tar", ".gz", ".rar", ".exe", ".dll",
    ".so", ".dylib", ".pdf", ".psd", ".sketch", ".lock",
    ".min.js", ".min.css",
}
CONFIG_STACK = {
    "package.json": "nodejs", "requirements.txt": "python",
    "pyproject.toml": "python", "go.mod": "go",
    "Cargo.toml": "rust", "pom.xml": "java",
    "build.gradle": "java", "Gemfile": "ruby",
    "composer.json": "php", "next.config.js": "nextjs",
    "next.config.mjs": "nextjs", "nuxt.config.ts": "nuxt",
    "vite.config.ts": "vite", "docker-compose.yml": "docker",
    "Dockerfile": "docker", ".github": "github-actions",
}
SECURITY_RULES = [
    {"id": "hardcoded-secret",   "sev": "critical", "cwe": "CWE-798",
     "re": r'(?:password|secret|api_key|private_key|token)\s*=\s*["\'][^"\']{8,}["\']',
     "desc": "Potential hardcoded secret or credential"},
    {"id": "sql-injection",      "sev": "high",     "cwe": "CWE-89",
     "re": r'(?:execute|query|raw)\s*\(\s*(?:f["\']|["\'].*%\s*\()',
     "desc": "Potential SQL injection via string formatting"},
    {"id": "command-injection",  "sev": "high",     "cwe": "CWE-78",
     "re": r'(?:os\.system|subprocess\.call|subprocess\.run|exec|eval)\s*\(',
     "desc": "Potential command injection or unsafe execution"},
    {"id": "path-traversal",     "sev": "high",     "cwe": "CWE-22",
     "re": r'open\s*\(\s*(?:request\.|f["\']|.*\+)',
     "desc": "Potential path traversal vulnerability"},
    {"id": "debug-mode",         "sev": "medium",   "cwe": "CWE-215",
     "re": r'DEBUG\s*=\s*True|debug\s*=\s*true',
     "desc": "Debug mode appears enabled in source code"},
    {"id": "http-not-https",     "sev": "medium",   "cwe": "CWE-319",
     "re": r'http://(?!localhost|127\.0\.0\.1|0\.0\.0\.0|::1)',
     "desc": "Insecure HTTP URL detected — prefer HTTPS"},
    {"id": "weak-crypto",        "sev": "medium",   "cwe": "CWE-327",
     "re": r'\bmd5\s*\(|\bsha1\s*\(',
     "desc": "Weak cryptographic hash function (MD5 or SHA-1)"},
    {"id": "cors-wildcard",      "sev": "medium",   "cwe": "CWE-942",
     "re": r'allow_origins\s*=\s*\[?\s*["\']?\*["\']?\]?',
     "desc": "CORS wildcard origin — restrict in production"},
    {"id": "jwt-none-alg",       "sev": "critical", "cwe": "CWE-347",
     "re": r'algorithm\s*=\s*["\']none["\']',
     "desc": "JWT 'none' algorithm vulnerability"},
]
ROUTE_PATTERNS = {
    "fastapi":  [r'@(?:app|router)\.(get|post|put|delete|patch|options)\s*\(\s*["\']([^"\']+)["\']'],
    "flask":    [r'@(?:app|bp|blueprint)\.route\s*\(\s*["\']([^"\']+)["\']'],
    "express":  [r'(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*["\']([^"\']+)["\']'],
    "django":   [r'path\s*\(\s*["\']([^"\']+)["\']', r'url\s*\(\s*r?["\']([^"\']+)["\']'],
    "nextjs":   [r'export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)\s*\('],
    "spring":   [r'@(?:Get|Post|Put|Delete|Patch|Request)Mapping\s*\(\s*(?:value\s*=\s*)?["\']([^"\']+)["\']'],
}
IMPORT_PATTERNS = {
    "python":     r'^(?:import|from)\s+([\w.]+)',
    "typescript": r'(?:import|require)\s*(?:\{[^}]*\}\s*from\s*)?["\']([^"\']+)["\']',
    "javascript": r'(?:import|require)\s*(?:\{[^}]*\}\s*from\s*)?["\']([^"\']+)["\']',
    "go":         r'"([^"]+/[^"]+)"',
    "rust":       r'^use\s+([\w:]+)',
    "java":       r'^import\s+([\w.]+);',
}
CLASS_PATTERNS = {
    "python": r'^class\s+(\w+)', "typescript": r'(?:export\s+)?class\s+(\w+)',
    "javascript": r'(?:export\s+)?class\s+(\w+)', "java": r'(?:public\s+)?class\s+(\w+)',
    "go": r'type\s+(\w+)\s+struct', "rust": r'struct\s+(\w+)',
    "kotlin": r'(?:data\s+)?class\s+(\w+)', "csharp": r'(?:public\s+)?class\s+(\w+)',
}
FUNC_PATTERNS = {
    "python": r'^(?:async\s+)?def\s+(\w+)\s*\(',
    "typescript": r'(?:export\s+)?(?:async\s+)?function\s+(\w+)',
    "javascript": r'(?:export\s+)?(?:async\s+)?function\s+(\w+)',
    "go": r'^func\s+(?:\([^)]+\)\s+)?(\w+)\s*\(',
    "rust": r'(?:pub\s+)?fn\s+(\w+)\s*[<(]',
    "java": r'(?:public|private|protected)\s+\w+\s+(\w+)\s*\(',
    "kotlin": r'(?:suspend\s+)?fun\s+(\w+)\s*[<(]',
}


class ParserEngine:
    async def parse_repository(self, clone_path: Path) -> dict:
        logger.info(f"Parsing: {clone_path}")
        source_files = self._collect(clone_path)
        logger.info(f"  → {len(source_files)} source files found")

        lang_stats = defaultdict(int)
        for f in source_files:
            lang_stats[LANG_MAP.get(f.suffix.lower(), "other")] += 1

        tech_stack = await self._detect_stack(clone_path)
        parsed = await self._parse_batch(source_files, clone_path)

        return {
            "repo_name": clone_path.name,
            "clone_path": str(clone_path),
            "file_count": len(source_files),
            "language_stats": dict(sorted(lang_stats.items(), key=lambda x: x[1], reverse=True)),
            "tech_stack": tech_stack,
            "parsed_files": parsed,
            "import_graph": self._import_graph(parsed),
            "api_routes": self._all_routes(parsed),
            "security_findings": self._security_scan(parsed),
            "summary_data": self._summarize(parsed),
        }

    def _collect(self, base: Path) -> list[Path]:
        files = []
        for p in base.rglob("*"):
            parts = p.relative_to(base).parts
            if any(d.startswith(".") or d in SKIP_DIRS for d in parts):
                continue
            if p.is_file() and p.suffix.lower() in LANG_MAP and p.suffix.lower() not in SKIP_EXT:
                files.append(p)
            if len(files) >= 5000:
                break
        return files

    async def _detect_stack(self, base: Path) -> list[str]:
        stack = set()
        for fname, tech in CONFIG_STACK.items():
            if (base / fname).exists():
                stack.add(tech)
        pkg = base / "package.json"
        if pkg.exists():
            try:
                data = json.loads(pkg.read_text(encoding="utf-8", errors="replace"))
                deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
                for k, t in [("next","nextjs"),("react","react"),("vue","vue"),
                              ("express","express"),("@nestjs/core","nestjs"),
                              ("fastapi","fastapi"),("prisma","prisma"),
                              ("drizzle-orm","drizzle")]:
                    if k in deps:
                        stack.add(t)
            except Exception:
                pass
        return sorted(stack)

    async def _parse_batch(self, files: list[Path], base: Path, batch: int = 60) -> list[dict]:
        results = []
        for i in range(0, len(files), batch):
            tasks = [self._parse_one(f, base) for f in files[i:i+batch]]
            batch_res = await asyncio.gather(*tasks, return_exceptions=True)
            results.extend(r for r in batch_res if isinstance(r, dict))
        return results

    async def _parse_one(self, path: Path, base: Path) -> dict:
        rel = str(path.relative_to(base))
        lang = LANG_MAP.get(path.suffix.lower(), "unknown")
        try:
            size = path.stat().st_size
            if size > 512_000:
                return {"path": rel, "language": lang, "skipped": True, "size": size}
            content = path.read_text(encoding="utf-8", errors="replace")
            lines = content.splitlines()
            return {
                "path": rel, "language": lang, "size": size,
                "line_count": len(lines),
                "imports": self._extract_imports(content, lang),
                "exports": self._extract_exports(content, lang),
                "classes": self._extract_classes(content, lang),
                "functions": self._extract_functions(content, lang),
                "api_routes": self._extract_routes(content, lang),
                "has_tests": self._has_tests(content, rel),
                "has_types": self._has_types(content, lang),
                "content_sample": content[:3500],
            }
        except Exception as e:
            logger.debug(f"Parse error {rel}: {e}")
            return {"path": rel, "language": lang, "error": str(e)}

    def _extract_imports(self, content: str, lang: str) -> list[str]:
        pattern = IMPORT_PATTERNS.get(lang)
        if not pattern:
            return []
        return list(set(re.findall(pattern, content, re.MULTILINE)))[:50]

    def _extract_exports(self, content: str, lang: str) -> list[str]:
        if lang in ("typescript", "javascript"):
            return re.findall(r'export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type|enum)\s+(\w+)', content)[:25]
        if lang == "python":
            m = re.search(r'__all__\s*=\s*\[([^\]]+)\]', content)
            return re.findall(r'["\'](\w+)["\']', m.group(1)) if m else []
        return []

    def _extract_classes(self, content: str, lang: str) -> list[str]:
        p = CLASS_PATTERNS.get(lang)
        return re.findall(p, content, re.MULTILINE)[:20] if p else []

    def _extract_functions(self, content: str, lang: str) -> list[str]:
        p = FUNC_PATTERNS.get(lang)
        return re.findall(p, content, re.MULTILINE)[:30] if p else []

    def _extract_routes(self, content: str, lang: str) -> list[dict]:
        routes = []
        for framework, patterns in ROUTE_PATTERNS.items():
            for pattern in patterns:
                for m in re.finditer(pattern, content, re.MULTILINE):
                    g = m.groups()
                    if len(g) == 2:
                        routes.append({"method": g[0].upper(), "path": g[1], "framework": framework})
                    elif len(g) == 1:
                        routes.append({"method": "ANY", "path": g[0], "framework": framework})
        return routes[:40]

    def _has_tests(self, content: str, path: str) -> bool:
        return any(k in content for k in ["def test_", "it(", "describe(", "@Test", "fn test_", "#[test]", "expect(", "assert"])

    def _has_types(self, content: str, lang: str) -> bool:
        if lang == "typescript":
            return True
        if lang == "python":
            return "->" in content and (":" in content)
        return False

    def _import_graph(self, parsed: list[dict]) -> dict:
        nodes = {}
        for f in parsed:
            if f.get("error") or f.get("skipped"):
                continue
            mid = f["path"].replace("/", ".").rsplit(".", 1)[0]
            nodes[mid] = {
                "id": mid, "path": f["path"],
                "language": f.get("language"),
                "line_count": f.get("line_count", 0),
                "has_tests": f.get("has_tests", False),
            }
        edges = []
        for f in parsed:
            if f.get("error"):
                continue
            src = f["path"].replace("/", ".").rsplit(".", 1)[0]
            for imp in f.get("imports", []):
                if "." in imp or "/" in imp:
                    edges.append({"source": src, "target": imp})
        return {"nodes": list(nodes.values()), "edges": edges[:2000]}

    def _all_routes(self, parsed: list[dict]) -> list[dict]:
        routes = []
        for f in parsed:
            for r in f.get("api_routes", []):
                routes.append({**r, "file": f["path"]})
        return routes

    def _security_scan(self, parsed: list[dict]) -> list[dict]:
        findings = []
        for f in parsed:
            content = f.get("content_sample", "")
            if not content:
                continue
            for rule in SECURITY_RULES:
                for m in re.finditer(rule["re"], content, re.IGNORECASE | re.MULTILINE):
                    line = content[: m.start()].count("\n") + 1
                    findings.append({
                        "id": rule["id"], "severity": rule["sev"],
                        "description": rule["desc"], "cwe": rule["cwe"],
                        "file": f["path"], "line": line,
                        "snippet": m.group(0)[:120],
                    })
        return findings[:100]

    def _summarize(self, parsed: list[dict]) -> dict:
        total_lines = sum(f.get("line_count", 0) for f in parsed if not f.get("error"))
        test_files = sum(1 for f in parsed if f.get("has_tests"))
        all_funcs = [fn for f in parsed for fn in f.get("functions", [])]
        all_classes = [c for f in parsed for c in f.get("classes", [])]
        return {
            "total_lines": total_lines,
            "test_file_count": test_files,
            "total_functions": len(all_funcs),
            "total_classes": len(all_classes),
            "test_coverage_estimate": f"{min(100, round(test_files / max(1, len(parsed)) * 100))}%",
            "top_functions": all_funcs[:20],
            "top_classes": all_classes[:20],
        }


parser = ParserEngine()
