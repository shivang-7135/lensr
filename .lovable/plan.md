# Plan: Rewrite `README.md` end-to-end

Replace the current `README.md` with a complete, accurate, structured document reflecting the codebase as it stands today (TanStack Start frontend + Python LangGraph backend + Lovable Cloud, 20 search categories, per-intent enrichment pipeline, security hardening).

## Sections in the new README

1. **Header** — name, one-line pitch, live URL (`https://lensr-shivang.lovable.app`), tech badges (React 19, TanStack Start, Tailwind v4, Supabase, FastAPI, LangGraph, AWS Bedrock).
2. **What it does** — intent-aware search across 20 categories; each result card shows a real image (Wikipedia → OG fallback) plus at least one external CTA (Amazon / Maps / Booking / publisher).
3. **Architecture diagram** — full ASCII diagram showing Browser → TanStack Start Worker (SSE proxy / mock fallback) → Python FastAPI → router_graph → per-intent StateGraphs → tools (Serper, scraper, Bedrock LLM/Vision, price_store, places). Also show Lovable Cloud (Supabase) for auth, RLS tables, storage.
4. **Request flow (search)** — step-by-step from submit → `/api/search` SSE → proxy vs mock → `ResultsStream` event consumption (`intent_detected`, `keywords_extracted`, `search_plan`, `tool_call`, `search_results`, `scrape_progress`, `reflection`, `partial_answer`, `final`, `error`).
5. **Intents & result cards** — table of all 10 backend intents mapped to the 20 UI categories, with the result component, image source strategy, and CTA strategy per intent:
   - shopping / gifts / tech → `ShoppingResult` — Wikipedia + OG → Amazon CTA
   - price_history → `PriceHistoryResult` — Amazon / Keepa / CamelCamelCamel / Google Shopping CTAs
   - trip → `TripResult` — destination photo + Maps/Booking/Flights CTAs
   - insta → `InstaResult` — place photos + Open in Maps pill
   - movies / books / places / recipes / events / food → respective cards
   - general (fitness, health, career, finance, code, learn, home, tools, news) → `GeneralResult` — Wikipedia first, OG for news
6. **Auth & roles** — Supabase email/password, `handle_new_user` trigger, `user_roles` table, `has_role(uid, role)` SECURITY DEFINER, admin-only mutations, `/admin` gated by `admin` role for managing `api_keys`.
7. **Server-side patterns** — `createServerFn` for app-internal RPC with `requireSupabaseAuth`; `src/routes/api/*` for raw HTTP (SSE `/api/search`, `/api/public/backend-keys` for backend key sync); SSRF guard `isPublicHttpUrl` on outbound OG fetches.
8. **Security posture** — RLS on all public tables with explicit `GRANT`s; `user_roles` admin-only INSERT/UPDATE/DELETE; storage `insta-images` owner-scoped UPDATE; FastAPI exception handler returns generic 500; SSRF blocks localhost, private IP ranges, IMDS.
9. **Repo layout** — refreshed tree covering `src/components/results/*`, `src/lib/search/*`, `src/routes/api/*`, `src/routes/_authenticated/*`, `backend/app/agents/*`, `backend/app/tools/*`, `supabase/migrations/*`.
10. **Running locally** — frontend via Lovable preview; backend `cd backend && python -m venv .venv && pip install -e . && uvicorn app.main:app --reload`; required Lovable secrets (`BACKEND_BASE_URL`, `BACKEND_SHARED_SECRET`); fallback mock agent behavior when unset.
11. **Environment variables** — full table split into frontend (`VITE_*`), TanStack Worker (`BACKEND_BASE_URL`, `BACKEND_SHARED_SECRET`, `LOVABLE_API_KEY`), Python backend (`AWS_*`, `BEDROCK_MODEL_*`, `SERPER_API_KEY`, `DATABASE_URL`, `BACKEND_SHARED_SECRET`).
12. **Deployment** — frontend published to `lensr-shivang.lovable.app`; backend recommended on AWS App Runner / Fly / Render, Dockerfile included.
13. **Default admin** — `admin@admin.com` (password rotated to random value by latest migration; reset via Supabase auth dashboard).
14. **Credits / license** — built with Lovable; Bedrock + Serper.

## Files changed

- `README.md` (full rewrite)

No backend/code edits. No new dependencies.
