# Lensr

> Intent-aware search assistant. Ask in natural language, get a category-tailored answer card with a real image and at least one click-out CTA — every time.

- **Live:** https://lensr.studio
- **Stack:** React 19 · TanStack Start v1 (Vercel) · Tailwind v4 · shadcn/ui · Supabase · FastAPI · LangGraph · AWS Bedrock (Claude 3.5 Sonnet / Haiku) · Serper.dev

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
 │      Supabase (Postgres)   │    │  TanStack Start  (Vercel)       │
 │                            │    │                                 │
 │  auth.users                │    │  POST /api/search   (SSE)       │
 │  public.profiles           │    │   └─ proxy Python backend       │
 │  public.user_roles         │    │      with X-Backend-Secret      │
 │  public.api_keys (admin)   │    │                                 │
 │  public.saved_searches     │    │  createServerFn (RPC):          │
 │  storage: insta-images     │    │   listApiKeys / upsert /        │
 │                            │    │   deleteApiKey / checkIsAdmin   │
 │  RLS + GRANTs everywhere   │    │                                 │
 │  has_role(uid,'admin')     │    │                                 │
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
2. Browser POSTs `/api/search` on the TanStack Start server.
3. `src/routes/api/search.ts`:
   - Proxies the SSE stream from the Python backend with `X-Backend-Secret`.
   - Returns 503 if `BACKEND_BASE_URL` is not configured.
4. The backend emits SSE events consumed by `ResultsStream`:
   `intent_detected` → `keywords_extracted` → `search_plan` → `tool_call` / `search_results` / `scrape_progress` → `reflection` → `partial_answer` (token stream) → `final` (structured payload + sources) → `error`.
5. The matching `*Result.tsx` card renders the structured payload; `SourcesGrid` + `AgentTimeline` show provenance.

---

## 4. Intents → categories → cards

| Backend intent  | UI categories                                                   | Result card              | Image source              | CTAs                                              |
| --------------- | --------------------------------------------------------------- | ------------------------ | ------------------------- | ------------------------------------------------- |
| `shopping`      | Shopping, Gifts, Tech compare                                   | `ShoppingResult`         | Wikipedia → OG            | Amazon search per pick + original URL             |
| `price_history` | Price history                                                   | `PriceHistoryResult`     | Wikipedia → OG            | Amazon · Keepa · CamelCamelCamel · Google Shopping |
| `trip`          | Trip planning                                                   | `TripResult`             | Wikipedia (skyline) → AI  | Google Maps · Booking.com · Google Flights        |
| `insta`         | Insta captions                                                  | `InstaResult`            | Wikipedia per place       | "Open in Maps" pill per suggestion                |
| `movies`        | Movies & TV                                                     | `MoviesResult`           | Poster from search        | JustWatch / trailer                               |
| `books`         | Books                                                           | `BooksResult`            | Cover from search         | Goodreads · buy link                              |
| `recipes`       | Recipes                                                         | `RecipesResult`          | OG from publisher         | Source URL                                        |
| `places`        | Restaurants & Food                                              | `PlacesResult`           | OG / Maps                 | Google Maps · website                             |
| `events`        | Local events                                                    | `EventsResult`           | OG from publisher         | Tickets · source                                  |
| `general`       | Fitness, Health, Career, Finance, Coding, Learning, Home, News  | `GeneralResult`          | Wikipedia first; OG for news | Top sources promoted to `related_links`        |

---

## 5. Auth & roles

- Supabase email/password + Google OAuth (via Supabase Auth provider).
- `handle_new_user` trigger creates a `profiles` row and assigns the default `user` role.
- Roles live in **`public.user_roles`** (separate table — never on `profiles`).
- **`has_role(uid, role)`** is a `SECURITY DEFINER` helper used by every RLS policy.
- `INSERT` / `UPDATE` / `DELETE` on `user_roles` are restricted to admins → no self-promotion.
- `/admin` is gated by the `admin` role and lets you view/edit backend API keys from the UI.

---

## 6. Security posture

- RLS enabled on every `public.*` table with explicit `GRANT` per role.
- `user_roles` mutations restricted to `has_role(auth.uid(), 'admin')`.
- `api_keys` is admin-only (read + write).
- Storage policy on `insta-images` scopes uploads to user's own folder.
- FastAPI global exception handler returns generic errors — no stack trace leakage.
- SSRF protection in image fetching blocks localhost, private IPs, and link-local addresses.

---

## 7. Running locally

### Frontend

```bash
bun install
bun run dev
```

Set environment variables in `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
BACKEND_BASE_URL=http://localhost:8000
BACKEND_SHARED_SECRET=your-shared-secret
```

### Python backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e .
cp .env.example .env   # fill values (AWS, Bedrock model IDs, Serper, DATABASE_URL, BACKEND_SHARED_SECRET)
uvicorn app.main:app --reload --port 8000
```

---

## 8. Environment variables

### Frontend (build-time, public)

| Variable                          | Used for                       |
| --------------------------------- | ------------------------------ |
| `VITE_SUPABASE_URL`               | Browser Supabase client        |
| `VITE_SUPABASE_PUBLISHABLE_KEY`   | Browser Supabase client (RLS)  |

### TanStack Start server (runtime, server-only)

| Variable                  | Used for                                                |
| ------------------------- | ------------------------------------------------------- |
| `BACKEND_BASE_URL`        | Where `/api/search` proxies to (required)               |
| `BACKEND_SHARED_SECRET`   | Sent as `X-Backend-Secret` to the Python backend        |

### Python backend (`backend/.env`)

| Variable                                          | Used for                                  |
| ------------------------------------------------- | ----------------------------------------- |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Bedrock + IAM (or use an IAM role)  |
| `BEDROCK_MODEL_REASONING` / `_ROUTER` / `_VISION` | Claude 3.5 Sonnet / Haiku / Vision IDs    |
| `SERPER_API_KEY`                                  | Google SERP via serper.dev                |
| `DATABASE_URL`                                    | Postgres for price history                |
| `BACKEND_SHARED_SECRET`                           | Must match the frontend secret            |
| `CORS_ALLOW_ORIGIN`                               | Defaults to `*`; set to `https://lensr.studio` in prod |

---

## 9. Deployment

- **Frontend** — Deployed to Vercel at `https://lensr.studio`. Auto-deploys on push to `main`.
- **Backend** — Dockerfile included (`backend/Dockerfile`). Recommended: AWS App Runner or ECS Fargate (close to Bedrock, IAM roles instead of static keys). Fly.io and Render also work — set env vars and expose port 8000.

---

## 10. Credits

Search powered by [Serper.dev](https://serper.dev) and AWS Bedrock (Anthropic Claude).
