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

MAX_LOOPS = 3
MAX_SOURCES = 12
SCRAPE_TOP_N = 4


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


async def _llm_json(system: str, user: str, *, use_router: bool = False) -> dict:
    llm = router_llm() if use_router else reasoning_llm()
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
    "You are a search planner. Produce 4-6 diverse Google queries that together will surface "
    "the best evidence to answer the user. Avoid duplicates. Prefer specific over generic. "
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
    # always blend in 1-2 seed queries for safety
    seeds = cfg.seed_queries(query)[:2]
    out = []
    seen = set()
    for q in list(qs) + seeds:
        q = (q or "").strip()
        if q and q.lower() not in seen:
            seen.add(q.lower())
            out.append(q)
    return out[:6]


async def _fanout_search(queries: list[str]) -> list[dict]:
    results = await asyncio.gather(*[google_search(q, num=5) for q in queries], return_exceptions=True)
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
    sys = (
        cfg.system_prompt
        + "\n\nReturn ONLY a single JSON object matching this schema (no markdown fences):\n"
        + cfg.schema_hint
        + '\nAlways include a "tldr" string and a "detail_markdown" string (a beautifully formatted markdown '
        "explanation with sections, bullets, and bold highlights). Be honest about uncertainty."
    )
    context = "\n\n".join(
        f"[{i+1}] {e['title']} ({e['url']})\n{e['snippet']}\n{e.get('body','')[:1500]}"
        for i, e in enumerate(evidence[:10])
    )
    user = (
        f"User query: {query}\n"
        f"Keywords/entities: {json.dumps(kw)}\n\n"
        f"Web evidence (cite by [n]):\n{context}"
    )
    data = await _llm_json(sys, user)
    if not data:
        data = {"tldr": "Unable to synthesize a structured answer.", "detail_markdown": "_No structured output._"}
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
