"""Shared adaptive search pipeline.

Pattern: extract keywords -> plan diverse queries -> fan-out Serper -> scrape
top pages -> reflect ("do I have enough?") -> loop or synthesize a strict
JSON answer matching the intent schema.

Per-intent agents only supply: system prompt + JSON schema + search-plan hints.
"""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import AsyncIterator, Awaitable, Callable
from dataclasses import dataclass
from datetime import UTC, datetime

from langchain_core.messages import HumanMessage, SystemMessage

from ..llm import reasoning_llm, router_llm
from ..observability import span
from ..tools.scraper import fetch_clean
from ..tools.serper import google_search

logger = logging.getLogger(__name__)

MAX_LOOPS = 2  # Allow one reflection + follow-up pass when evidence is thin
MAX_SOURCES = 8
SCRAPE_TOP_N = 4

# Intents that benefit from a reflection loop (research-heavy queries)
_REFLECTION_INTENTS = frozenset(
    {
        "shopping",
        "trip",
        "price_history",
        "comparison",
        "real_estate",
        "automotive",
        "finance",
        "legal",
        "health",
        "jobs",
    }
)


@dataclass
class IntentConfig:
    name: str
    system_prompt: str  # describes how to write the final answer
    schema_hint: str  # JSON schema description for synthesis
    plan_hint: str  # extra guidance for the search-planner LLM
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
    return datetime.now(UTC).strftime("%A, %B %d, %Y")


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

# Combined keyword extraction + query planning in one call (saves ~1.5s LLM round-trip)
COMBINED_PLAN_SYS = (
    "You are a search analyst. Given a user query, do TWO things in one response:\n"
    "1. Extract keywords, entities, and constraints\n"
    "2. Plan 3 diverse Google search queries to find the best evidence\n\n"
    "Return ONLY JSON:\n"
    '{"keywords": ["..."], "entities": ["..."], "constraints": ["..."], '
    '"intent_summary": "one sentence", "queries": ["query1", "query2", "query3"]}\n\n'
    "Rules for queries: be specific, include current year in 1 query, avoid duplicates."
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


async def _combined_plan(query: str, cfg: IntentConfig) -> tuple[dict, list[str]]:
    """Single LLM call that extracts keywords AND plans queries (saves ~1.5s)."""
    sys = COMBINED_PLAN_SYS + "\n" + cfg.plan_hint
    data = await _llm_json(sys, query, use_router=True)
    kw = {
        "keywords": data.get("keywords", []),
        "entities": data.get("entities", []),
        "constraints": data.get("constraints", []),
        "intent_summary": data.get("intent_summary", ""),
    }
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
    return kw, out[:3]


async def _plan_queries(query: str, kw: dict, cfg: IntentConfig) -> list[str]:
    """Fallback: plan queries separately (used only if combined plan fails)."""
    sys = PLAN_SYS_BASE + "\n" + cfg.plan_hint
    user = json.dumps({"query": query, "keywords": kw, "intent": cfg.name})
    data = await _llm_json(sys, user, use_router=True)
    qs = data.get("queries") or []
    if not qs:
        qs = cfg.seed_queries(query)
    seeds = cfg.seed_queries(query)[:1]
    out = []
    seen = set()
    for q in list(qs) + seeds:
        q = (q or "").strip()
        if q and q.lower() not in seen:
            seen.add(q.lower())
            out.append(q)
    return out[:3]


async def _fanout_search(queries: list[str]) -> list[dict]:
    with span(
        "search.fanout",
        span_kind="RETRIEVER",
        input_value=json.dumps(queries),
        attributes={"search.query_count": len(queries)},
    ):
        results = await asyncio.gather(*[google_search(q, num=3) for q in queries], return_exceptions=True)
        merged: list[dict] = []
        seen = set()
        for q, res in zip(queries, results, strict=False):
            if isinstance(res, Exception):
                logger.warning("Search failed for query '%s': %s", q, res)
                continue
            if not res or not isinstance(res, list):
                logger.debug("No results for query: '%s'", q)
                continue
            for r in res:
                link = r.get("link")
                if not link or link in seen:
                    continue
                seen.add(link)
                merged.append(
                    {
                        "title": r.get("title") or link,
                        "url": link,
                        "snippet": r.get("snippet") or "",
                        "via_query": q,
                    }
                )
        if not merged:
            logger.warning("_fanout_search returned 0 results for %d queries", len(queries))
        return merged


async def _scrape(sources: list[dict], limit: int) -> list[dict]:
    targets = sources[:limit]
    with span(
        "scrape.pages",
        span_kind="TOOL",
        input_value=json.dumps([s["url"] for s in targets]),
        attributes={"scrape.url_count": len(targets)},
    ):
        bodies = await asyncio.gather(*[fetch_clean(s["url"]) for s in targets], return_exceptions=True)
        enriched = []
        for s, body in zip(targets, bodies, strict=False):
            if isinstance(body, Exception):
                logger.warning("Scrape failed for %s: %s", s["url"], body)
                text = None
            elif isinstance(body, str):
                text = body
            else:
                logger.debug("Scrape returned no content for: %s", s["url"])
                text = None
            enriched.append({**s, "body": (text or "")[:4000]})
        return enriched


async def _reflect(query: str, evidence: list[dict], loop: int) -> dict:
    summary = "\n\n".join(
        f"[{i + 1}] {e['title']}\n{e['url']}\nsnippet: {e['snippet']}\nexcerpt: {e.get('body', '')[:600]}"
        for i, e in enumerate(evidence[:8])
    )
    user = f"User query: {query}\n\nLoop: {loop}\n\nEvidence so far:\n{summary}"
    return await _llm_json(REFLECT_SYS, user, use_router=True)


async def _synthesize(query: str, kw: dict, evidence: list[dict], cfg: IntentConfig) -> dict:
    # Check fast mode context
    _is_fast = False
    try:
        from ..router_graph import fast_mode_var

        _is_fast = fast_mode_var.get()
    except LookupError:
        pass

    limited_evidence = evidence[:8]

    # Prioritise scraped sources first (richer content), then snippet-only
    scraped = [e for e in limited_evidence if e.get("body")]
    snippets_only = [e for e in limited_evidence if not e.get("body")]
    ordered = (scraped + snippets_only)[:8]

    # Build context: full body for scraped pages, just snippet for others
    context_parts = []
    for i, e in enumerate(ordered):
        snippet = e.get("snippet", "")[:250]
        body = e.get("body", "")[:1200]  # cap to keep prompt manageable
        context_parts.append(
            f"[{i + 1}] {e['title']}\nURL: {e['url']}\n" + (f"Content: {body}" if body else f"Snippet: {snippet}")
        )
    context = "\n\n---\n\n".join(context_parts)

    # In fast mode: use Haiku for ALL intents (2-3x faster response)
    # In deep mode: use Sonnet for complex intents, Haiku for simple lookups
    use_fast_model = _is_fast or cfg.name in {"weather", "news", "sports", "general"}

    sys = (
        f"Today is {_today_str()}.\n\n"
        "You are an expert research analyst producing a high-quality answer for a real user.\n"
        f"ROLE: {cfg.system_prompt}\n\n"
        "━━━ QUALITY REQUIREMENTS ━━━\n"
        "• Be SPECIFIC: use real product names, prices, dates, version numbers from the evidence\n"
        "• Be HONEST: if evidence is thin, say so — never hallucinate details\n"
        "• Be ACTIONABLE: every recommendation must have a clear reason why\n"
        "• Be CURRENT: trust the evidence over your training data for dates/prices/availability\n"
        "• Cite sources inline as [1], [2] etc. whenever stating a specific fact\n"
        "• For tldr: write 2-3 punchy sentences that answer the question directly — no filler\n"
        "• For detail_markdown: use headers (##), bullet points, bold key terms — make it scannable\n\n"
        "━━━ OUTPUT FORMAT ━━━\n"
        "Return ONLY valid JSON matching this exact schema (no markdown fences, no extra keys):\n"
        f"{cfg.schema_hint}\n\n"
        "VALIDATION RULES:\n"
        "- tldr must be 2-4 sentences, specific, not generic filler\n"
        "- All array fields must have at least 2 items if evidence supports it\n"
        "- detail_markdown must be at least 150 words with proper markdown formatting\n"
        "- Never return placeholder text like 'string' or 'example'\n"
        "- If a field cannot be filled from evidence, use null (not empty string)"
    )

    user = (
        f"User query: {query}\n"
        f"Key terms identified: {', '.join(kw.get('keywords', []))}\n"
        f"Entities: {', '.join(kw.get('entities', []))}\n"
        f"User constraints: {', '.join(kw.get('constraints', [])) or 'none stated'}\n\n"
        f"=== EVIDENCE ({len(limited_evidence)} sources) ===\n\n"
        f"{context}\n\n"
        "Now synthesize a high-quality answer from the evidence above."
    )

    with span(
        "llm.synthesize",
        span_kind="CHAIN",
        input_value=f"Query: {query}",
        attributes={
            "intent": cfg.name,
            "evidence.count": len(limited_evidence),
            "model": "haiku" if use_fast_model else "sonnet",
            "context.chars": len(context),
        },
    ):
        data = await _llm_json(sys, user, use_router=use_fast_model)

    # Fallback: retry with simpler prompt if structured JSON failed
    if not data or not data.get("tldr"):
        logger.warning(
            "Synthesis returned no tldr for '%s' (intent=%s), retrying with fallback prompt", query[:60], cfg.name
        )
        fallback_sys = (
            f"Today is {_today_str()}. Answer the following question using ONLY the evidence provided.\n"
            "Return JSON with these fields: tldr (2-3 sentence direct answer), "
            "key_facts (list of 3-5 specific facts with source citations [n]), "
            "detail_markdown (well-structured markdown answer, minimum 200 words).\n"
            "Be specific, cite sources, and never invent details."
        )
        fallback_user = f"Question: {query}\n\nEvidence:\n{context[:4000]}"
        data = await _llm_json(fallback_sys, fallback_user, use_router=False)

    # Last resort: build from snippets (never hallucinate)
    if not data or not data.get("tldr"):
        logger.error("Both synthesis attempts failed for '%s'", query[:60])
        snippets = [e.get("snippet", "") for e in limited_evidence[:5] if e.get("snippet")]
        bullet_facts = [f"- {s.strip()}" for s in snippets if s.strip()]
        data = {
            "tldr": f"I found {len(limited_evidence)} sources about this topic. "
            f"Here are the key findings from the web evidence.",
            "key_facts": snippets[:5],
            "detail_markdown": (
                f"## Findings for: {query}\n\n"
                + "\n".join(bullet_facts[:8])
                + "\n\n*Note: Could not fully synthesize — showing raw evidence.*"
            ),
        }

    return data


# ---------- orchestrator ----------


async def run_pipeline(query: str, cfg: IntentConfig) -> AsyncIterator[dict]:
    """Yield SSE-shaped events for the adaptive pipeline.

    Optimized flow:
    1. Fire seed queries immediately (no LLM wait)
    2. In parallel: run combined keyword+plan LLM call
    3. Merge seed results with LLM-planned results
    4. Scrape top pages
    5. Synthesize answer

    This eliminates 1-2 sequential LLM calls (~3s saved).
    """
    from opentelemetry import trace as otel_trace

    from ..observability import _INPUT_MIME_TYPE, _INPUT_VALUE, _OPENINFERENCE_SPAN_KIND, get_tracer

    tracer = get_tracer()
    pipeline_span = None
    ctx = None
    if tracer:
        pipeline_span = tracer.start_span(f"pipeline.{cfg.name}")
        pipeline_span.set_attribute(_OPENINFERENCE_SPAN_KIND, "CHAIN")
        pipeline_span.set_attribute(_INPUT_VALUE, query[:500])
        pipeline_span.set_attribute(_INPUT_MIME_TYPE, "text/plain")
        pipeline_span.set_attribute("intent", cfg.name)
        ctx = otel_trace.use_span(pipeline_span, end_on_exit=True)
        ctx.__enter__()
    # Check if fast mode is requested
    fast_mode = False
    try:
        from ..router_graph import fast_mode_var

        fast_mode = fast_mode_var.get()
    except LookupError:
        pass

    if fast_mode:
        # ⚡ FAST MODE — Maximum parallelism, zero scraping
        # Strategy: grab search results (already running in background from router),
        # fire additional seed queries in parallel, synthesize immediately from snippets.
        # This eliminates: (1) keyword extraction LLM call, (2) scraping wait (4s+), (3) reflection loop
        # NOTE: stage:plan is already emitted by router_graph before intent classification.

        # Retrieve the generic search task that started during intent classification
        try:
            from ..router_graph import generic_search_task_var

            generic_search_task = generic_search_task_var.get()
        except LookupError:
            generic_search_task = None

        # Fire seed queries in parallel with the already-running generic search
        seed_queries = cfg.seed_queries(query)[:2]
        seed_search_task = asyncio.create_task(_fanout_search(seed_queries))

        all_queries = [query] + seed_queries
        kw = {
            "keywords": [],
            "entities": [],
            "constraints": [],
            "intent_summary": "Fast parallel search — snippet synthesis",
        }
        yield {"type": "keywords_extracted", "keywords": kw}
        yield {"type": "search_plan", "queries": all_queries}

        yield {"type": "stage", "stage": "search_loop_1"}
        for q in all_queries:
            yield {"type": "tool_call", "tool": "google_search", "input": q}

        # Await both searches concurrently (both already running)
        generic_results = (await generic_search_task) if generic_search_task else []
        seed_results = await seed_search_task

        # Merge and deduplicate results
        evidence: list[dict] = []
        seen_urls: set[str] = set()
        for r in list(generic_results) + list(seed_results):
            url = r.get("url") or r.get("link")
            if url and url not in seen_urls:
                evidence.append({"title": r.get("title", ""), "url": url, "snippet": r.get("snippet", ""), "body": ""})
                seen_urls.add(url)
        evidence = evidence[:6]  # cap at 6 for speed

        yield {
            "type": "search_results",
            "loop": 1,
            "count": len(evidence),
            "sample": [{"title": r["title"], "url": r["url"]} for r in evidence],
        }

        # ⚡ NO SCRAPING in fast mode — synthesize directly from snippets
        # Snippets from Serper already contain 150-200 chars of relevant text each
        # This saves 2-4 seconds of network I/O
        yield {"type": "stage", "stage": "synthesize"}

        # Start synthesis immediately with snippet-only evidence
        structured = await _synthesize(query, kw, evidence, cfg)
        sources = [{"title": e["title"], "url": e["url"]} for e in evidence]

        tldr = structured.get("tldr") or ""
        if tldr:
            yield {"type": "partial_answer", "delta": tldr + "\n\n"}

        if pipeline_span:
            pipeline_span.set_attribute("evidence.final_count", len(evidence))
            pipeline_span.set_attribute("sources.count", len(sources))
            pipeline_span.set_attribute("output.value", tldr[:500])
            pipeline_span.set_attribute("output.mime_type", "text/plain")
            pipeline_span.set_attribute("fast_mode", True)
        if ctx:
            ctx.__exit__(None, None, None)

        yield {
            "type": "final",
            "intent": cfg.name,
            "structured": structured,
            "markdown": structured.get("detail_markdown") or tldr,
            "sources": sources,
        }
        return

    # Retrieve generic background search if available
    try:
        from ..router_graph import generic_search_task_var

        generic_search_task = generic_search_task_var.get()
    except LookupError:
        generic_search_task = None

    # Start seed search immediately — no LLM round-trip needed
    seed_queries = cfg.seed_queries(query)[:2]
    seed_search_task = asyncio.create_task(_fanout_search(seed_queries))

    # NOTE: stage:plan already emitted by router_graph before classification.
    # Single combined LLM call: extract keywords + plan queries
    try:
        kw, planned_queries = await asyncio.wait_for(_combined_plan(query, cfg), timeout=8.0)
    except (TimeoutError, Exception) as e:
        logger.warning("Planner failed or timed out: %s. Falling back to seed queries.", e)
        kw = {"keywords": [], "entities": [], "constraints": [], "intent_summary": "Fallback to base intent"}
        planned_queries = cfg.seed_queries(query)[:3]

    yield {"type": "keywords_extracted", "keywords": kw}
    yield {"type": "search_plan", "queries": planned_queries}

    # Collect seed results (should already be done while LLM was thinking)
    seed_results = await seed_search_task
    generic_results = await generic_search_task if generic_search_task else []

    evidence: list[dict] = []
    seen_urls: set[str] = set()

    # Merge generic and seed results into evidence
    for r in list(generic_results) + list(seed_results):
        url = r.get("url")
        if url and url not in seen_urls and len(evidence) < MAX_SOURCES:
            evidence.append(r)
            seen_urls.add(url)

    # ⚡ NEW: Early Fast partial answer!
    # Stream top snippets immediately so the user sees something while the scraping and synthesis runs
    top_snippets = [e.get("snippet", "").strip() for e in evidence[:3] if e.get("snippet", "").strip()]
    if top_snippets:
        yield {"type": "partial_answer", "delta": " ".join(top_snippets)[:400] + "\n\n"}

    # Start scraping seed results IMMEDIATELY in the background
    seed_unscraped = [e for e in evidence if "body" not in e][:SCRAPE_TOP_N]
    seed_scrape_task = asyncio.create_task(_scrape(seed_unscraped, len(seed_unscraped))) if seed_unscraped else None

    # Now run the LLM-planned extra queries concurrently with seed scraping
    extra_queries = [
        q for q in planned_queries if q.lower() not in {s.lower() for s in seed_queries} and q.lower() != query.lower()
    ]
    if extra_queries:
        yield {"type": "stage", "stage": "search_loop_1"}
        for q in extra_queries:
            yield {"type": "tool_call", "tool": "google_search", "input": q}
        new_results = await _fanout_search(extra_queries)
        for r in new_results:
            url = r.get("url")
            if url and url not in seen_urls and len(evidence) < MAX_SOURCES:
                evidence.append(r)
                seen_urls.add(url)

    yield {
        "type": "search_results",
        "loop": 1,
        "count": len(evidence),
        "sample": [{"title": r["title"], "url": r["url"]} for r in evidence[:5]],
    }

    # Gather the parallel seed scrape results
    if seed_scrape_task:
        yield {"type": "scrape_progress", "count": len(seed_unscraped)}
        scraped = await seed_scrape_task
        by_url = {s["url"]: s for s in scraped}
        for i, e in enumerate(evidence):
            if e["url"] in by_url:
                evidence[i] = by_url[e["url"]]

    # Scrape any new extra results if we still need more context
    extra_unscraped = [e for e in evidence if "body" not in e][: max(0, SCRAPE_TOP_N - len(seed_unscraped))]
    if extra_unscraped:
        yield {"type": "scrape_progress", "count": len(extra_unscraped)}
        extra_scraped = await _scrape(extra_unscraped, len(extra_unscraped))
        by_url2 = {s["url"]: s for s in extra_scraped}
        for i, e in enumerate(evidence):
            if e["url"] in by_url2:
                evidence[i] = by_url2[e["url"]]

    # Reflection loop — only when evidence is genuinely thin OR it's a research-heavy intent
    # Skip for lookup/simple queries to save 8-12s
    scraped_count = sum(1 for e in evidence if e.get("body"))
    total_body_chars = sum(len(e.get("body", "")) for e in evidence)
    evidence_is_thin = scraped_count < 2 or total_body_chars < 2000
    should_reflect = MAX_LOOPS > 1 and (
        evidence_is_thin  # always loop when evidence is genuinely thin
        or cfg.name in _REFLECTION_INTENTS  # research-heavy intents only
    )
    if should_reflect:
        reflection = await _reflect(query, evidence, 1)
        yield {
            "type": "reflection",
            "loop": 1,
            "done": bool(reflection.get("done")),
            "missing": reflection.get("missing", ""),
            "followup_queries": reflection.get("followup_queries", []),
        }
        if not reflection.get("done") and reflection.get("followup_queries"):
            followup = [q for q in reflection["followup_queries"] if q][:3]
            if followup:
                yield {"type": "stage", "stage": "search_loop_2"}
                more_results = await _fanout_search(followup)
                for r in more_results:
                    url = r.get("url")
                    if url and url not in seen_urls and len(evidence) < MAX_SOURCES:
                        evidence.append(r)
                        seen_urls.add(url)
                # Scrape the newly added pages
                new_unscraped = [e for e in evidence if "body" not in e][:3]
                if new_unscraped:
                    yield {"type": "scrape_progress", "count": len(new_unscraped)}
                    more_scraped = await _scrape(new_unscraped, len(new_unscraped))
                    by_url2 = {s["url"]: s for s in more_scraped}
                    for i, e in enumerate(evidence):
                        if e["url"] in by_url2:
                            evidence[i] = by_url2[e["url"]]

    yield {"type": "stage", "stage": "synthesize"}

    # Partial answer has been moved to run earlier before scraping

    structured = await _synthesize(query, kw, evidence, cfg)
    sources = [{"title": e["title"], "url": e["url"]} for e in evidence[:10]]

    # Stream the real tldr once synthesis completes (replaces partial in UI)
    tldr = structured.get("tldr") or ""
    if tldr:
        yield {"type": "partial_answer", "delta": tldr + "\n\n"}

    if pipeline_span:
        pipeline_span.set_attribute("evidence.final_count", len(evidence))
        pipeline_span.set_attribute("sources.count", len(sources))
        pipeline_span.set_attribute("output.value", tldr[:500])
        pipeline_span.set_attribute("output.mime_type", "text/plain")
    if ctx:
        ctx.__exit__(None, None, None)

    yield {
        "type": "final",
        "intent": cfg.name,
        "structured": structured,
        "markdown": structured.get("detail_markdown") or tldr,
        "sources": sources,
    }
