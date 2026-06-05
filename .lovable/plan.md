# Better search: adaptive agent + rich intent-aware results

Goal: replace the current shallow "one search → summarize" flow with an **adaptive multi-step agent** in the Python LangGraph backend, and render its output with **intent-specific UI components** instead of one plain markdown blob.

## Backend (Python / LangGraph)

Rewrite `backend/app/router_graph.py` and per-intent agents into a shared adaptive loop:

```text
classify_intent
   ↓
extract_keywords + entities  (LLM, JSON)
   ↓
generate_search_plan         (LLM picks 3–6 diverse Google queries from keywords)
   ↓
┌─► serper_search (parallel for all queries)
│      ↓
│   dedupe + rank sources
│      ↓
│   scrape top N pages (trafilatura, already present)
│      ↓
│   reflect: "do I have enough to answer well?"   (LLM, JSON: {done, missing, followup_queries})
└── if not done and loop<3 → feed followup_queries back to serper_search
   ↓
synthesize_structured_answer  (LLM returns JSON matching intent schema)
   ↓
stream final
```

Key changes:
- New file `backend/app/agents/_pipeline.py` holds the shared adaptive loop. Per-intent files (`shopping.py`, `trip.py`, `insta.py`, `price_history.py`, `general.py`) only supply: system prompt, JSON output schema, and search-plan hints.
- **Structured output per intent** (returned alongside markdown):
  - `shopping`: `{ tldr, picks: [{name, price_range, pros[], cons[], best_for, url}], comparison_table, recommendation }`
  - `price_history`: `{ tldr, typical_price_range, sale_windows[], buy_now_score (0–10), reasoning }`
  - `trip`: `{ tldr, days: [{day, theme, morning, afternoon, evening, food, transport_tip}], budget_hint, packing_tips[] }`
  - `insta`: `{ tldr, captions: [{style, text}], hashtags[], place_suggestions[] }`
  - `general`: `{ tldr, key_facts[], detail_markdown }`
- Stream new SSE event types: `keywords_extracted`, `search_plan`, `search_results`, `scrape_progress`, `reflection`, `partial_answer`, `final` (with `structured` payload + `sources`).
- Use Serper (already wired in `tools/serper.py`) with parallel `asyncio.gather` for fan-out.
- Cap: max 3 reflection loops, max 12 sources scraped, total timeout 45s.

## Frontend (TanStack / React)

1. **Types** (`src/lib/search/types.ts`): extend `StreamEvent` with new event kinds and a discriminated `StructuredResult` union per intent.

2. **`ResultsStream.tsx`**: collect events and dispatch to an intent-specific renderer instead of one `<ReactMarkdown>`.

3. **New components** under `src/components/results/`:
   - `AgentTimeline.tsx` — replaces "Agent steps" sidebar; pretty steps with icons for keyword extraction, each search query, scrape progress, reflection.
   - `ShoppingResult.tsx` — pick cards with pros/cons, comparison table, recommended badge.
   - `TripResult.tsx` — day-by-day itinerary cards, budget + packing chips.
   - `PriceHistoryResult.tsx` — buy-now gauge, sale-window timeline.
   - `InstaResult.tsx` — caption cards (copy button), hashtag chips, place list.
   - `GeneralResult.tsx` — TL;DR card + key-facts list + long-form markdown.
   - `SourcesGrid.tsx` — favicon + title + domain cards, replaces flat link list.

4. **Streaming UX**: show skeletons for the structured panel while `partial_answer` events arrive, then swap to the structured component when `final` lands.

## Config / ops

- Confirm `SERPER_API_KEY` is set on the backend service (env var on the Python host — not a Lovable secret).
- `BACKEND_BASE_URL` must point to the deployed Python service; otherwise the TS route already falls back to the mock and the user will keep seeing today's behavior. Plan assumes the Python backend is reachable.

## Out of scope (for this iteration)

- Caching of past searches, user feedback / re-run, multi-modal image queries (the current `/results?q=caption+%2B+place+ideas+for+image:...` URL pattern keeps working as a plain text query into the `insta` agent).

## Technical notes

- LangGraph: use `StateGraph` with a loop edge `reflect → search` gated by `state["loop"] < 3 and not state["done"]`.
- JSON-mode synthesis: use `reasoning_llm()` with a system prompt enforcing the per-intent schema; validate with `pydantic` before emitting `final`.
- SSE: keep the existing `data: {json}\n\n` framing so the TS proxy needs no changes.
