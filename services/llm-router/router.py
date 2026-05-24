"""
ArchDefend — LLM Router
Multi-provider routing: Groq (primary) → OpenRouter (fallback)
Features: key rotation, rate limit detection, failover, structured output
"""

import asyncio
import hashlib
import json
import logging
import time
from collections import deque
from typing import Optional, AsyncIterator
import httpx

from core.config import settings

logger = logging.getLogger(__name__)


class APIKeyRotator:
    """Round-robin API key rotation with per-key rate limit tracking."""

    def __init__(self, keys: list[str]):
        self.keys = list(keys)
        self._index = 0
        self._rate_limited_until: dict[str, float] = {}

    def get_key(self) -> Optional[str]:
        if not self.keys:
            return None
        now = time.time()
        # Try each key, skip rate-limited ones
        for _ in range(len(self.keys)):
            key = self.keys[self._index % len(self.keys)]
            self._index += 1
            if self._rate_limited_until.get(key, 0) < now:
                return key
        return None  # All keys rate-limited

    def mark_rate_limited(self, key: str, retry_after: float = 60.0):
        self._rate_limited_until[key] = time.time() + retry_after
        logger.warning(f"Key {key[:8]}... rate limited for {retry_after}s")


class LLMRouter:
    """
    Intelligent LLM routing with automatic failover.

    Priority:
    1. Groq (llama-3.3-70b-versatile) — fastest, generous free tier
    2. OpenRouter (claude-3.5-sonnet) — best quality fallback
    3. OpenRouter (llama-3.3-70b) — cheap fallback
    """

    GROQ_BASE_URL = "https://api.groq.com/openai/v1"
    OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

    def __init__(self):
        self.groq_rotator = APIKeyRotator(settings.get_groq_keys())
        self.openrouter_rotator = APIKeyRotator(settings.get_openrouter_keys())
        self._client = httpx.AsyncClient(timeout=120.0)

    async def complete(
        self,
        messages: list[dict],
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: int = 4096,
        json_mode: bool = False,
        task_type: str = "analysis",  # analysis | fast | creative
    ) -> str:
        """
        Route completion request with automatic failover.
        Returns response text.
        """
        full_messages = []
        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})
        full_messages.extend(messages)

        # Select model based on task type
        groq_model = (
            settings.GROQ_FAST_MODEL if task_type == "fast"
            else settings.GROQ_PRIMARY_MODEL
        )

        # Try Groq first
        groq_key = self.groq_rotator.get_key()
        if groq_key:
            try:
                result = await self._groq_complete(
                    key=groq_key,
                    model=groq_model,
                    messages=full_messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    json_mode=json_mode,
                )
                logger.info(f"✅ Groq [{groq_model}] completed successfully")
                return result
            except RateLimitError as e:
                self.groq_rotator.mark_rate_limited(groq_key, e.retry_after)
                logger.warning(f"Groq rate limited, falling back to OpenRouter")
            except Exception as e:
                logger.warning(f"Groq failed ({e}), falling back to OpenRouter")

        # Fallback: OpenRouter
        or_key = self.openrouter_rotator.get_key()
        if or_key:
            try:
                # Try Claude 3.5 Sonnet first on OpenRouter
                result = await self._openrouter_complete(
                    key=or_key,
                    model=settings.OPENROUTER_PRIMARY_MODEL,
                    messages=full_messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    json_mode=json_mode,
                )
                logger.info(f"✅ OpenRouter [{settings.OPENROUTER_PRIMARY_MODEL}] completed")
                return result
            except RateLimitError:
                self.openrouter_rotator.mark_rate_limited(or_key)
            except Exception as e:
                logger.warning(f"OpenRouter primary failed ({e}), trying fallback model")

            # Final fallback: cheaper OpenRouter model
            try:
                result = await self._openrouter_complete(
                    key=or_key,
                    model=settings.OPENROUTER_FALLBACK_MODEL,
                    messages=full_messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    json_mode=json_mode,
                )
                logger.info(f"✅ OpenRouter fallback completed")
                return result
            except Exception as e:
                raise RuntimeError(f"All LLM providers exhausted: {e}")

        raise RuntimeError("No LLM API keys configured. Set GROQ_API_KEY or OPENROUTER_API_KEY.")

    async def _groq_complete(
        self,
        key: str,
        model: str,
        messages: list[dict],
        temperature: float,
        max_tokens: int,
        json_mode: bool,
    ) -> str:
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        response = await self._client.post(
            f"{self.GROQ_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )

        if response.status_code == 429:
            retry_after = float(response.headers.get("retry-after", 60))
            raise RateLimitError(retry_after)

        if response.status_code != 200:
            raise RuntimeError(f"Groq API error {response.status_code}: {response.text[:200]}")

        data = response.json()
        return data["choices"][0]["message"]["content"]

    async def _openrouter_complete(
        self,
        key: str,
        model: str,
        messages: list[dict],
        temperature: float,
        max_tokens: int,
        json_mode: bool,
    ) -> str:
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        response = await self._client.post(
            f"{self.OPENROUTER_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://archdefend.io",
                "X-Title": "ArchDefend",
            },
            json=payload,
        )

        if response.status_code == 429:
            retry_after = float(response.headers.get("retry-after", 60))
            raise RateLimitError(retry_after)

        if response.status_code != 200:
            raise RuntimeError(f"OpenRouter API error {response.status_code}: {response.text[:200]}")

        data = response.json()
        return data["choices"][0]["message"]["content"]

    async def complete_json(self, messages: list[dict], system_prompt: str, **kwargs) -> dict:
        """Complete and parse as JSON. Strips markdown fences."""
        raw = await self.complete(messages, system_prompt, json_mode=True, **kwargs)
        # Strip markdown fences if present
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        try:
            return json.loads(clean)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}\nRaw: {raw[:500]}")
            raise ValueError(f"LLM returned invalid JSON: {e}")

    async def close(self):
        await self._client.aclose()


class RateLimitError(Exception):
    def __init__(self, retry_after: float = 60.0):
        self.retry_after = retry_after
        super().__init__(f"Rate limited. Retry after {retry_after}s")


# Singleton
llm_router = LLMRouter()
