# Lensr

> AI-powered intent-aware search engine. Ask anything in natural language — get a structured, category-specific answer card with sources, not just blue links.

- **Live:** https://lensr.studio
- **Stack:** React 19 · TanStack Start v1 (Vercel) · Tailwind v4 · shadcn/ui · Supabase · FastAPI · LangGraph · AWS Bedrock (Claude Sonnet 4.5 / Haiku 4.5) · Serper.dev

---

## 1. What it does

Lensr classifies every query into one of **35 backend intents** and renders a purpose-built result card. The pipeline searches the web in real-time, scrapes relevant pages, and synthesizes a structured JSON response tailored to the detected intent.

**35 intents:** shopping, price_history, trip, insta, movies, recipes, books, places, events, tech, health, finance, news, sports, howto, learning, jobs, local, comparison, gift, legal, gaming, diy, fitness, pets, music, productivity, weather, real_estate, automotive, food, fashion, parenting, dating, general.

**10 specialized result cards:** ShoppingResult, TripResult, PriceHistoryResult, InstaResult, MoviesResult, RecipesResult, BooksResult, PlacesResult, EventsResult + GeneralResult (fallback for all other intents).

For every result we guarantee:

1. **Real sources** — Every answer cites its web sources with clickable links.
2. **External CTAs** — Amazon, Google Maps, Booking.com, Keepa, or publisher URLs — injected even when the LLM omits one.
3. **Live SSE streaming** — intent → keywords + plan → parallel search → scrape → synthesize → final structured payload. Full pipeline visibility in the UI.

---

## 2. Architecture

```text
 ┌──────────────────────────────────────────────────────────────────┐
 │                            Browser                               │
 │   React 19 · TanStack Router · Tailwind v4 · shadcn/ui           │
 │   Routes: /  /results  /insta  /saved  /admin  /auth             │
 │   Components: SearchBar · ResultsStream · 10 Result cards        │
 └──────────┬──────────────────────────────────────────┬────────────┘
            │ supabase-js (auth, RLS reads, storage)   │ fetch SSE
            ▼                                          ▼
 ┌────────────────────────────┐    ┌─────────────────────────────────┐
 │      Supabase (Postgres)   │    │  TanStack Start  (Vercel)       │
 │                            │    │                                 │
 │  auth.users                │    │  POST /api/search   (SSE proxy) │
 │  public.profiles           │    │   ├─ origin allowlist (CORS)    │
 │  public.user_roles         │    │   ├─ body size + query length   │
 │  public.api_keys (admin)   │    │   └─ timing-safe auth           │
 │  public.saved_searches     │    │                                 │
 │  public.uploaded_images    │    │  GET /api/public/backend-keys   │
 │  storage: insta-images     │    │   └─ crypto.timingSafeEqual     │
 │                            │    │                                 │
 │  RLS + GRANTs everywhere   │    │  createServerFn RPCs:           │
 │  has_role(uid,'admin')     │    │   listApiKeys / upsert / del    │
 └────────────────────────────┘    └─────────────┬───────────────────┘
                                                 │ HTTPS + X-Backend-Secret
                                                 ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │              Python backend  (FastAPI + LangGraph)               │
 │                                                                  │
 │   POST /search → text/event-stream                               │
 │   GET  /healthz                                                  │
 │                                                                  │
 │   router_graph ── classify intent (Haiku 4.5) ──────┐            │
 │                                                     ▼            │
 │   Adaptive search pipeline (35 agents):                          │
 │     1. Combined keyword+plan (single LLM call)                   │
 │     2. Speculative seed search ‖ LLM planning                    │
 │     3. Fan-out Serper queries (parallel)                         │
 │     4. Scrape top 3 pages (6s timeout, SSRF-protected)           │
 │     5. Synthesize structured JSON (Sonnet 4.5)                   │
 │                                                                  │
 │   Tools:  Serper (Google SERP)  ·  trafilatura scraper           │
 │           Bedrock LLM (Sonnet 4.5 + Haiku 4.5 + Vision)         │
 └──────────────────────────────────────────────────────────────────┘
```

---

## 3. Request flow (search)

1. User submits a query on `/` or `/results`.
2. Browser POSTs `/api/search` on the TanStack Start server.
3. `src/routes/api/search.ts`:
   - Validates origin, body size (8 KB max), and query length (2000 chars).
   - Proxies the SSE stream to the Python backend with `X-Backend-Secret`.
   - Returns 503 if `BACKEND_BASE_URL` is not configured.
4. Python backend (`/search`):
   - Timing-safe auth check via `hmac.compare_digest`.
   - Validates query (`max_length=2000`).
   - Classifies intent with Haiku 4.5 (~1.5s).
   - Runs the optimized adaptive pipeline (seed search in parallel with LLM planning).
5. SSE events consumed by `ResultsStream` (with 90s client-side timeout):
   `intent_detected` → `keywords_extracted` → `search_plan` → `tool_call` / `search_results` / `scrape_progress` → `partial_answer` → `final` (structured payload + sources).
6. The matching `*Result.tsx` card renders the structured payload; `SourcesGrid` + `ResearchPanel` show provenance.

---

## 4. Intents → Result Cards

| Result Card          | Handles intents      | Key features                                        |
| -------------------- | -------------------- | --------------------------------------------------- |
| `ShoppingResult`     | shopping             | Product picks with pros/cons, prices, Amazon CTAs   |
| `PriceHistoryResult` | price_history        | Price range, buy score, Keepa/CamelCamelCamel links |
| `TripResult`         | trip                 | Day-by-day itinerary, Maps/Booking/Flights CTAs     |
| `InstaResult`        | insta                | Caption styles + nearby place suggestions           |
| `MoviesResult`       | movies               | Movie/TV picks with ratings, streaming links        |
| `RecipesResult`      | recipes              | Step-by-step recipes with ingredients               |
| `BooksResult`        | books                | Book recommendations with Goodreads links           |
| `PlacesResult`       | places               | Venue cards with Maps links                         |
| `EventsResult`       | events               | Event listings with ticket links                    |
| `GeneralResult`      | All other 26 intents | TL;DR + key facts + detail markdown                 |

---

## 5. Auth & roles

- Supabase email/password + Google OAuth.
- `handle_new_user` trigger creates a `profiles` row and assigns the default `user` role.
- Roles live in **`public.user_roles`** (separate table — never on `profiles`).
- **`has_role(uid, role)`** is a `SECURITY DEFINER` helper used by every RLS policy.
- `INSERT` / `UPDATE` / `DELETE` on `user_roles` are restricted to admins → no self-promotion.
- `/admin` is gated by the `admin` role and lets you view/edit backend API keys from the UI.

---

## 6. Security

| Layer                | Protection                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------- |
| **Database**         | RLS on all tables, explicit GRANTs, `SECURITY DEFINER` helpers                                |
| **API auth**         | Timing-safe (`hmac.compare_digest` / `crypto.timingSafeEqual`) shared secret                  |
| **CORS**             | Origin allowlist (not `*` in production)                                                      |
| **Input validation** | Query max 2000 chars, body max 8 KB, file upload max 10 MB                                    |
| **SSRF**             | Private IP blocklist (10.x, 172.16-31.x, 192.168.x, 169.254.x, localhost, metadata endpoints) |
| **Error handling**   | Sanitized error messages to client, request IDs for server-side debugging                     |
| **Secrets**          | Startup validation — refuses to start with insecure default in production                     |
| **Docker**           | Non-root user, multi-stage build, `.dockerignore`                                             |
| **Headers**          | X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy                  |

---

## 7. Running locally

### Prerequisites

- Node.js 20+ (or Bun)
- Python 3.11+
- AWS credentials with Bedrock access
- Serper.dev API key
- Supabase project

### Frontend

```bash
npm install      # or: bun install
npm run dev      # or: bun run dev
```

Copy `.env.example` to `.env` and fill in:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
BACKEND_BASE_URL=http://localhost:8000
BACKEND_SHARED_SECRET=your-strong-secret
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### Python backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"    # includes ruff, mypy, pytest
cp .env.example .env       # fill AWS, Serper, secret
uvicorn app.main:app --reload --port 8000
```

---

## 8. Environment variables

### Frontend (build-time, public)

| Variable                 | Used for                      |
| ------------------------ | ----------------------------- |
| `VITE_SUPABASE_URL`      | Browser Supabase client       |
| `VITE_SUPABASE_ANON_KEY` | Browser Supabase client (RLS) |

### TanStack Start server (runtime, server-only)

| Variable                | Used for                                          |
| ----------------------- | ------------------------------------------------- |
| `BACKEND_BASE_URL`      | Where `/api/search` proxies to (required)         |
| `BACKEND_SHARED_SECRET` | Sent as `X-Backend-Secret` to the Python backend  |
| `CORS_ALLOWED_ORIGINS`  | Comma-separated allowed origins for `/api/search` |

### Python backend (`backend/.env`)

| Variable                                      | Used for                                                |
| --------------------------------------------- | ------------------------------------------------------- |
| `AWS_REGION`                                  | AWS region for Bedrock (default: `us-east-1`)           |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Bedrock credentials (or use IAM role)                   |
| `BEDROCK_MODEL_REASONING`                     | Reasoning model (default: Claude Sonnet 4.5)            |
| `BEDROCK_MODEL_ROUTER`                        | Fast classification model (default: Claude Haiku 4.5)   |
| `BEDROCK_MODEL_VISION`                        | Vision model for image analysis                         |
| `SERPER_API_KEY`                              | Google SERP via serper.dev (required)                   |
| `BACKEND_SHARED_SECRET`                       | Must match the frontend secret (required in production) |
| `CORS_ALLOW_ORIGIN`                           | Frontend domain (default: `http://localhost:3000`)      |
| `DATABASE_URL`                                | Postgres connection (optional, for price history)       |

---

## 9. Deployment

### Frontend → Vercel

Deployed at `https://lensr.studio`. Auto-deploys on push to `main`.

Security headers are configured in `vercel.json` (X-Frame-Options, CSP, Referrer-Policy).

### Backend → Fly.io / Render / AWS

```bash
cd backend
docker build -t lensr-backend .
```

The Dockerfile uses a multi-stage build with a non-root user. Set all env vars via your platform's secrets manager.

- **Fly.io:** `fly.toml` included (Stockholm region, 512 MB RAM)
- **Render:** `render.yaml` included (Ohio region, close to Bedrock us-east-1)

---

## 10. CI/CD

GitHub Actions pipeline (`.github/workflows/ci.yml`):

- **Frontend:** lint → type-check → build
- **Backend:** ruff lint → ruff format → mypy → Docker build
- Runs on every push to `main` and all PRs.

---

## 11. Project structure

```
├── src/                      # Frontend (TanStack Start)
│   ├── routes/               # File-based routing
│   │   ├── index.tsx         # Homepage with category grid
│   │   ├── results.tsx       # Search results page
│   │   ├── insta.tsx         # Image upload for captions
│   │   ├── auth.tsx          # Sign in/up
│   │   ├── api/              # Server-side API routes
│   │   └── _authenticated/   # Protected routes (admin, saved)
│   ├── components/           # React components
│   │   ├── ResultsStream.tsx # SSE streaming consumer
│   │   ├── SearchBar.tsx     # Search input with suggestions
│   │   └── results/          # 10 result card components
│   └── lib/                  # Utilities, types, server functions
├── backend/                  # Python backend (FastAPI)
│   ├── app/
│   │   ├── main.py           # FastAPI entrypoint
│   │   ├── config.py         # Settings with startup validation
│   │   ├── llm.py            # Bedrock client (retry + timeout)
│   │   ├── router_graph.py   # Intent classification
│   │   ├── agents/           # 35 intent agents + shared pipeline
│   │   └── tools/            # Serper search + SSRF-protected scraper
│   ├── Dockerfile            # Multi-stage, non-root
│   └── pyproject.toml        # Dependencies + ruff/pytest config
├── supabase/                 # Database migrations
├── .github/workflows/        # CI pipeline
├── vercel.json               # Deployment + security headers
└── .env.example              # Required environment variables
```

---

## 12. Credits

Search powered by [Serper.dev](https://serper.dev) and [AWS Bedrock](https://aws.amazon.com/bedrock/) (Anthropic Claude Sonnet 4.5 & Haiku 4.5).
