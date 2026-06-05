"""
ArchDefend AI Service
Groq primary, OpenRouter fallback with automatic failover, retries, and structured outputs.
"""
from __future__ import annotations
import time
import asyncio
from typing import Optional, Any
from dataclasses import dataclass
from enum import Enum
import httpx
import structlog
from config import settings

log = structlog.get_logger()

# Model Registry - only confirmed available models
GROQ_MODELS = {
    "fast": "llama-3.1-8b-instant",
    "balanced": "llama-3.3-70b-versatile",
    "powerful": "llama-3.1-70b-versatile",
}

OPENROUTER_MODELS = {
    "fast": "meta-llama/llama-3.1-8b-instruct:free",
    "balanced": "meta-llama/llama-3.3-70b-instruct:free",
    "powerful": "meta-llama/llama-3.1-70b-instruct:free",
}

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"


class AIProvider(str, Enum):
    GROQ = "groq"
    OPENROUTER = "openrouter"


@dataclass
class AIUsage:
    provider: AIProvider
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    latency_ms: float
    cost_usd: float = 0.0


@dataclass
class AIResponse:
    content: str
    usage: AIUsage
    provider: AIProvider


_provider_health: dict[AIProvider, bool] = {
    AIProvider.GROQ: True,
    AIProvider.OPENROUTER: True,
}
_health_check_times: dict[AIProvider, float] = {}
HEALTH_CHECK_COOLDOWN = 60


async def _call_groq(
    messages: list[dict],
    model_tier: str = "balanced",
    max_tokens: int = 4096,
    temperature: float = 0.3,
    json_mode: bool = False,
    timeout: float = 60,
) -> AIResponse:
    model = GROQ_MODELS[model_tier]
    payload: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    start = time.monotonic()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            GROQ_API_URL,
            json=payload,
            headers={
                "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            timeout=timeout,
        )

    latency = (time.monotonic() - start) * 1000

    if resp.status_code == 429:
        raise RuntimeError("Groq rate limit exceeded")
    if resp.status_code != 200:
        raise RuntimeError(f"Groq API error {resp.status_code}: {resp.text[:200]}")

    data = resp.json()
    content = data["choices"][0]["message"]["content"]
    usage_data = data.get("usage", {})

    return AIResponse(
        content=content,
        provider=AIProvider.GROQ,
        usage=AIUsage(
            provider=AIProvider.GROQ,
            model=model,
            prompt_tokens=usage_data.get("prompt_tokens", 0),
            completion_tokens=usage_data.get("completion_tokens", 0),
            total_tokens=usage_data.get("total_tokens", 0),
            latency_ms=latency,
        ),
    )


async def _call_openrouter(
    messages: list[dict],
    model_tier: str = "balanced",
    max_tokens: int = 4096,
    temperature: float = 0.3,
    json_mode: bool = False,
    timeout: float = 90,
) -> AIResponse:
    model = OPENROUTER_MODELS[model_tier]
    payload: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    start = time.monotonic()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            OPENROUTER_API_URL,
            json=payload,
            headers={
                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://archdefend.app",
                "X-Title": "ArchDefend",
            },
            timeout=timeout,
        )

    latency = (time.monotonic() - start) * 1000

    if resp.status_code != 200:
        raise RuntimeError(f"OpenRouter API error {resp.status_code}: {resp.text[:200]}")

    data = resp.json()
    content = data["choices"][0]["message"]["content"]
    usage_data = data.get("usage", {})

    return AIResponse(
        content=content,
        provider=AIProvider.OPENROUTER,
        usage=AIUsage(
            provider=AIProvider.OPENROUTER,
            model=model,
            prompt_tokens=usage_data.get("prompt_tokens", 0),
            completion_tokens=usage_data.get("completion_tokens", 0),
            total_tokens=usage_data.get("total_tokens", 0),
            latency_ms=latency,
        ),
    )


async def complete(
    messages: list[dict],
    model_tier: str = "balanced",
    max_tokens: int = 4096,
    temperature: float = 0.3,
    json_mode: bool = False,
    max_retries: int = 2,
) -> AIResponse:
    """Call AI with Groq primary, OpenRouter fallback, retries."""
    errors = []

    for attempt in range(max_retries):
        if _provider_health[AIProvider.GROQ]:
            try:
                result = await _call_groq(messages, model_tier, max_tokens, temperature, json_mode)
                _provider_health[AIProvider.GROQ] = True
                log.info("AI response from Groq", model=GROQ_MODELS[model_tier], latency_ms=result.usage.latency_ms)
                return result
            except Exception as e:
                errors.append(f"Groq attempt {attempt+1}: {e}")
                log.warning("Groq failed, trying OpenRouter", error=str(e))
                _provider_health[AIProvider.GROQ] = False
                _health_check_times[AIProvider.GROQ] = time.monotonic()

        try:
            result = await _call_openrouter(messages, model_tier, max_tokens, temperature, json_mode)
            _provider_health[AIProvider.OPENROUTER] = True
            log.info("AI response from OpenRouter", model=OPENROUTER_MODELS[model_tier], latency_ms=result.usage.latency_ms)
            return result
        except Exception as e:
            errors.append(f"OpenRouter attempt {attempt+1}: {e}")
            log.error("OpenRouter also failed", error=str(e))

        if attempt < max_retries - 1:
            await asyncio.sleep(2 ** attempt)

        now = time.monotonic()
        for provider in AIProvider:
            last = _health_check_times.get(provider, 0)
            if not _provider_health[provider] and (now - last) > HEALTH_CHECK_COOLDOWN:
                _provider_health[provider] = True

    raise RuntimeError(f"All AI providers failed after {max_retries} retries. Errors: {'; '.join(errors)}")


async def analyze_architecture(
    repo_summary: str,
    tech_stack: list[str],
    symbols_summary: str,
) -> dict:
    """Generate comprehensive architecture analysis."""
    messages = [
        {
            "role": "system",
            "content": (
                "You are a principal software architect analyzing codebases. "
                "Provide deep, actionable architectural insights. "
                "Respond ONLY with valid JSON, no markdown."
            ),
        },
        {
            "role": "user",
            "content": f"""Analyze this repository architecture and return a JSON object:

Repository Summary: {repo_summary}
Tech Stack: {', '.join(tech_stack)}
Symbols: {symbols_summary}

Return JSON with these exact keys:
{{
  "overview": "2-3 sentence architecture overview",
  "architectural_style": "e.g. Monolith, Microservices, MVC, Event-driven",
  "strengths": ["list of 3-5 architectural strengths"],
  "risks": ["list of 3-5 architectural risks or concerns"],
  "recommendations": ["list of 3-5 specific improvement recommendations"],
  "scalability_score": 75,
  "maintainability_score": 80,
  "security_score": 70,
  "complexity_level": "low|medium|high|very_high",
  "onboarding_time_estimate": "e.g. 2-3 days",
  "key_services": ["list of key services/modules identified"],
  "data_flow": "description of how data flows through the system",
  "external_dependencies": ["list of external services/APIs identified"]
}}""",
        },
    ]
    response = await complete(messages, model_tier="balanced", json_mode=True, max_tokens=2048)
    import json
    try:
        return json.loads(response.content)
    except Exception:
        return {"overview": response.content, "error": "Failed to parse structured response"}


async def generate_report(
    report_type: str,
    repo_name: str,
    architecture_data: dict,
    tech_stack: list[str],
) -> str:
    """Generate a full architecture report in Markdown."""
    prompts = {
        "architecture_overview": f"""Generate a comprehensive architecture overview report for {repo_name}.
Use this architecture data: {architecture_data}
Tech stack: {', '.join(tech_stack)}

Write a professional markdown report with:
# Architecture Overview: {repo_name}
## Executive Summary
## System Architecture
## Tech Stack Analysis
## Key Components
## Data Flow
## Scalability Assessment
## Recommendations
""",
        "onboarding": f"""Generate a new developer onboarding guide for {repo_name}.
Architecture: {architecture_data}
Tech stack: {', '.join(tech_stack)}

Write a practical markdown guide with:
# Developer Onboarding Guide: {repo_name}
## Quick Start
## Codebase Structure
## Key Concepts
## Important Files
## Development Workflow
## Common Patterns
## Getting Help
""",
        "interview_defense": f"""Generate an interview-ready architecture defense document for {repo_name}.
Architecture: {architecture_data}
Tech stack: {', '.join(tech_stack)}

Write a markdown document with:
# Architecture Defense: {repo_name}
## Why We Built It This Way
## Key Design Decisions
## Trade-offs Made
## Scalability Approach
## Security Considerations
## Technical Debt
## What We'd Do Differently
## Q&A Preparation
""",
        "security": f"""Generate a security analysis report for {repo_name}.
Architecture: {architecture_data}
Tech stack: {', '.join(tech_stack)}

Write a security-focused markdown report with:
# Security Analysis: {repo_name}
## Executive Summary
## Threat Model
## Security Findings
## Authentication & Authorization
## Data Protection
## Dependency Risks
## Recommendations
## Compliance Considerations
""",
        "technical_debt": f"""Generate a technical debt analysis for {repo_name}.
Architecture: {architecture_data}

Write a markdown report with:
# Technical Debt Report: {repo_name}
## Debt Summary
## Critical Issues
## Architecture Debt
## Code Quality Issues
## Dependency Debt
## Remediation Roadmap
## Effort Estimates
""",
    }

    prompt = prompts.get(report_type, prompts["architecture_overview"])
    messages = [
        {
            "role": "system",
            "content": "You are a senior software architect writing professional engineering documentation. Be specific, actionable, and thorough.",
        },
        {"role": "user", "content": prompt},
    ]
    response = await complete(messages, model_tier="powerful", max_tokens=4096)
    return response.content


async def scan_security(
    code_samples: list[dict],
    repo_name: str,
) -> list[dict]:
    """Scan for security issues in code samples."""
    samples_text = "\n\n".join(
        f"File: {s['path']}\nLanguage: {s['language']}\n```\n{s['content'][:2000]}\n```"
        for s in code_samples[:20]
    )
    messages = [
        {
            "role": "system",
            "content": "You are a security engineer performing code review. Respond ONLY with valid JSON.",
        },
        {
            "role": "user",
            "content": f"""Review these code samples from {repo_name} for security vulnerabilities.

{samples_text}

Return a JSON array of findings:
[
  {{
    "severity": "critical|high|medium|low|info",
    "category": "e.g. SQL Injection, Secret Exposure, XSS",
    "title": "Brief title",
    "description": "Detailed description",
    "file_path": "path/to/file",
    "line_number": 42,
    "recommendation": "How to fix this"
  }}
]

Focus on: secrets/credentials, SQL injection, XSS, insecure dependencies, broken auth, sensitive data exposure.""",
        },
    ]
    response = await complete(messages, model_tier="balanced", json_mode=True, max_tokens=2048)
    import json
    try:
        result = json.loads(response.content)
        return result if isinstance(result, list) else result.get("findings", [])
    except Exception:
        return []
