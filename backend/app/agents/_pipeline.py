"""Shared adaptive search pipeline.

Pattern: extract keywords -> plan diverse queries -> fan-out Serper -> scrape
top pages -> reflect ("do I have enough?") -> loop or synthesize a strict
JSON answer matching the intent schema.

Per-intent agents only supply: system prompt + JSON schema + search-plan hints.
"""
from __future__ import annotations
import asyncio
import json
from datetime import datetime, timezone
from dataclasses import dataclass
from typing import Any, AsyncIterator, Awaitable, Callable

from langchain_core.messages import HumanMessage, SystemMessage

from ..llm import reasoning_llm, router_llm
from ..tools.serper import google_search
from ..tools.scraper import fetch_clean

MAX_LOOPS = 2
MAX_SOURCES = 8
SCRAPE_TOP_N = 3  # Reduced for speed


@dataclass
class IntentConfig:
    name: str
    system_prompt: str          # describes how to write the final answer
    schema_hint: str            # JSON schema description for synthesis
    plan_hint: str              # extra guidance for the search-planner LLM
    seed_queries: Callable[[str], list[str]]  # cheap deterministic queries to seed loop 1


EventEmitter = Callable[[dict], Awaitable[None]]


async def _emit(emit: EventEmitter, evt: dict) -> None:
    await emit(evt)


# ---------- LLM helpers ----------

def _text(msg) -> str:
    c = msg.content
    if isinstance(c, str):
        return c
    return "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in c)


def _parse_json(raw: str) -> dict | None:
    raw = raw.strip()
    # strip markdown fences
    if raw.startswith("```"):
        raw = raw.split("```", 2)[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.rsplit("```", 1)[0]
    try:
        return json.loads(raw)
    except Exception:
        # last brace recovery
        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(raw[start : end + 1])
            except Exception:
                return None
    return None


def _today_str() -> str:
    return datetime.now(timezone.utc).strftime("%A, %B %d, %Y")


DATE_PREAMBLE = (
    "CURRENT DATE: {today}. Your training data is stale. "
    "Treat the web evidence as ground truth and the current date as authoritative. "
    "Never claim a product, movie, event, or release is 'upcoming', 'will release', or 'expected' "
    "if its date is on or before the current date — describe it as already released/launched/past. "
    "If evidence contradicts your prior knowledge, trust the evidence."
)


async def _llm_json(system: str, user: str, *, use_router: bool = False) -> dict:
    llm = router_llm() if use_router else reasoning_llm()
    system = DATE_PREAMBLE.format(today=_today_str()) + "\n\n" + system
    msg = await llm.ainvoke([SystemMessage(system), HumanMessage(user)])
    data = _parse_json(_text(msg))
    return data or {}


# ---------- pipeline steps ----------

KEYWORDS_SYS = (
    "Extract the user's real intent. Return ONLY JSON:\n"
    '{"keywords": ["..."], "entities": ["..."], "constraints": ["..."], "intent_summary": "one sentence"}.\n'
    "Keywords are 3-6 short search-worthy terms. Entities are named things (products, places, brands, people). "
    "Constraints are budget, dates, preferences, comparisons."
)

PLAN_SYS_BASE = (
    "You are a search planner. Produce exactly 3-4 diverse Google queries that together will surface "
    "the best evidence. Avoid duplicates. Be specific. "
    "Include the current year in 1-2 queries for fresh results. "
    'Return ONLY JSON: {"queries": ["...", "..."]}'
)

REFLECT_SYS = (
    "You are an expert researcher. Given the user's request and the evidence collected so far, "
    "decide if it is enough to write a high-quality answer. "
    "Return ONLY JSON: "
    '{"done": true|false, "missing": "what is still unclear", "followup_queries": ["...", "..."]}. '
    "If done=true, leave followup_queries empty. Max 4 followup queries."
)


async def _extract_keywords(query: str) -> dict:
    return await _llm_json(KEYWORDS_SYS, query, use_router=True)


async def _plan_queries(query: str, kw: dict, cfg: IntentConfig) -> list[str]:
    sys = PLAN_SYS_BASE + "\n" + cfg.plan_hint
    user = json.dumps({"query": query, "keywords": kw, "intent": cfg.name})
    data = await _llm_json(sys, user, use_router=True)
    qs = data.get("queries") or []
    if not qs:
        qs = cfg.seed_queries(query)
    # always blend in 1 seed query for safety
    seeds = cfg.seed_queries(query)[:1]
    out = []
    seen = set()
    for q in list(qs) + seeds:
        q = (q or "").strip()
        if q and q.lower() not in seen:
            seen.add(q.lower())
            out.append(q)
    return out[:3]  # max 3 queries for speed


async def _fanout_search(queries: list[str]) -> list[dict]:
    results = await asyncio.gather(*[google_search(q, num=3) for q in queries], return_exceptions=True)
    merged: list[dict] = []
    seen = set()
    for q, res in zip(queries, results):
        if isinstance(res, Exception):
            continue
        for r in res:
            link = r.get("link")
            if not link or link in seen:
                continue
            seen.add(link)
            merged.append({
                "title": r.get("title") or link,
                "url": link,
                "snippet": r.get("snippet") or "",
                "via_query": q,
            })
    return merged


async def _scrape(sources: list[dict], limit: int) -> list[dict]:
    targets = sources[:limit]
    bodies = await asyncio.gather(*[fetch_clean(s["url"]) for s in targets], return_exceptions=True)
    enriched = []
    for s, body in zip(targets, bodies):
        text = body if isinstance(body, str) else None
        enriched.append({**s, "body": (text or "")[:4000]})
    return enriched


async def _reflect(query: str, evidence: list[dict], loop: int) -> dict:
    summary = "\n\n".join(
        f"[{i+1}] {e['title']}\n{e['url']}\nsnippet: {e['snippet']}\nexcerpt: {e.get('body','')[:600]}"
        for i, e in enumerate(evidence[:8])
    )
    user = f"User query: {query}\n\nLoop: {loop}\n\nEvidence so far:\n{summary}"
    return await _llm_json(REFLECT_SYS, user, use_router=True)


async def _synthesize(query: str, kw: dict, evidence: list[dict], cfg: IntentConfig) -> dict:
    # Limit evidence to avoid context overflow - use only top 6 for speed
    limited_evidence = evidence[:6]
    
    # Build concise context - shorter snippets for faster processing
    context_parts = []
    for i, e in enumerate(limited_evidence):
        snippet = e.get('snippet', '')[:150]
        body = e.get('body', '')[:600]
        context_parts.append(f"[{i+1}] {e['title']}\n{snippet}\n{body}")
    context = "\n\n".join(context_parts)
    
    # Intents needing rich structured output use the reasoning model (Sonnet)
    # Other intents can use the faster router model (Haiku)
    needs_rich_schema = cfg.name in (
        "shopping", "trip", "price_history", "insta",
        "movies", "recipes", "books", "places", "events",
        "tech", "health", "finance", "jobs", "comparison",
        "gift", "gaming", "fitness", "real_estate", "automotive", "food",
    )
    
    sys = (
        "You are a helpful research assistant. Synthesize the web evidence into a clear, actionable answer.\n\n"
        f"{cfg.system_prompt}\n\n"
        "RESPONSE FORMAT - Return ONLY valid JSON (no markdown fences):\n"
        f"{cfg.schema_hint}\n\n"
        "CRITICAL: You MUST include all fields from the schema above.\n"
        "- Follow the exact schema structure with all nested arrays\n"
        "- Be specific with product names, prices, pros/cons\n"
        "- Cite sources using [n] format"
    )
    
    user = (
        f"Query: {query}\n"
        f"Key terms: {', '.join(kw.get('keywords', []))}\n\n"
        f"Evidence:\n{context}"
    )
    
    # Use reasoning model (Sonnet) for complex schemas, router (Haiku) for simple ones
    data = await _llm_json(sys, user, use_router=not needs_rich_schema)
    
    if not data or not data.get("tldr"):
        # Smart fallback: extract useful info from evidence
        top_sources = limited_evidence[:4]
        
        # Create a meaningful summary from snippets
        snippets = [e.get("snippet", "") for e in top_sources if e.get("snippet")]
        combined = " ".join(snippets)[:400]
        
        # Extract any items that look like recommendations
        items = []
        for e in top_sources:
            title = e.get("title", "")
            snippet = e.get("snippet", "")
            # Look for patterns like "1. X" or "- X" or "X by Y"
            if title:
                items.append(f"**{title}**: {snippet[:100]}...")
        
        data = {
            "tldr": f"Based on search results: {combined[:200]}..." if combined else f"Here's what I found about '{query}'",
            "key_facts": [
                snippet[:150] for snippet in snippets[:5] if snippet
            ] if snippets else [],
            "detail_markdown": (
                f"## What I Found\n\n" +
                "\n".join(f"- {item}" for item in items[:6])
            ) if items else ""
        }
    
    return data


# ---------- orchestrator ----------

async def run_pipeline(query: str, cfg: IntentConfig) -> AsyncIterator[dict]:
    """Yield SSE-shaped events for the adaptive pipeline."""
    yield {"type": "stage", "stage": "extract_keywords"}
    kw = await _extract_keywords(query)
    yield {"type": "keywords_extracted", "keywords": kw}

    yield {"type": "stage", "stage": "plan"}
    queries = await _plan_queries(query, kw, cfg)
    yield {"type": "search_plan", "queries": queries}

    evidence: list[dict] = []
    for loop in range(1, MAX_LOOPS + 1):
        yield {"type": "stage", "stage": f"search_loop_{loop}"}
        for q in queries:
            yield {"type": "tool_call", "tool": "google_search", "input": q}
        new_results = await _fanout_search(queries)
        yield {
            "type": "search_results",
            "loop": loop,
            "count": len(new_results),
            "sample": [{"title": r["title"], "url": r["url"]} for r in new_results[:5]],
        }

        # merge new into evidence, dedupe
        seen = {e["url"] for e in evidence}
        for r in new_results:
            if r["url"] not in seen and len(evidence) < MAX_SOURCES:
                evidence.append(r)
                seen.add(r["url"])

        # scrape any not-yet-scraped
        unscraped = [e for e in evidence if "body" not in e][:SCRAPE_TOP_N]
        if unscraped:
            yield {"type": "scrape_progress", "count": len(unscraped)}
            scraped = await _scrape(unscraped, len(unscraped))
            by_url = {s["url"]: s for s in scraped}
            for i, e in enumerate(evidence):
                if e["url"] in by_url:
                    evidence[i] = by_url[e["url"]]

        if loop >= MAX_LOOPS:
            break

        # Skip reflection if we have enough diverse evidence (saves ~3s)
        scraped_count = sum(1 for e in evidence if e.get("body"))
        if scraped_count >= 3 and len(evidence) >= 5:
            yield {
                "type": "reflection",
                "loop": loop,
                "done": True,
                "missing": "",
                "followup_queries": [],
            }
            break

        reflection = await _reflect(query, evidence, loop)
        yield {
            "type": "reflection",
            "loop": loop,
            "done": bool(reflection.get("done")),
            "missing": reflection.get("missing", ""),
            "followup_queries": reflection.get("followup_queries", []),
        }
        if reflection.get("done") or not reflection.get("followup_queries"):
            break
        queries = [q for q in reflection["followup_queries"] if q][:4]
        if not queries:
            break

    yield {"type": "stage", "stage": "synthesize"}
    structured = await _synthesize(query, kw, evidence, cfg)
    sources = [{"title": e["title"], "url": e["url"]} for e in evidence[:10]]

    # stream the tldr as a partial_answer for backwards-compatible UIs
    tldr = structured.get("tldr") or ""
    if tldr:
        yield {"type": "partial_answer", "delta": tldr + "\n\n"}

    yield {
        "type": "final",
        "intent": cfg.name,
        "structured": structured,
        "markdown": structured.get("detail_markdown") or tldr,
        "sources": sources,
    }
