# Lensr

> Intent-aware search assistant. Ask in natural language, get a category-tailored answer card with a real image and at least one click-out CTA — every time.

- **Live:** https://lensr-shivang.lovable.app
- **Stack:** React 19 · TanStack Start v1 (Cloudflare Worker) · Tailwind v4 · shadcn/ui · Lovable Cloud (Supabase) · FastAPI · LangGraph · AWS Bedrock (Claude 3.5 Sonnet / Haiku) · Serper.dev

---

## 1. What it does

Lensr classifies every query into one of **10 backend intents** and renders a purpose-built result card. The homepage surfaces **20 categories** (Shopping, Price history, Trip planning, Insta captions, Recipes, Gifts, Books, Movies & TV, Coding help, Career, Fitness, Health, Finance, Local events, Restaurants, Home & decor, Tech compare, Learning path, News digest, Productivity).

For every card we guarantee:

1. **A real image** — Wikipedia (`summary` + `pageimages` fallback) first, then `og:image` / `twitter:image` from the top source. AI-generated hero only as a last resort (trip / insta).
2. **At least one external CTA** — Amazon, Google Maps, Booking.com, Google Flights, Keepa, CamelCamelCamel, Google Shopping, or the publisher's URL — even when the LLM omits one.
3. **Live SSE streaming** — intent → keywords → search plan → tool calls → reflection loop → partial answer → final structured payload.

---

## 2. Architecture

```text
 ┌──────────────────────────────────────────────────────────────────┐
 │                            Browser                               │
 │   React 19 · TanStack Router · Tailwind v4 · shadcn/ui           │
 │   Routes: /  /results  /insta  /saved  /admin  /auth             │
 │   Components: SearchBar · ResultsStream · 10× *Result cards      │
 └──────────┬──────────────────────────────────────────┬────────────┘
            │ supabase-js (auth, RLS reads, storage)   │ fetch SSE
            ▼                                          ▼
 ┌────────────────────────────┐    ┌─────────────────────────────────┐
 │  Lovable Cloud (Supabase)  │    │  TanStack Start  (CF Worker)    │
 │                            │    │                                 │
 │  auth.users                │    │  POST /api/search   (SSE)       │
 │  public.profiles           │    │   ├─ BACKEND_BASE_URL set?      │
 │  public.user_roles         │    │   │    → proxy Python + secret  │
 │  public.api_keys (admin)   │    │   └─ else mock via Lovable AI   │
 │  public.saved_searches     │    │      Gateway                    │
 │  public.uploaded_images    │    │                                 │
 │  storage: insta-images     │    │  Image enrichment + SSRF guard  │
 │                            │    │   isPublicHttpUrl, fetchWiki,   │
 │  RLS + GRANTs everywhere   │    │   fetchOgImage, pickImage       │
 │  has_role(uid,'admin')     │    │                                 │
 │                            │    │  createServerFn (RPC):          │
 │                            │    │   listApiKeys / upsert /        │
 │                            │    │   deleteApiKey / checkIsAdmin   │
 │                            │    │                                 │
 │                            │    │  Public route:                  │
 │                            │    │   /api/public/backend-keys      │
 └────────────────────────────┘    └─────────────┬───────────────────┘
                                                 │ HTTPS + X-Backend-Secret
                                                 ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │              Python backend  (FastAPI + LangGraph)               │
 │                                                                  │
 │   POST /search → text/event-stream                               │
 │                                                                  │
 │   router_graph ── classify intent (Bedrock Haiku) ──┐            │
 │                                                     ▼            │
 │      ┌── shopping        ──┐                                     │
 │      ├── price_history    ─┤   each = StateGraph:                │
 │      ├── trip             ─┤      search → extract               │
 │      ├── insta            ─┤            → reason → answer        │
 │      └── general          ─┘   with reflection + retries         │
 │                                                                  │
 │   Tools:  Serper (Google SERP)  ·  trafilatura scraper           │
 │           Bedrock LLM + Vision  ·  price_store (Postgres)        │
 └──────────────────────────────────────────────────────────────────┘
```

---

## 3. Request flow (search)

1. User submits a query on `/` or `/results`.
2. Browser POSTs `/api/search` on the TanStack Start worker.
3. `src/routes/api/search.ts`:
   - If `BACKEND_BASE_URL` is a valid http(s) URL → proxy the SSE stream from Python with `X-Backend-Secret`.
   - Otherwise → stream a **mock LangGraph-shaped agent** via the Lovable AI Gateway so the UI keeps working without the Python service.
4. Either path emits the same SSE event vocabulary, consumed by `ResultsStream`:
   `intent_detected` → `keywords_extracted` → `search_plan` → `tool_call` / `search_results` / `scrape_progress` → `reflection` → `partial_answer` (token stream) → `final` (structured payload + sources) → `error`.
5. The worker **post-processes `final`** for image + CTA enrichment per intent (Wikipedia → OG → AI fallback; Amazon / Maps / Booking / publisher), then forwards the enriched event.
6. The matching `*Result.tsx` card renders the structured payload; `SourcesGrid` + `AgentTimeline` show provenance.

---

## 4. Intents → categories → cards

| Backend intent  | UI categories                                                   | Result card              | Image source              | CTAs                                              |
| --------------- | --------------------------------------------------------------- | ------------------------ | ------------------------- | ------------------------------------------------- |
| `shopping`      | Shopping, Gifts, Tech compare                                   | `ShoppingResult`         | Wikipedia → OG            | Amazon search per pick + original URL             |
| `price_history` | Price history                                                   | `PriceHistoryResult`     | Wikipedia → OG            | Amazon · Keepa · CamelCamelCamel · Google Shopping |
| `trip`          | Trip planning                                                   | `TripResult`             | Wikipedia (skyline) → AI  | Google Maps · Booking.com · Google Flights        |
| `insta`         | Insta captions                                                  | `InstaResult`            | Wikipedia per place       | "Open in Maps" pill per suggestion                |
| `general` → `movies`  | Movies & TV                                               | `MoviesResult`           | Poster from search        | JustWatch / trailer                               |
| `general` → `books`   | Books                                                     | `BooksResult`            | Cover from search         | Goodreads · buy link                              |
| `general` → `recipes` | Recipes                                                   | `RecipesResult`          | OG from publisher         | Source URL                                        |
| `general` → `places`  | Restaurants & Food                                        | `PlacesResult`           | OG / Maps                 | Google Maps · website                             |
| `general` → `events`  | Local events                                              | `EventsResult`           | OG from publisher         | Tickets · source                                  |
| `general`       | Fitness, Health, Career, Finance, Coding, Learning, Home, Productivity, News | `GeneralResult` | Wikipedia first; OG for news queries | Top sources promoted to `related_links` |

The `regexIntentHint` in `src/routes/api/search.ts` routes restaurant / cafe / "where to eat" queries to `places`, and `news|today|this week|latest|update` queries prefer the OG image of the top article over Wikipedia.

---

## 5. Auth & roles

- Supabase email/password. `handle_new_user` trigger creates a `profiles` row and assigns the default `user` role.
- Roles live in **`public.user_roles`** (separate table — never on `profiles`).
- **`has_role(uid, role)`** is a `SECURITY DEFINER` helper used by every RLS policy that needs role checks (canonical Supabase pattern, avoids recursive RLS).
- `INSERT` / `UPDATE` / `DELETE` on `user_roles` are restricted to admins → no self-promotion.
- `/admin` is gated by the `admin` role and lets you view/edit backend API keys from the UI (`public.api_keys`, admin-only RLS).
- Required-key registry: `src/lib/required-keys.ts` (kept in sync with `backend/app/config.py`).

---

## 6. Server-side patterns

- **`createServerFn`** (`src/lib/*.functions.ts`) for app-internal RPC. Protected calls use the `requireSupabaseAuth` middleware; `attachSupabaseAuth` is registered globally in `src/start.ts` so the browser auto-attaches the bearer token.
- **File-based server routes** (`src/routes/api/*`) for raw HTTP:
  - `/api/search` — SSE proxy + mock fallback.
  - `/api/public/backend-keys` — bypasses Lovable published-site auth so the Python backend can pull config (signature-checked, no PII).
- **SSRF guard** — `isPublicHttpUrl()` blocks `localhost`, `.internal` / `.local`, IPv6, and private/link-local IPv4 (incl. `169.254.169.254` IMDS). `fetchOgImage` uses `redirect: "manual"`, allows at most one same-origin hop, and re-validates the final URL.
- **No Supabase Edge Functions** — TanStack Start's Worker runtime handles all server logic.

---

## 7. Security posture

- RLS enabled on every `public.*` table with explicit `GRANT` per role (authenticated / service_role; `anon` only where public reads are intentional).
- `user_roles` mutations restricted to `has_role(auth.uid(), 'admin')`.
- `api_keys` is admin-only (read + write).
- `storage.objects` policy on `insta-images` scopes `UPDATE` to `(storage.foldername(name))[1] = auth.uid()::text`.
- FastAPI global exception handler returns a generic `"Internal server error"` and logs the trace server-side — no `str(exc)` leakage.
- Default admin password (`admin@admin.com`) was rotated to a random 24-byte secret via migration; reset via the Supabase auth dashboard for first use.

---

## 8. Repo layout

```text
src/
  routes/
    index.tsx                       landing + search bar + 20-category grid
    results.tsx                     streamed answer view
    insta.tsx                       Instagram caption agent (image upload)
    auth.tsx                        sign-in / sign-up
    _authenticated/
      route.tsx                     auth gate (redirects to /auth)
      saved.tsx                     saved searches
      admin.tsx                     API-key admin (role: admin)
    api/
      search.ts                     SSE proxy + mock + image/CTA enrichment + SSRF
      public/backend-keys.ts        key sync for Python backend
  components/
    SearchBar.tsx · ResultsStream.tsx · SiteHeader.tsx · CategoryGrid.tsx
    results/
      ShoppingResult · PriceHistoryResult · TripResult · InstaResult
      MoviesResult · BooksResult · RecipesResult · PlacesResult · EventsResult
      GeneralResult · SourcesGrid · AgentTimeline · ResearchPanel
      SafeImage · DetailDisclosure
  lib/
    api-keys.functions.ts           admin CRUD over api_keys
    required-keys.ts                expected backend secrets registry
    search/
      types.ts                      SSE + structured payload types
      categories.ts                 20-category homepage registry
      citations.tsx                 inline citation rendering
  integrations/supabase/            auto-generated client + middleware (do not edit)
  start.ts                          registers attachSupabaseAuth middleware

backend/
  app/
    main.py                         FastAPI + SSE + generic error handler
    config.py · llm.py · router_graph.py · schemas.py · cache.py
    agents/
      _pipeline.py                  shared search→extract→reason→answer graph
      shopping.py · price_history.py · trip.py · insta.py · general.py
    tools/
      serper.py · scraper.py · price_store.py · bedrock_vision.py · places.py
  Dockerfile · pyproject.toml · .env.example

supabase/migrations/                tables, RLS, roles, storage policies, hardening
```

---

## 9. Running locally

### Frontend

Managed by Lovable — open the preview in the editor. Lovable Cloud is already wired (`VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` injected).

### Python backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e .
cp .env.example .env   # fill values (AWS, Bedrock model IDs, Serper, DATABASE_URL, BACKEND_SHARED_SECRET)
uvicorn app.main:app --reload --port 8000
```

Then in the Lovable project set these secrets and deploy:

- `BACKEND_BASE_URL` = `http://localhost:8000` (or your deployed URL)
- `BACKEND_SHARED_SECRET` = must match the backend's `.env`

> If `BACKEND_BASE_URL` is empty or not a valid http(s) URL, `/api/search` falls back to the mock agent via the Lovable AI Gateway so the UI keeps working.

---

## 10. Environment variables

### Frontend (build-time, public)

| Variable                          | Used for                       |
| --------------------------------- | ------------------------------ |
| `VITE_SUPABASE_URL`               | Browser Supabase client        |
| `VITE_SUPABASE_PUBLISHABLE_KEY`   | Browser Supabase client (RLS)  |

### TanStack Start worker (runtime, server-only)

| Variable                  | Used for                                                |
| ------------------------- | ------------------------------------------------------- |
| `BACKEND_BASE_URL`        | Where `/api/search` proxies to (empty → mock fallback)  |
| `BACKEND_SHARED_SECRET`   | Sent as `X-Backend-Secret` to the Python backend        |
| `LOVABLE_API_KEY`         | Lovable AI Gateway (mock agent fallback)                |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin-only operations (never exposed to client)       |

### Python backend (`backend/.env`)

| Variable                                          | Used for                                  |
| ------------------------------------------------- | ----------------------------------------- |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Bedrock + IAM (or use an IAM role)  |
| `BEDROCK_MODEL_REASONING` / `_ROUTER` / `_VISION` | Claude 3.5 Sonnet / Haiku / Vision IDs    |
| `SERPER_API_KEY`                                  | Google SERP via serper.dev                |
| `DATABASE_URL`                                    | Postgres for price history                |
| `BACKEND_SHARED_SECRET`                           | Must match the Lovable secret             |
| `CORS_ALLOW_ORIGIN`                               | Defaults to `*`                           |

---

## 11. Deployment

- **Frontend** — published from Lovable to `https://lensr-shivang.lovable.app`. Stable preview URL: `project--{project-id}-dev.lovable.app`.
- **Backend** — Dockerfile included (`backend/Dockerfile`). Recommended: AWS App Runner or ECS Fargate (close to Bedrock, IAM roles instead of static keys). Fly.io and Render also work — set env vars and expose port 8000.

---

## 12. Default admin

A default admin (`admin@admin.com`) is created by migration with the `admin` role. The initial weak password was rotated to a random 24-byte secret by the security-hardening migration — reset it via the Supabase auth dashboard before first sign-in.

---

## 13. Credits

Built with [Lovable](https://lovable.dev). Search powered by [Serper.dev](https://serper.dev) and AWS Bedrock (Anthropic Claude).
