
# Smart Search — Intent-Aware Google, powered by LangGraph + Bedrock

## 1. What we're building

A Google-style search app where the query is first classified into an **intent**, then routed to a specialized **LangGraph agent** that uses Google search results plus tools to return a structured, opinionated answer instead of a list of blue links.

v1 intents:
1. **Shopping** (car / phone / product) — specs, reviews, pros/cons, current best price.
2. **Price history & drop prediction** — historical price chart + "best time to buy" estimate.
3. **Trip planner** — destination ideas, itinerary, transport/stay pointers.
4. **Instagram helper** — image upload → caption suggestions + nearby/related place recommendations.

Plus a **General** fallback that returns enriched Google results.

## 2. Architecture

Two deployables. Lovable hosts the frontend; you host the Python agent service (Bedrock SDK is Python-first and Worker-incompatible, so it cannot live inside Lovable's TanStack server functions).

```text
┌────────────────────────────┐        HTTPS / JSON          ┌──────────────────────────────────┐
│  Lovable (TanStack Start)  │  ─────────────────────────▶  │  Python FastAPI + LangGraph      │
│                            │                              │                                  │
│  • Search UI / results     │  ◀── SSE stream of steps ──  │  • Intent router (LLM classify)  │
│  • Image upload (Insta)    │                              │  • Per-intent LangGraph graphs   │
│  • Price-history charts    │                              │  • Tools: Serper, scraper, etc.  │
│  • Auth (Lovable Cloud)    │                              │  • AWS Bedrock (Claude/Llama)    │
│  • Caches results          │                              │  • Postgres (price history)      │
└────────────────────────────┘                              └──────────────────────────────────┘
        │                                                                 │
        ▼                                                                 ▼
  Lovable Cloud (Supabase): users, saved searches,                Serper.dev, Bedrock,
  uploaded images, cached agent responses                         (optional) SerpAPI, Tavily
```

### Why this split
- **LangGraph + Bedrock + Python** is the mature path; LangGraph.js exists but tooling, examples, and Bedrock support are weaker.
- Lovable's server runtime is Cloudflare Workers — `boto3` and many LangChain integrations won't run there.
- Frontend stays fast and deployable on Lovable; backend can deploy to AWS App Runner / ECS / Fly / Render.

### Search source decision
Use **Serper.dev** as the primary Google SERP tool (cheap, returns real Google results as JSON, has a LangChain `GoogleSerperAPIWrapper` out of the box, 2,500 free queries). Keep **Tavily** wired as a secondary tool for deeper web QA. Google's official Custom Search JSON API is limited to 100 queries/day and CSE-scoped, so it's a poor fit for an agent that fans out multiple searches per question.

## 3. Frontend (Lovable)

Pages / routes (TanStack Start, file-based):
- `/` — search bar, recent searches, intent chips.
- `/results` — streaming results panel: shows intent badge, agent reasoning steps (collapsible), final structured answer, sources.
- `/insta` — image upload + caption/place recommendations view.
- `/price/$productId` — historical price chart + drop forecast.
- `/saved` — user's saved searches (auth required).
- `/auth` — login (Lovable Cloud).

Key UI pieces:
- Streaming results via **SSE** from the Python backend.
- `recharts` for price history.
- Markdown renderer for agent answers + a "Sources" list with favicons.
- Tailwind design tokens in `src/styles.css` — bold, editorial Google-alternative look (we'll lock the visual direction in a follow-up if you want design options).

Lovable Cloud is enabled for: auth, saved searches, image uploads (for the Insta agent), and a thin response cache table.

## 4. Python backend (LangGraph + Bedrock)

Layout:
```text
backend/
  app/
    main.py                # FastAPI app + SSE streaming endpoint
    config.py              # env, Bedrock model IDs, API keys
    llm.py                 # Bedrock ChatBedrockConverse client
    router_graph.py        # Top-level LangGraph: classify intent → dispatch
    agents/
      shopping.py          # LangGraph: search → extract specs → compare → summarize
      price_history.py     # LangGraph: lookup history → forecast → explain
      trip.py              # LangGraph: destination → itinerary → logistics
      insta.py             # LangGraph: vision caption → place lookup → hashtag rank
      general.py           # LangGraph: search → synthesize → cite
    tools/
      serper.py            # GoogleSerperAPIWrapper wrapper
      scraper.py           # readability/trafilatura page fetcher
      price_store.py       # Postgres read/write for price snapshots
      bedrock_vision.py    # Claude 3.5 Sonnet vision call for image → caption
      places.py            # Google Places (or OSM Nominatim free) for Insta
    schemas.py             # Pydantic response models per intent
    cache.py               # Redis or Postgres-based response cache
  pyproject.toml
  Dockerfile
```

### Top-level graph (router_graph.py)
```text
              ┌──► shopping_graph ──┐
classify ─────┤                     ├──► format_response ──► stream
              ├──► price_graph ─────┤
              ├──► trip_graph ──────┤
              ├──► insta_graph ─────┤
              └──► general_graph ───┘
```

`classify` is a Bedrock call returning `{intent, entities}`. Each sub-graph is itself a LangGraph `StateGraph` with nodes for search → extract → reason → answer, with retries and a max-iteration guard.

### Per-intent specifics
- **Shopping**: Serper queries for `"<product> review"`, `"<product> price"`, `"<product> vs"`. Scrape top 3-5 pages, extract specs, ask Bedrock to produce a comparison table + recommendation.
- **Price history**: Each lookup writes `(product_key, source, price, ts)` to Postgres. Forecast node uses simple seasonality + a Bedrock-written "explanation" of likely drop windows (sales calendar, model-cycle heuristics). Honest about uncertainty.
- **Trip**: Serper for "things to do in X", weather, transport; Bedrock builds a day-by-day itinerary; returns structured `Itinerary` schema the frontend renders as cards.
- **Insta**: Image uploaded to Lovable storage → URL sent to backend → Bedrock Claude Sonnet vision describes the scene → place lookup tool finds nearby/similar spots → caption + hashtag suggestions returned.
- **General**: Standard RAG-over-web pattern (search → scrape → cite).

### Streaming
FastAPI endpoint `POST /search` returns `text/event-stream`. We use LangGraph's `astream_events` to push: `intent_detected`, `tool_call`, `tool_result`, `partial_answer`, `final`. Frontend renders steps live.

### Bedrock
Use `langchain-aws`'s `ChatBedrockConverse`. Default model: Claude 3.5 Sonnet for reasoning, Claude 3 Haiku for the intent router (cheap+fast), Claude 3.5 Sonnet vision for Insta. Configurable via env.

## 5. Data model (Lovable Cloud / Supabase)

- `profiles` — standard.
- `user_roles` — standard role table (per platform rules).
- `saved_searches(id, user_id, query, intent, response_json, created_at)`.
- `uploaded_images(id, user_id, storage_path, created_at)` for Insta.
- `agent_cache(query_hash, intent, response_json, expires_at)` — short TTL.
- Price history lives in the **Python backend's own Postgres** (not Lovable Cloud) because writes come from the agent, not the user.

RLS: user-scoped on `saved_searches` and `uploaded_images`. Cache table service-role only.

## 6. Secrets & config

Stored in Lovable secrets (frontend never sees them — only the backend does, but we keep the list here so deployment is reproducible):
- Backend `.env`: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `BEDROCK_MODEL_REASONING`, `BEDROCK_MODEL_ROUTER`, `BEDROCK_MODEL_VISION`, `SERPER_API_KEY`, `TAVILY_API_KEY` (optional), `DATABASE_URL`, `BACKEND_SHARED_SECRET`.
- Lovable Cloud: `BACKEND_BASE_URL`, `BACKEND_SHARED_SECRET` (so the frontend's TanStack server function can attach a signed header when calling the Python service — never call the agent service directly from the browser).

## 7. Build order

1. **Frontend shell**: routes, search bar, results page with mock streaming, auth, saved searches table — fully functional UI against a stub endpoint.
2. **Python backend skeleton**: FastAPI, Bedrock client, Serper tool, `general` agent + intent router, SSE streaming. Wire frontend to it.
3. **Shopping agent** + structured comparison renderer.
4. **Trip agent** + itinerary renderer.
5. **Insta agent** (image upload pipeline + vision + places).
6. **Price history agent** + Postgres schema + chart UI + scheduled re-scrape job (cron in the Python service).
7. Polish: caching, rate-limit handling, error boundaries, share links for saved searches.

## 8. Risks & honest caveats

- **Price-drop "prediction"** is heuristic, not ML — we'll label it as an estimate.
- **Scraping** top SERP pages can be blocked; we fall back to Serper's snippets when a page won't load.
- **Bedrock latency** for vision can be 3–6s; we stream so it feels responsive.
- The Python service needs its own deployment + monitoring — Lovable can't host it.

## 9. What I'll ask before building

Once you approve this plan, two quick follow-ups:
- Exact Bedrock model IDs you want as defaults (Claude 3.5 Sonnet v2? Llama 3.1 70B?).
- Where you'll deploy the Python backend (AWS App Runner / ECS / Fly / Render) so I can include a matching `Dockerfile` + deploy notes.
