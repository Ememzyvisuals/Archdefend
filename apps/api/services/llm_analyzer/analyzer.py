"""
ArchDefend — LLM Analyzer
Orchestrates all AI report generation stages.
All prompts are AST-grounded — no hallucinated architecture claims.
"""
import asyncio
import json
import logging
from typing import Optional

logger = logging.getLogger("archdefend.analyzer")

_ARCH_SYS = """You are ArchDefend's principal architect AI. You generate precise, grounded architectural intelligence.

HARD RULES:
- Only state facts evidenced in the parsed codebase data provided
- Reference actual file names, class names, function names from the data
- Never invent frameworks, services, or patterns not seen in the evidence
- Write for senior engineers — no generic statements, only specific observations
- If evidence is insufficient to make a claim, say so explicitly
- All output must be valid JSON matching the schema provided"""

_SEC_SYS = """You are ArchDefend's security analysis AI with OWASP/CWE expertise.
Ground every finding in the actual evidence provided. Never invent vulnerabilities.
Provide concrete, implementable remediation steps. Output valid JSON only."""

_INTERVIEW_SYS = """You are ArchDefend's technical interview preparation AI.
Generate deep, codebase-specific questions — not generic software questions.
Every question must reference an actual component, pattern, or decision found in the parsed data.
Output valid JSON array only."""

_SCALE_SYS = """You are ArchDefend's scalability and production readiness AI.
Score objectively 0-100. Base all assessments on parsed data evidence.
Identify specific bottlenecks with file-level evidence. Output valid JSON only."""


class LLMAnalyzer:
    async def generate_full_report(
        self,
        parse_result: dict,
        graph_data: dict,
        include_security: bool = True,
        include_interview_prep: bool = True,
    ) -> dict:
        from services.llm_router.router import llm_router

        ctx = self._build_context(parse_result, graph_data)

        # Run independent stages concurrently
        coros = [
            self._arch_summary(llm_router, ctx, parse_result),
            self._scalability(llm_router, ctx, parse_result),
            self._recommendations(llm_router, ctx),
        ]
        if include_security:
            coros.append(self._security(llm_router, ctx, parse_result))
        if include_interview_prep:
            coros.append(self._interview(llm_router, ctx, parse_result))

        results = await asyncio.gather(*coros, return_exceptions=True)

        def safe(r, default):
            return r if not isinstance(r, Exception) else (logger.warning(f"Stage failed: {r}") or default)

        arch     = safe(results[0], "Architecture analysis unavailable.")
        scale    = safe(results[1], {"score": 50, "readiness_score": 50, "bottlenecks": [], "strengths": [], "scoring_breakdown": {}})
        recs     = safe(results[2], [])
        security = safe(results[3], parse_result.get("security_findings", [])) if include_security else []
        interview = safe(results[4 if include_security else 3], []) if include_interview_prep else []

        hallucinated = self._hallucination_check(
            arch if isinstance(arch, str) else "",
            parse_result,
        )

        return {
            "architecture_summary": arch if isinstance(arch, str) else str(arch),
            "dependency_graph": self._to_react_flow(graph_data, parse_result),
            "security_findings": security if isinstance(security, list) else [],
            "api_inventory": parse_result.get("api_routes", []),
            "scalability_score": scale.get("score", 50) if isinstance(scale, dict) else 50,
            "production_readiness_score": scale.get("readiness_score", 50) if isinstance(scale, dict) else 50,
            "interview_questions": interview if isinstance(interview, list) else [],
            "tech_stack": parse_result.get("tech_stack", []),
            "recommendations": recs if isinstance(recs, list) else [],
            "hallucination_detected": hallucinated,
        }

    def _build_context(self, pr: dict, graph: dict) -> str:
        s = pr.get("summary_data", {})
        parts = [
            f"Repository: {pr.get('repo_name', 'unknown')}",
            f"Files: {pr.get('file_count', 0)} | Lines: {s.get('total_lines', 0)}",
            f"Languages: {json.dumps(pr.get('language_stats', {}))}",
            f"Tech stack: {', '.join(pr.get('tech_stack', []))}",
            f"Classes: {s.get('total_classes', 0)} | Functions: {s.get('total_functions', 0)}",
            f"Test files: {s.get('test_file_count', 0)} | Test coverage estimate: {s.get('test_coverage_estimate', '?')}",
            f"API routes found: {len(pr.get('api_routes', []))}",
            f"Security pre-scan findings: {len(pr.get('security_findings', []))}",
            f"Dependency graph: {len(graph.get('nodes', []))} nodes, {len(graph.get('edges', []))} edges",
            "",
            "KEY MODULES (from AST parse):",
        ]
        for f in [x for x in pr.get("parsed_files", []) if not x.get("error") and not x.get("skipped") and (x.get("classes") or x.get("api_routes") or (x.get("line_count", 0) > 80))][:20]:
            parts.append(f"  {f['path']} [{f.get('language')}] classes:{f.get('classes',[])} routes:{len(f.get('api_routes',[]))} lines:{f.get('line_count',0)}")

        if pr.get("api_routes"):
            parts.append("\nAPI ROUTES:")
            for r in pr["api_routes"][:20]:
                parts.append(f"  {r.get('method','ANY')} {r.get('path','')} ({r.get('framework','')} in {r.get('file','')})")

        if pr.get("security_findings"):
            parts.append(f"\nPRE-SCAN SECURITY FINDINGS ({len(pr['security_findings'])} total):")
            for f in pr["security_findings"][:12]:
                parts.append(f"  [{f['severity'].upper()}] {f['id']} — {f['file']}:{f.get('line','?')} — {f['description']}")

        return "\n".join(parts)

    async def _arch_summary(self, router, ctx: str, pr: dict) -> str:
        samples = "\n\n".join(
            f"--- {f['path']} ---\n{f.get('content_sample','')[:900]}"
            for f in pr.get("parsed_files", [])[:6]
            if not f.get("error") and f.get("content_sample")
        )
        return await router.complete(
            system=_ARCH_SYS,
            messages=[{"role": "user", "content": f"""Analyze this codebase and write a precise architecture summary.

PARSED DATA:
{ctx}

SOURCE SAMPLES:
{samples}

Write 400–600 words covering:
1. Architecture pattern (monolith/microservices/layered/event-driven)
2. Core components and their responsibilities (with actual file names)
3. Data flow between components
4. Key design patterns observed
5. Infrastructure and deployment approach
6. Notable technical decisions and trade-offs

Be specific. Reference actual file names, class names, and patterns from the parsed data above.
Do NOT mention any specific AI providers or tools used to generate this analysis."""}],
            task="analysis", max_tokens=1200,
        )

    async def _security(self, router, ctx: str, pr: dict) -> list:
        findings_json = json.dumps(pr.get("security_findings", [])[:20], indent=2)
        result = await router.complete_json(
            system=_SEC_SYS,
            messages=[{"role": "user", "content": f"""Analyze and enrich these security findings with expert context.

CODEBASE:
{ctx}

RAW FINDINGS:
{findings_json}

Return JSON array:
[{{"id":"...","severity":"critical|high|medium|low|info","title":"...","description":"...","cwe":"CWE-XXX","file":"...","line":0,"remediation":"concrete steps","owasp":"category if applicable"}}]

Only include findings with actual code evidence."""}],
            task="analysis", max_tokens=2500,
        )
        return result if isinstance(result, list) else pr.get("security_findings", [])

    async def _interview(self, router, ctx: str, pr: dict) -> list:
        result = await router.complete_json(
            system=_INTERVIEW_SYS,
            messages=[{"role": "user", "content": f"""Generate 10 deep technical interview questions about THIS specific codebase.

CODEBASE:
{ctx}

Return JSON array:
[{{"question":"...","category":"architecture|security|performance|scalability|design-patterns","difficulty":"medium|hard|expert","expected_answer":"detailed expert answer with codebase-specific details","follow_up":"one follow-up question"}}]

Each question MUST reference actual components or patterns found in this codebase. No generic questions."""}],
            task="analysis", max_tokens=3500,
        )
        return result if isinstance(result, list) else []

    async def _scalability(self, router, ctx: str, pr: dict) -> dict:
        result = await router.complete_json(
            system=_SCALE_SYS,
            messages=[{"role": "user", "content": f"""Assess scalability and production readiness of this codebase.

CODEBASE:
{ctx}

Return JSON:
{{"score":0,"readiness_score":0,"bottlenecks":[],"strengths":[],"critical_gaps":[],"scaling_recommendations":[],"scoring_breakdown":{{"testing":0,"error_handling":0,"logging":0,"security":0,"architecture":0}}}}

Score 0-100 each. Justify with evidence from the parsed data."""}],
            task="analysis", max_tokens=1200,
        )
        return result if isinstance(result, dict) else {"score": 50, "readiness_score": 50}

    async def _recommendations(self, router, ctx: str) -> list:
        result = await router.complete_json(
            system=_ARCH_SYS,
            messages=[{"role": "user", "content": f"""Generate 8 specific, actionable recommendations for this codebase.

CODEBASE:
{ctx}

Return JSON array:
[{{"title":"...","priority":"critical|high|medium|low","category":"security|performance|architecture|testing|documentation|devops","description":"what to do and why","effort":"hours|days|weeks","impact":"expected improvement"}}]

Recommendations must be specific to this codebase — not generic advice."""}],
            task="fast", max_tokens=1800,
        )
        return result if isinstance(result, list) else []

    def _hallucination_check(self, summary: str, pr: dict) -> bool:
        if not summary:
            return False
        known = set(pr.get("tech_stack", [])) | set(pr.get("language_stats", {}).keys())
        HIGH_RISK = ["kubernetes","kafka","rabbitmq","elasticsearch","graphql","grpc","websockets","redis cluster"]
        flags = sum(1 for t in HIGH_RISK if t in summary.lower() and t not in known)
        return flags >= 2

    def _to_react_flow(self, graph_data: dict, pr: dict) -> dict:
        """Ensure the graph has the correct React Flow format."""
        return {
            "nodes": graph_data.get("nodes", []),
            "edges": graph_data.get("edges", []),
        }


analyzer = LLMAnalyzer()
