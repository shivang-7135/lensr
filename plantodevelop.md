# Plan: Remove Lovable Identity & Document Architecture

**TL;DR:** Remove all 7 Lovable-specific touchpoints (dependencies, OAuth, error reporting, AI gateway fallback, Vite config, branding, hosting) and replace with self-owned alternatives. Then write a comprehensive architecture document so you can explain the project end-to-end.

---

## Phase 1: Replace Lovable Vite Config

**Goal:** Own your build toolchain.

1. Remove `@lovable.dev/vite-tanstack-config` from devDependencies
2. Rewrite `vite.config.ts` to directly use `@tanstack/start/plugin` + React + Tailwind Vite plugins
3. Verify: `bun run build` succeeds

**Files:** `vite.config.ts`, `package.json`

---

## Phase 2: Replace Lovable OAuth with Direct Supabase OAuth

**Goal:** Remove `@lovable.dev/cloud-auth-js` and use Supabase's native OAuth.

1. Remove `@lovable.dev/cloud-auth-js` from dependencies
2. **Delete** `src/integrations/lovable/index.ts`
3. Update `src/routes/auth.tsx`:
   - Replace `lovable.auth.signInWithOAuth("google", ...)` with `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: ... } })`
   - Configure Google OAuth provider directly in Supabase Dashboard (already supported natively)
4. Remove the `lovable` OAuth provider option (it's Lovable-specific)
5. Ensure Supabase project has Google OAuth configured (Dashboard → Auth → Providers → Google)

**Files:** `src/integrations/lovable/index.ts` (DELETE), `src/routes/auth.tsx`, `package.json`

---

## Phase 3: Remove Lovable Error Reporting

**Goal:** Replace with your own error handling (or a service like Sentry).

1. **Delete** `src/lib/lovable-error-reporting.ts`
2. Update `src/routes/__root.tsx`:
   - Remove import of `reportLovableError`
   - Replace with either:
     - **Option A:** Console-only logging (simplest, for now)
     - **Option B:** Sentry integration (`@sentry/react`)
     - **Option C:** Custom error boundary that logs to your own backend
3. Remove any `window.__lovableEvents` references

**Files:** `src/lib/lovable-error-reporting.ts` (DELETE), `src/routes/__root.tsx`

---

## Phase 4: Remove Lovable AI Gateway Fallback

**Goal:** The fallback agent in `src/routes/api/search.ts` uses `LOVABLE_API_KEY` to call Lovable's AI gateway when the Python backend is unavailable. Remove this.

1. In `src/routes/api/search.ts`:
   - Remove the entire fallback branch that calls Lovable AI Gateway
   - If `BACKEND_BASE_URL` is not configured, return an error response (503 Service Unavailable) instead of falling back to Lovable
   - Remove `LOVABLE_API_KEY` from env references
2. This makes the Python backend **required** (not optional)

**Files:** `src/routes/api/search.ts`

---

## Phase 5: Remove Branding & Meta Tags

**Goal:** Replace Lovable branding with your own.

1. In `src/routes/__root.tsx`:
   - Change `{ name: "author", content: "Lovable" }` → your name/brand
   - Change `{ name: "twitter:site", content: "@Lovable" }` → your Twitter handle
2. Update `README.md`:
   - Remove `https://lensr-shivang.lovable.app` URL reference
   - Add your own deployment URL
3. **Delete** `.lovable/` directory

**Files:** `src/routes/__root.tsx`, `README.md`, `.lovable/` (DELETE)

---

## Phase 6: Deploy to Vercel (lensr.studio)

**Goal:** Deploy frontend to Vercel with custom domain `lensr.studio`.

**Platform: Vercel** (TanStack Start has official Vercel adapter via Nitro/Vinxi)

1. Install Vercel CLI: `bun add -g vercel`
2. Add `vercel.json` with TanStack Start build config:
   ```json
   {
     "$schema": "https://openapi.vercel.sh/vercel.json",
     "framework": null,
     "buildCommand": "bun run build",
     "outputDirectory": ".output",
     "installCommand": "bun install"
   }
   ```
3. Set environment variables on Vercel Dashboard (Project → Settings → Environment Variables):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `BACKEND_BASE_URL` (your Python backend URL)
   - `BACKEND_SHARED_SECRET`
4. Connect custom domain `lensr.studio`:
   - Vercel Dashboard → Project → Domains → Add `lensr.studio`
   - Update DNS: Add `A` record → `76.76.21.21` and `CNAME www` → `cname.vercel-dns.com`
5. Update Supabase OAuth redirect URLs to `https://lensr.studio/auth`
6. Update `CORS_ALLOW_ORIGIN` in Python backend to `https://lensr.studio`
7. Set up CI/CD:
   - Connect GitHub repo to Vercel (auto-deploys on push to `main`)
   - Preview deployments on PRs

**Files:** New: `vercel.json`, `.github/workflows/deploy.yml` (optional if using Vercel GitHub integration)

---

## Phase 7: Write Architecture Documentation

**Goal:** A clear document explaining the system end-to-end.

Create `docs/ARCHITECTURE.md` covering:

1. **System Overview** — What Lensr is (AI-powered search engine with specialized agents)
2. **Architecture Diagram** — Browser → TanStack Start API → FastAPI + LangGraph → Bedrock/Serper
3. **Tech Stack** — React 19, TanStack Start, FastAPI, LangGraph, AWS Bedrock, Serper, Supabase
4. **Request Flow** — Step-by-step: user query → SSE stream → agent pipeline → structured result
5. **Agent System** — How LangGraph orchestrates: intent classification → dispatch → pipeline (keywords → search → scrape → reflect → synthesize)
6. **Database Schema** — Tables, RLS policies, roles
7. **Authentication** — Supabase Auth + Google OAuth + admin/user roles
8. **Deployment** — How to deploy frontend + backend
9. **Environment Variables** — Complete reference
10. **Security** — SSRF protection, RLS, secret management

**Files:** New: `docs/ARCHITECTURE.md`

---

## Verification Checklist

1. `grep -ri "lovable" src/ --include="*.ts" --include="*.tsx"` → **zero results**
2. `bun run build` succeeds
3. `bun run dev` starts, search works with Python backend running
4. Google OAuth sign-in works via Supabase directly
5. Search returns graceful 503 when backend is down (no more Lovable fallback)
6. Frontend deploys to Vercel and `https://lensr.studio` resolves correctly
7. Architecture doc is readable and accurate
8. Supabase OAuth callback redirects to `https://lensr.studio/auth` (not `*.lovable.app`)

---

## Decisions

| Decision | Recommendation |
|----------|---------------|
| Error reporting replacement | Console.error for now; add Sentry later if needed |
| Frontend deployment | **Vercel** with custom domain `lensr.studio` |
| Fallback when backend is down | Return 503 — backend is required |
| OAuth providers | Google only via Supabase; add Apple/Microsoft later |
| Domain | `lensr.studio` (already owned) |

---

## Further Considerations

1. **Supabase project ownership** — Ensure your Supabase project is under your own account (not created via Lovable). If it was provisioned by Lovable, you may need to export the schema and re-create it under your own Supabase org.
2. **DNS propagation** — After adding `lensr.studio` to Vercel, DNS changes take 5–60 minutes. Vercel auto-provisions SSL via Let's Encrypt.
3. **CI/CD** — Vercel's GitHub integration auto-deploys on push to `main` and creates preview URLs for PRs. No separate `.github/workflows` needed unless you want additional checks (lint, test, etc.)
4. **Supabase redirect URLs** — Update Supabase Dashboard → Auth → URL Configuration → Site URL to `https://lensr.studio` and add it to Redirect URLs.

---

## Scope

**Included:**
- Remove all 7 Lovable touchpoints (deps, OAuth, error reporting, AI gateway, branding, hosting config, `.lovable/` dir)
- Self-deploy frontend
- Architecture documentation

**Excluded:**
- Backend changes (Python backend is already independent of Lovable)
- Supabase migration (Supabase itself is fine to keep — it's your own project)
- Feature changes (no new functionality)

