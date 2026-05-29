"""End-to-end recommendation pipeline.

Steps:
    1. LLM parses the natural-language query into structured intent.
    2. Run live web searches for product listings.
    3. Deduplicate and trim hits, then ask the LLM to rank and explain.
    4. Return personalized, ranked recommendations with real URLs.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Dict, List

from .config import settings
from .llm import LLMError, llm
from .models import (
    Intent,
    Providers,
    RecommendRequest,
    RecommendResponse,
    Recommendation,
)
from .search import SearchError, SearchHit, search_client

log = logging.getLogger(__name__)

INTENT_SYSTEM = """You are a shopping assistant that converts a user's natural-language
product request into a structured JSON intent. Only return JSON, no prose.

Schema:
{
  "product_type": string | null,            // e.g. "wireless headphones"
  "budget_max": number | null,              // numeric only, no currency symbol
  "budget_currency": string | null,         // "USD", "INR", "EUR"... if implied
  "use_case": string | null,                // e.g. "long-haul flights"
  "must_have": string[],                    // hard requirements
  "nice_to_have": string[],                 // soft preferences
  "avoid": string[],                        // anti-requirements
  "search_queries": string[]                // 2-3 effective web search queries
                                            // that will surface real listings.
                                            // Include phrases like "best",
                                            // "review", "buy", or include
                                            // shopping site hints when useful.
}
Rules:
- "search_queries" must be concrete enough to find real product pages.
- Never invent budgets that the user did not state.
- Output strictly valid JSON."""


RANK_SYSTEM = """You are an expert shopping advisor. You will receive:
- the user's original query and parsed intent
- a list of candidate web search results (title, url, snippet, source)

Pick the best candidates that are ACTUAL purchasable products or product
listings (not generic articles, forum threads, or how-to guides unless
nothing else is available). Rank them by fit to the user's intent.

For each pick, return:
- index           : the 0-based index from the candidates array
- score           : 0..1 how well it matches the user's needs
- reason          : ONE sentence, specific, mentions a concrete trait
                    that maps to the user's intent
- price           : if discoverable from the snippet, else null
- title_clean     : a tidy product name (strip site suffixes / SEO noise)

Also produce a "summary" string: 2-3 sentences of friendly advice for the
user explaining the overall recommendation strategy.

Return JSON with this exact shape:
{
  "summary": string,
  "picks": [
    { "index": int, "score": number, "reason": string,
      "price": string | null, "title_clean": string }
  ]
}
Order picks best-first. Limit to the requested number."""


def _dedupe_hits(hits: List[SearchHit]) -> List[SearchHit]:
    seen: set[str] = set()
    out: List[SearchHit] = []
    for h in hits:
        key = h.url.split("?")[0].rstrip("/")
        if key in seen:
            continue
        seen.add(key)
        out.append(h)
    return out


async def _parse_intent(query: str) -> Intent:
    user_msg = f"User query: {query!r}\nReturn the JSON intent now."
    try:
        data = await llm.chat_json(INTENT_SYSTEM, user_msg, temperature=0.1)
    except LLMError as exc:
        log.warning("Intent parse failed, using fallback: %s", exc)
        return Intent(product_type=None, search_queries=[query])
    return Intent(**{k: data.get(k) for k in Intent.model_fields.keys() if k in data})


async def _run_searches(queries: List[str], region: str | None) -> List[SearchHit]:
    queries = [q.strip() for q in queries if q and q.strip()]
    if not queries:
        return []
    if region:
        queries = [f"{q} ({region})" for q in queries]

    tasks = [search_client.search(q, max_results=6) for q in queries[:3]]
    results: List[List[SearchHit]] = []
    for r in await asyncio.gather(*tasks, return_exceptions=True):
        if isinstance(r, Exception):
            log.warning("Search query failed: %s", r)
            continue
        results.append(r)

    flat: List[SearchHit] = [h for batch in results for h in batch]
    return _dedupe_hits(flat)


async def _rank(
    query: str, intent: Intent, hits: List[SearchHit], top_k: int
) -> Dict:
    if not hits:
        return {"summary": "No live results found for this query.", "picks": []}

    candidate_payload = [
        {
            "index": i,
            "title": h.title,
            "url": h.url,
            "source": h.source,
            "snippet": h.snippet[:400],
        }
        for i, h in enumerate(hits[:24])  # cap context size
    ]
    user_msg = (
        f"User query: {query}\n"
        f"Intent: {intent.model_dump_json()}\n"
        f"Top-K requested: {top_k}\n"
        f"Candidates: {json.dumps(candidate_payload, ensure_ascii=False)}\n"
        "Pick the best, rank, and write the summary now."
    )
    return await llm.chat_json(RANK_SYSTEM, user_msg, temperature=0.3, max_tokens=2000)


def _apply_price_cap(
    recs: List[Recommendation], max_price: float | None
) -> List[Recommendation]:
    if not max_price:
        return recs
    kept: List[Recommendation] = []
    for r in recs:
        # Keep items where price is unknown — let the user decide.
        if not r.price:
            kept.append(r)
            continue
        digits = "".join(ch for ch in r.price if ch.isdigit() or ch == ".")
        try:
            value = float(digits) if digits else None
        except ValueError:
            value = None
        if value is None or value <= max_price:
            kept.append(r)
    return kept


async def recommend(req: RecommendRequest) -> RecommendResponse:
    if not llm.enabled:
        raise RuntimeError("LLM provider not configured.")
    if not search_client.enabled:
        raise RuntimeError("Search provider not configured.")

    # 1. Intent.
    intent = await _parse_intent(req.query)

    # Make sure we always have at least one search query.
    queries = intent.search_queries[:] or [req.query]
    if req.max_price and intent.budget_max is None:
        queries = [f"{q} under ${int(req.max_price)}" for q in queries]

    # 2. Live web search.
    try:
        hits = await _run_searches(queries, req.region)
    except SearchError as exc:
        raise RuntimeError(str(exc)) from exc

    # 3. LLM rank + summary.
    ranking = await _rank(req.query, intent, hits, req.top_k)

    picks = ranking.get("picks") or []
    summary = (ranking.get("summary") or "").strip() or (
        "Here are the top live results for your query."
    )

    recs: List[Recommendation] = []
    for pick in picks[: req.top_k]:
        try:
            idx = int(pick.get("index"))
        except (TypeError, ValueError):
            continue
        if idx < 0 or idx >= len(hits):
            continue
        h = hits[idx]
        recs.append(
            Recommendation(
                title=(pick.get("title_clean") or h.title)[:160],
                url=h.url,
                source=h.source,
                snippet=h.snippet[:280],
                price=pick.get("price"),
                image=h.image,
                score=float(pick.get("score") or 0.0),
                reason=(pick.get("reason") or "").strip(),
            )
        )

    recs = _apply_price_cap(recs, req.max_price)

    return RecommendResponse(
        query=req.query,
        intent=intent,
        summary=summary,
        results=recs,
        providers=Providers(
            llm=settings.llm_provider,
            llm_model=settings.llm_model,
            search=settings.search_provider,
        ),
    )
