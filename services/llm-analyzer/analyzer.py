"""
ArchDefend — LLM Analyzer
Generates full architectural intelligence reports using the LLM Router.
All claims are grounded in actual parsed AST data (anti-hallucination).
"""

import json
import logging
from typing import Optional
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../apps/api"))
from services.llm_router.router import llm_router

logger = logging.getLogger(__name__)


# ── System Prompts ────────────────────────────────────────────────────────────

ARCHITECTURE_SYSTEM = """You are ArchDefend's senior principal architect AI.
You analyze real parsed codebase data and generate precise architectural intelligence.

RULES:
- Only state facts grounded in the provided parsed data
- Never invent frameworks, services, or patterns not evidenced in the data
- Be specific: use actual file names, class names, function names from the data
- Write for senior engineers — skip basics, focus on architectural insights
- Format output as valid JSON matching the schema provided
- If something is unclear from the data, say "insufficient data" rather than guess"""

SECURITY_SYSTEM = """You are ArchDefend's security analysis AI with OWASP expertise.
You analyze real security scan findings from static code analysis.

RULES:
- Ground every finding in the actual evidence provided
- Rate severity: critical, high, medium, low, info
- Provide concrete remediation steps
- Reference specific files and line numbers from the scan data
- Format output as valid JSON"""

INTERVIEW_SYSTEM = """You are ArchDefend's technical interview preparation AI.
You generate deep, architecture-specific interview questions from real codebase analysis.

RULES:
- Questions must be specific to THIS codebase, not generic
- Reference actual design decisions, patterns, and trade-offs found in the code
- Include both question and a detailed expert-level answer
- Cover: architecture decisions, scaling, security, performance, trade-offs
- Format output as valid JSON array"""

SCALABILITY_SYSTEM = """You are ArchDefend's scalability and production readiness AI.
You evaluate real codebase architecture for production deployment concerns.

RULES:
- Base all assessments on the actual parsed data
- Score 0-100 with specific justification
- Identify concrete bottlenecks, not generic ones
- Recommend specific improvements with implementation hints
- Format output as valid JSON"""


# ── LLM Analyzer ─────────────────────────────────────────────────────────────

class LLMAnalyzer:
    """
    Orchestrates multi-step LLM analysis pipeline.
    Each step uses grounded data to prevent hallucination.
    """

    async def generate_full_report(
        self,
        parse_result: dict,
        graph_data: dict,
        include_security: bool = True,
        include_interview_prep: bool = True,
    ) -> dict:
        """Generate complete analysis report from parsed data."""

        logger.info(f"Starting LLM analysis for {parse_result.get('repo_name')}")

        # Build context blob (grounded facts — passed to all LLM calls)
        context = self._build_context(parse_result, graph_data)

        # Run analysis stages (some in parallel for speed)
        import asyncio
        tasks = [
            self._generate_architecture_summary(context, parse_result),
            self._generate_tech_stack_analysis(context, parse_result),
            self._generate_recommendations(context, parse_result),
        ]

        if include_security:
            tasks.append(self._generate_security_report(context, parse_result))

        if include_interview_prep:
            tasks.append(self._generate_interview_questions(context, parse_result))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        arch_summary, tech_analysis, recommendations = results[0], results[1], results[2]
        security_report = results[3] if include_security else []
        interview_questions = results[4 if include_security else 3] if include_interview_prep else []

        # Scalability score (sequential, needs arch context)
        scalability_data = await self._generate_scalability_assessment(context, parse_result)

        # Hallucination detection — cross-check LLM output against parsed facts
        hallucination_detected = self._detect_hallucinations(
            arch_summary=arch_summary if isinstance(arch_summary, str) else "",
            parse_result=parse_result,
        )

        # Build dependency graph for frontend
        dependency_graph = self._build_frontend_graph(graph_data, parse_result)

        return {
            "architecture_summary": arch_summary if isinstance(arch_summary, str) else str(arch_summary),
            "dependency_graph": dependency_graph,
            "security_findings": security_report if isinstance(security_report, list) else parse_result.get("security_findings", []),
            "api_inventory": parse_result.get("api_routes", []),
            "scalability_score": scalability_data.get("score", 0) if isinstance(scalability_data, dict) else 0,
            "production_readiness_score": scalability_data.get("readiness_score", 0) if isinstance(scalability_data, dict) else 0,
            "interview_questions": interview_questions if isinstance(interview_questions, list) else [],
            "tech_stack": parse_result.get("tech_stack", []),
            "recommendations": recommendations if isinstance(recommendations, list) else [],
            "hallucination_detected": hallucination_detected,
        }

    def _build_context(self, parse_result: dict, graph_data: dict) -> str:
        """Build grounded context blob for LLM prompts."""
        summary = parse_result.get("summary_data", {})
        lang_stats = parse_result.get("language_stats", {})
        tech_stack = parse_result.get("tech_stack", [])
        api_routes = parse_result.get("api_routes", [])
        security = parse_result.get("security_findings", [])

        # Sample of key files for context
        key_files = [
            f for f in parse_result.get("parsed_files", [])
            if not f.get("error") and not f.get("skipped")
            and (f.get("classes") or f.get("api_routes") or f.get("line_count", 0) > 50)
        ][:20]

        context_parts = [
            f"Repository: {parse_result.get('repo_name', 'unknown')}",
            f"Total files: {parse_result.get('file_count', 0)}",
            f"Languages: {json.dumps(lang_stats)}",
            f"Tech stack: {', '.join(tech_stack)}",
            f"Total lines: {summary.get('total_lines', 0)}",
            f"Classes: {summary.get('total_classes', 0)} | Functions: {summary.get('total_functions', 0)}",
            f"Test files detected: {summary.get('test_file_count', 0)}",
            f"API routes found: {len(api_routes)}",
            f"Security findings: {len(security)} (pre-scan)",
            "",
            "KEY MODULES (from AST parse):",
        ]

        for f in key_files[:15]:
            classes = ", ".join(f.get("classes", [])[:5])
            funcs = ", ".join(f.get("functions", [])[:5])
            routes = len(f.get("api_routes", []))
            context_parts.append(
                f"  {f['path']} [{f.get('language')}] "
                f"classes:[{classes}] funcs:[{funcs}] routes:{routes}"
            )

        if api_routes:
            context_parts.append("\nAPI ROUTES DETECTED:")
            for r in api_routes[:20]:
                context_parts.append(f"  {r.get('method', 'ANY')} {r.get('path')} ({r.get('framework', '?')})")

        if security:
            context_parts.append(f"\nSECURITY FINDINGS ({len(security)} total):")
            for s in security[:10]:
                context_parts.append(
                    f"  [{s['severity'].upper()}] {s['id']} in {s['file']}:{s.get('line', '?')} — {s['description']}"
                )

        graph_nodes = graph_data.get("nodes", [])
        context_parts.append(f"\nDEPENDENCY GRAPH: {len(graph_nodes)} nodes, {len(graph_data.get('edges', []))} edges")

        return "\n".join(context_parts)

    async def _generate_architecture_summary(self, context: str, parse_result: dict) -> str:
        """Generate narrative architecture summary."""
        # Include actual file content samples for grounding
        content_samples = []
        for f in parse_result.get("parsed_files", [])[:5]:
            if f.get("content_sample") and not f.get("error"):
                content_samples.append(f"--- {f['path']} ---\n{f['content_sample'][:800]}")

        samples_str = "\n\n".join(content_samples)

        try:
            return await llm_router.complete(
                system_prompt=ARCHITECTURE_SYSTEM,
                messages=[{
                    "role": "user",
                    "content": f"""Analyze this codebase and write a detailed architecture summary.

GROUNDED FACTS (from AST parser):
{context}

ACTUAL SOURCE CODE SAMPLES:
{samples_str}

Write a 400-600 word architectural analysis covering:
1. System architecture pattern (monolith, microservices, layered, etc.)
2. Core components and their responsibilities
3. Data flow between components
4. Key design patterns observed
5. Infrastructure and deployment approach
6. Notable technical decisions

Be specific — reference actual file names, class names, and patterns found in the data above.
Write in second person ("This codebase uses..."). Do NOT invent anything not evidenced above."""
                }],
                task_type="analysis",
                max_tokens=1024,
            )
        except Exception as e:
            logger.error(f"Architecture summary generation failed: {e}")
            return f"Architecture analysis unavailable: {e}"

    async def _generate_tech_stack_analysis(self, context: str, parse_result: dict) -> dict:
        """Generate tech stack breakdown."""
        try:
            result = await llm_router.complete_json(
                system_prompt=ARCHITECTURE_SYSTEM,
                messages=[{
                    "role": "user",
                    "content": f"""Based on this parsed codebase data, analyze the tech stack.

GROUNDED FACTS:
{context}

Return ONLY valid JSON in this exact schema:
{{
  "frontend": ["list of frontend technologies"],
  "backend": ["list of backend technologies"],
  "database": ["list of databases/ORMs"],
  "infrastructure": ["list of infra tools"],
  "testing": ["list of testing frameworks"],
  "key_dependencies": ["top 10 most critical dependencies"],
  "architecture_pattern": "one of: monolith|microservices|serverless|layered|event-driven|unknown"
}}

Only include technologies evidenced in the parsed data."""
                }],
                task_type="fast",
                max_tokens=512,
            )
            return result
        except Exception as e:
            logger.warning(f"Tech stack analysis failed: {e}")
            return {"architecture_pattern": "unknown"}

    async def _generate_security_report(self, context: str, parse_result: dict) -> list:
        """Generate enriched security findings."""
        raw_findings = parse_result.get("security_findings", [])
        if not raw_findings:
            return []

        findings_str = json.dumps(raw_findings[:20], indent=2)

        try:
            result = await llm_router.complete_json(
                system_prompt=SECURITY_SYSTEM,
                messages=[{
                    "role": "user",
                    "content": f"""Analyze these security findings from static code analysis.

CODEBASE CONTEXT:
{context}

RAW SECURITY FINDINGS (from pattern scanner):
{findings_str}

Return ONLY valid JSON array of enriched findings:
[
  {{
    "id": "finding-id",
    "severity": "critical|high|medium|low|info",
    "title": "short title",
    "description": "detailed description",
    "cwe": "CWE-XXX",
    "file": "file path",
    "line": 42,
    "remediation": "specific steps to fix",
    "owasp": "OWASP category if applicable"
  }}
]

Only include findings with actual evidence from the scan data."""
                }],
                task_type="analysis",
                max_tokens=2048,
            )
            return result if isinstance(result, list) else raw_findings
        except Exception as e:
            logger.warning(f"Security report generation failed: {e}")
            return raw_findings

    async def _generate_interview_questions(self, context: str, parse_result: dict) -> list:
        """Generate architecture-specific interview Q&A."""
        try:
            result = await llm_router.complete_json(
                system_prompt=INTERVIEW_SYSTEM,
                messages=[{
                    "role": "user",
                    "content": f"""Generate 10 deep technical interview questions about this specific codebase.

CODEBASE FACTS:
{context}

Return ONLY valid JSON array:
[
  {{
    "question": "Specific question about THIS codebase's architecture",
    "category": "architecture|security|performance|scalability|design-patterns",
    "difficulty": "medium|hard|expert",
    "expected_answer": "Detailed expert-level answer referencing actual code details",
    "follow_up": "One follow-up question"
  }}
]

Questions MUST reference actual components, files, or patterns found in this codebase.
Do NOT ask generic questions like 'What is REST?'"""
                }],
                task_type="analysis",
                max_tokens=3000,
            )
            return result if isinstance(result, list) else []
        except Exception as e:
            logger.warning(f"Interview question generation failed: {e}")
            return []

    async def _generate_scalability_assessment(self, context: str, parse_result: dict) -> dict:
        """Generate scalability and production readiness scores."""
        summary = parse_result.get("summary_data", {})
        security_count = len(parse_result.get("security_findings", []))
        has_tests = summary.get("test_file_count", 0) > 0

        try:
            result = await llm_router.complete_json(
                system_prompt=SCALABILITY_SYSTEM,
                messages=[{
                    "role": "user",
                    "content": f"""Assess the scalability and production readiness of this codebase.

CODEBASE FACTS:
{context}
Has tests: {has_tests}
Security issues: {security_count}

Return ONLY valid JSON:
{{
  "score": 0-100,
  "readiness_score": 0-100,
  "bottlenecks": ["list of specific bottlenecks found in the code"],
  "strengths": ["list of architectural strengths"],
  "critical_gaps": ["list of production readiness gaps"],
  "scaling_recommendations": ["specific scaling recommendations"],
  "estimated_max_users": "rough estimate based on architecture",
  "scoring_breakdown": {{
    "testing": 0-20,
    "error_handling": 0-20,
    "logging": 0-20,
    "security": 0-20,
    "architecture": 0-20
  }}
}}"""
                }],
                task_type="analysis",
                max_tokens=1024,
            )
            return result if isinstance(result, dict) else {"score": 50, "readiness_score": 50}
        except Exception as e:
            logger.warning(f"Scalability assessment failed: {e}")
            return {"score": 50, "readiness_score": 50}

    async def _generate_recommendations(self, context: str, parse_result: dict) -> list:
        """Generate actionable improvement recommendations."""
        try:
            result = await llm_router.complete_json(
                system_prompt=ARCHITECTURE_SYSTEM,
                messages=[{
                    "role": "user",
                    "content": f"""Generate specific, actionable recommendations for this codebase.

CODEBASE FACTS:
{context}

Return ONLY valid JSON array of top 8 recommendations:
[
  {{
    "title": "Short recommendation title",
    "priority": "critical|high|medium|low",
    "category": "security|performance|architecture|testing|documentation|devops",
    "description": "What to do and why",
    "effort": "hours|days|weeks",
    "impact": "Description of expected improvement"
  }}
]

Recommendations must be specific to THIS codebase, not generic advice."""
                }],
                task_type="fast",
                max_tokens=1500,
            )
            return result if isinstance(result, list) else []
        except Exception as e:
            logger.warning(f"Recommendations generation failed: {e}")
            return []

    def _detect_hallucinations(self, arch_summary: str, parse_result: dict) -> bool:
        """
        Cross-validate LLM output against parsed facts.
        Flags if LLM mentions technologies not found in codebase.
        """
        if not arch_summary:
            return False

        tech_stack = set(parse_result.get("tech_stack", []))
        lang_stats = set(parse_result.get("language_stats", {}).keys())
        all_known = tech_stack | lang_stats

        # Known hallucination triggers — LLM inventing tech
        COMMON_HALLUCINATIONS = [
            "kubernetes", "kafka", "rabbitmq", "elasticsearch",
            "graphql", "grpc", "websocket",
        ]

        hallucination_score = 0
        for tech in COMMON_HALLUCINATIONS:
            if tech in arch_summary.lower() and tech not in all_known:
                # LLM mentioned something not in the codebase
                hallucination_score += 1

        return hallucination_score >= 2

    def _build_frontend_graph(self, graph_data: dict, parse_result: dict) -> dict:
        """Convert parsed graph to React Flow compatible format."""
        nodes = graph_data.get("nodes", [])
        edges = graph_data.get("edges", [])

        # Group by language for coloring
        LANG_COLORS = {
            "python": "#3B82F6",
            "typescript": "#A78BFA",
            "javascript": "#F59E0B",
            "go": "#10B981",
            "rust": "#F97316",
            "java": "#EF4444",
            "default": "#6B7280",
        }

        # Limit to top 60 most connected nodes for UI performance
        node_edge_count = {}
        for e in edges:
            node_edge_count[e["source"]] = node_edge_count.get(e["source"], 0) + 1
            node_edge_count[e["target"]] = node_edge_count.get(e["target"], 0) + 1

        top_nodes = sorted(nodes, key=lambda n: node_edge_count.get(n["id"], 0), reverse=True)[:60]
        top_node_ids = {n["id"] for n in top_nodes}

        rf_nodes = []
        for i, node in enumerate(top_nodes):
            lang = node.get("language", "unknown")
            row = i // 8
            col = i % 8
            rf_nodes.append({
                "id": node["id"],
                "type": "archNode",
                "position": {"x": col * 160, "y": row * 120},
                "data": {
                    "label": node["id"].split(".")[-1] or node["id"],
                    "fullPath": node.get("path", ""),
                    "language": lang,
                    "lineCount": node.get("line_count", 0),
                    "hasTests": node.get("has_tests", False),
                    "color": LANG_COLORS.get(lang, LANG_COLORS["default"]),
                    "connections": node_edge_count.get(node["id"], 0),
                },
            })

        rf_edges = [
            {
                "id": f"{e['source']}-{e['target']}",
                "source": e["source"],
                "target": e["target"],
                "animated": True,
                "type": "smoothstep",
            }
            for e in edges
            if e["source"] in top_node_ids and e["target"] in top_node_ids
        ][:200]

        return {"nodes": rf_nodes, "edges": rf_edges}


# Singleton
analyzer = LLMAnalyzer()
