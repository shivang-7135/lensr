# Lensr

Intent-aware search assistant. A TanStack Start frontend (Lovable Cloud / Supabase auth + storage) talks to a Python LangGraph backend powered by AWS Bedrock and Serper.

---

## Architecture

```
 ┌───────────────────────────────────────────────────────────────┐
 │                          Browser                              │
 │   React 19 + TanStack Router  ·  Tailwind v4  ·  shadcn/ui    │
 │   Routes: /  /results  /insta  /saved  /admin  /auth          │
 └───────────────┬───────────────────────────────┬───────────────┘
                 │ supabase-js (auth, RLS reads) │ fetch SSE
                 ▼                               ▼
 ┌────────────────────────────┐    ┌──────────────────────────────┐
 │   Lovable Cloud (Supabase) │    │  TanStack Start server       │
 │                            │    │  (Cloudflare Worker)         │
 │  auth.users                │    │                              │
 │  public.profiles           │    │  POST /api/search   (SSE)    │
 │  public.user_roles         │    │   ├─ if BACKEND_BASE_URL set │
 │  public.api_keys (admin)   │    │   │    → proxy to Python     │
 │  public.saved_searches     │    │   └─ else mock agent via     │
 │  public.uploaded_images    │    │        Lovable AI Gateway    │
 │  storage: insta-images     │    │                              │
 │                            │    │  createServerFn:             │
 │  RLS everywhere            │    │   listApiKeys / upsert /     │
 │  has_role(uid, 'admin')    │    │   deleteApiKey / checkIsAdmin│
 └────────────────────────────┘    └──────────────┬───────────────┘
                                                  │ HTTPS + X-Backend-Secret
                                                  ▼
 ┌──────────────────────────────────────────────────────────────┐
 │              Python backend  (FastAPI + LangGraph)           │
 │                                                              │
 │   POST /search → SSE stream                                  │
 │                                                              │
 │   router_graph  ── classify intent (Bedrock Haiku) ──┐       │
 │                                                      ▼       │
 │      ┌─── shopping_graph ────┐                               │
 │      ├─── price_history ─────┤  each = StateGraph:           │
 │      ├─── trip_graph ────────┤   search → extract →          │
 │      ├─── insta_graph ───────┤   reason  → answer            │
 │      └─── general_graph ─────┘                               │
 │                                                              │
 │   Tools:  Serper (Google SERP)  ·  scraper  ·  Bedrock LLM   │
 └──────────────────────────────────────────────────────────────┘
```

### Request flow (search)

1. User submits a query on `/` or `/results`.
2. Browser POSTs `/api/search` on the TanStack Start worker.
3. The worker route (`src/routes/api/search.ts`):
   - If `BACKEND_BASE_URL` is a valid http(s) URL → proxies the SSE stream from the Python backend, adding the `X-Backend-Secret` header.
   - Otherwise → streams a **mock agent** via the Lovable AI Gateway so the UI keeps working without the Python service.
4. `ResultsStream` consumes SSE events (`intent_detected`, `tool_call`, `tool_result`, `partial_answer`, `final`, `error`) and renders them live.

### Auth & roles

- Supabase email/password auth. `handle_new_user` trigger creates a `profiles` row and assigns the default `user` role.
- Roles live in `public.user_roles`; `has_role(uid, role)` is a `SECURITY DEFINER` helper used by RLS.
- `/admin` is gated by the `admin` role and lets you view/edit backend API keys from the UI (`public.api_keys`, admin-only RLS).
- Required-key registry: `src/lib/required-keys.ts` (kept in sync with `backend/app/config.py`).

### Server-side

- **TanStack server functions** (`src/lib/*.functions.ts`) for app-internal RPC — `requireSupabaseAuth` middleware for protected calls.
- **Server routes** under `src/routes/api/` for raw HTTP (`/api/search` SSE, `/api/public/backend-keys` for the Python backend to pull config).
- No Supabase Edge Functions on this stack.

---

## Repo layout

```
src/
  routes/
    index.tsx                  landing + search bar
    results.tsx                streamed answer view
    insta.tsx                  Instagram caption agent
    auth.tsx                   sign-in / sign-up
    _authenticated/
      route.tsx                auth gate (redirects to /auth)
      saved.tsx                saved searches
      admin.tsx                API-key admin (role: admin)
    api/
      search.ts                SSE proxy + mock fallback
      public/backend-keys.ts   key sync for Python backend
  components/                  SiteHeader, SearchBar, ResultsStream, ui/*
  lib/
    api-keys.functions.ts      admin CRUD over api_keys
    required-keys.ts           registry of expected backend secrets
    search/types.ts            SSE event types
  integrations/supabase/       auto-generated client + middleware
backend/                       Python LangGraph service (see backend/README.md)
supabase/migrations/           SQL migrations (tables, RLS, roles)
```

---

## Running locally

Frontend is managed by Lovable — just open the preview. To run the Python backend, see [`backend/README.md`](backend/README.md).

After deploying the backend, set these Lovable secrets:

- `BACKEND_BASE_URL` — full URL of the Python service, e.g. `https://lensr-backend.fly.dev`
- `BACKEND_SHARED_SECRET` — must match the backend's `.env`

> If `BACKEND_BASE_URL` is empty or not a valid http(s) URL, `/api/search` falls back to the mock agent automatically.

Default admin login (created by migration): `admin@admin.com` / `admin123`.
