"""
ArchDefend — LLM Router
Multi-provider AI routing: primary → fallback → emergency fallback.
Key rotation, rate limit tracking, automatic failover.
Zero AI provider branding exposed to users.
"""
import asyncio
import json
import logging
import time
from typing import Optional
import httpx

from core.config import settings

logger = logging.getLogger("archdefend.llm")


class _KeyRotator:
    """Round-robin key rotation with per-key cooldown tracking."""
    def __init__(self, keys: list[str]):
        self._keys = list(keys)
        self._idx = 0
        self._cooldown: dict[str, float] = {}

    def get(self) -> Optional[str]:
        if not self._keys:
            return None
        now = time.monotonic()
        for _ in range(len(self._keys)):
            key = self._keys[self._idx % len(self._keys)]
            self._idx += 1
            if self._cooldown.get(key, 0) < now:
                return key
        return None

    def cool(self, key: str, secs: float = 62.0):
        self._cooldown[key] = time.monotonic() + secs
        logger.warning(f"Key {key[:10]}… rate-limited for {secs:.0f}s")


class RateLimitError(Exception):
    def __init__(self, retry_after: float = 62.0):
        self.retry_after = retry_after


class LLMRouter:
    """
    Routes LLM requests across providers with automatic failover.
    Provider names are intentionally internal — never surfaced to users.
    """
    _GROQ = "https://api.groq.com/openai/v1/chat/completions"
    _OR   = "https://openrouter.ai/api/v1/chat/completions"

    # Verified models as of May 2026
    _GROQ_MODELS = {
        "analysis": "llama-3.3-70b-versatile",
        "fast":     "llama-3.1-8b-instant",
    }
    _OR_MODELS = {
        "primary":  "anthropic/claude-3.5-sonnet",
        "fallback": "meta-llama/llama-3.3-70b-instruct",
    }

    def __init__(self):
        self._groq = _KeyRotator(settings.get_groq_keys())
        self._or   = _KeyRotator(settings.get_openrouter_keys())
        self._http  = httpx.AsyncClient(timeout=120.0)

    async def complete(
        self,
        messages: list[dict],
        system: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: int = 4096,
        json_mode: bool = False,
        task: str = "analysis",
    ) -> str:
        full = ([{"role": "system", "content": system}] if system else []) + messages

        # 1. Try Groq
        key = self._groq.get()
        if key:
            try:
                return await self._call_groq(key, self._GROQ_MODELS.get(task, self._GROQ_MODELS["analysis"]), full, temperature, max_tokens, json_mode)
            except RateLimitError as e:
                self._groq.cool(key, e.retry_after)
            except Exception as e:
                logger.warning(f"Groq failed: {e} — trying fallback")

        # 2. Try primary fallback
        or_key = self._or.get()
        if or_key:
            try:
                return await self._call_or(or_key, self._OR_MODELS["primary"], full, temperature, max_tokens)
            except RateLimitError as e:
                self._or.cool(or_key, e.retry_after)
            except Exception as e:
                logger.warning(f"Primary fallback failed: {e} — trying emergency")

            # 3. Emergency fallback
            try:
                return await self._call_or(or_key, self._OR_MODELS["fallback"], full, temperature, max_tokens)
            except Exception as e:
                raise RuntimeError(f"All AI providers exhausted: {e}")

        raise RuntimeError("No AI API keys configured. Set GROQ_API_KEY in .env")

    async def complete_json(self, messages: list[dict], system: str, **kw) -> dict | list:
        raw = await self.complete(messages, system, json_mode=True, **kw)
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        try:
            return json.loads(clean)
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse fail. Raw: {raw[:300]}")
            raise ValueError(f"AI returned invalid JSON: {e}")

    async def _call_groq(self, key: str, model: str, messages: list, temp: float, max_tok: int, json_mode: bool) -> str:
        payload: dict = {"model": model, "messages": messages, "temperature": temp, "max_tokens": max_tok}
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        r = await self._http.post(self._GROQ, headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"}, json=payload)
        if r.status_code == 429:
            raise RateLimitError(float(r.headers.get("retry-after", 62)))
        if r.status_code != 200:
            raise RuntimeError(f"HTTP {r.status_code}: {r.text[:200]}")
        return r.json()["choices"][0]["message"]["content"]

    async def _call_or(self, key: str, model: str, messages: list, temp: float, max_tok: int) -> str:
        payload = {"model": model, "messages": messages, "temperature": temp, "max_tokens": max_tok}
        r = await self._http.post(self._OR, headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json", "HTTP-Referer": "https://archdefend.io", "X-Title": "ArchDefend"}, json=payload)
        if r.status_code == 429:
            raise RateLimitError(float(r.headers.get("retry-after", 62)))
        if r.status_code != 200:
            raise RuntimeError(f"HTTP {r.status_code}: {r.text[:200]}")
        return r.json()["choices"][0]["message"]["content"]

    async def close(self):
        await self._http.aclose()


llm_router = LLMRouter()
