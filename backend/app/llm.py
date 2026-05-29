"""Unified LLM client supporting OpenAI, Gemini, and Anthropic.

Exposes a single async ``chat_json`` method that returns a parsed dict.
The provider is auto-selected from environment variables.
"""
from __future__ import annotations

import json
import re
from typing import Any, Dict, Optional

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from .config import settings


class LLMError(RuntimeError):
    pass


def _extract_json(text: str) -> Dict[str, Any]:
    """Best-effort extraction of a JSON object from a model response."""
    if not text:
        raise LLMError("Empty LLM response")

    text = text.strip()
    # Strip markdown fences if present.
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Fallback: grab the first {...} block.
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError as exc:
            raise LLMError(f"Could not parse JSON from LLM: {exc}") from exc

    raise LLMError("LLM did not return JSON")


class LLMClient:
    def __init__(self) -> None:
        self.provider = settings.llm_provider
        self.model = settings.llm_model

    @property
    def enabled(self) -> bool:
        return self.provider is not None

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=0.5, min=0.5, max=4),
        reraise=True,
    )
    async def chat_json(
        self,
        system: str,
        user: str,
        *,
        temperature: float = 0.2,
        max_tokens: int = 1500,
    ) -> Dict[str, Any]:
        if not self.enabled:
            raise LLMError("No LLM provider configured. Set an API key in .env.")

        if self.provider == "openai":
            return await self._openai(system, user, temperature, max_tokens)
        if self.provider == "groq":
            return await self._groq(system, user, temperature, max_tokens)
        if self.provider == "gemini":
            return await self._gemini(system, user, temperature, max_tokens)
        if self.provider == "anthropic":
            return await self._anthropic(system, user, temperature, max_tokens)
        raise LLMError(f"Unsupported provider: {self.provider}")

    # ─── OpenAI ────────────────────────────────────────────────
    async def _openai(
        self, system: str, user: str, temperature: float, max_tokens: int
    ) -> Dict[str, Any]:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "response_format": {"type": "json_object"},
        }
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(url, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()
        content = data["choices"][0]["message"]["content"]
        return _extract_json(content)

    # ─── Groq (OpenAI-compatible) ──────────────────────────────
    async def _groq(
        self, system: str, user: str, temperature: float, max_tokens: int
    ) -> Dict[str, Any]:
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.groq_api_key}",
            "Content-Type": "application/json",
        }
        # Coerce JSON output via prompt; many Groq-hosted models accept
        # response_format too, but the prompt nudge is the reliable path.
        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        system
                        + "\n\nRespond ONLY with a single valid JSON object. "
                        "No prose, no markdown, no code fences."
                    ),
                },
                {"role": "user", "content": user},
            ],
            "temperature": temperature,
            "max_completion_tokens": max_tokens,
            "top_p": 1,
            "stream": False,
        }
        # gpt-oss models support a reasoning_effort knob.
        if "gpt-oss" in (self.model or ""):
            payload["reasoning_effort"] = "medium"

        async with httpx.AsyncClient(timeout=90) as client:
            r = await client.post(url, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()
        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as exc:
            raise LLMError(f"Unexpected Groq response shape: {data}") from exc
        return _extract_json(content)

    # ─── Gemini ────────────────────────────────────────────────
    async def _gemini(
        self, system: str, user: str, temperature: float, max_tokens: int
    ) -> Dict[str, Any]:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.model}:generateContent?key={settings.gemini_api_key}"
        )
        payload = {
            "system_instruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": user}]}],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
                "responseMimeType": "application/json",
            },
        }
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(url, json=payload)
            r.raise_for_status()
            data = r.json()
        try:
            content = data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError) as exc:
            raise LLMError(f"Unexpected Gemini response shape: {data}") from exc
        return _extract_json(content)

    # ─── Anthropic ─────────────────────────────────────────────
    async def _anthropic(
        self, system: str, user: str, temperature: float, max_tokens: int
    ) -> Dict[str, Any]:
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": settings.anthropic_api_key or "",
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "system": system + "\n\nReturn ONLY a single valid JSON object.",
            "messages": [{"role": "user", "content": user}],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(url, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()
        try:
            content = data["content"][0]["text"]
        except (KeyError, IndexError) as exc:
            raise LLMError(f"Unexpected Anthropic response shape: {data}") from exc
        return _extract_json(content)


llm = LLMClient()
