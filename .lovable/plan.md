## Goal

Bring the remaining categories up to the same bar as Movies / Books / Places / Recipes / Events: pull a **real image** (Wikipedia first, Open Graph fallback) and guarantee at least one **click-to-action** link per item — even when the LLM omits one.

## Scope of changes (only `src/routes/api/search.ts` + a few result cards + types)

### 1. New shared helpers in `src/routes/api/search.ts`

- `fetchOgImage(url)` — fetch the source URL (HEAD-checked, 2s timeout, only HTML), regex-extract `og:image` / `twitter:image`. Used as a fallback when Wikipedia returns nothing.
- `pickImage(queries[], fallbackUrls[])` — try `fetchWikiImage` for each query string, then `fetchOgImage` for each fallback URL, return first hit. Reused everywhere.
- `amazonSearch(q)`, `googleShoppingSearch(q)`, `googleMapsSearch(q)`, `bookingSearch(dest)`, `googleNewsSearch(q)` — small URL builders (mirroring existing `buildWatchUrl`).

### 2. Shopping / Gifts / Tech (all already route to `shopping` intent)

In the `finalIntent === "shopping"` enrichment branch:
- For every pick, if `image_url` missing → `pickImage([name + " product", name], buy_links/url)`.
- Always ensure `buy_links` has at least an **Amazon search link** (`amazonSearch(name)`) when none survived sanitization, plus the original `url` if present.
- Mark the Amazon link with `label: "Amazon"` so the existing pill renders the right text.

No card changes needed — `ShoppingResult.tsx` already renders `image_url` + `buy_links` pills.

### 3. Trip + Insta places (destination photos + Maps/Booking)

Trip enrichment:
- If `hero_image_url` missing → `pickImage([destination, destination + " skyline"], [])` (replaces the current AI-generated hero — real photo preferred, AI is fallback only).
- For each `days[i]` missing `image_url` → `fetchWikiImage(theme + " " + destination)`.
- Ensure `related_links` always contains at least: **Google Maps** (`googleMapsSearch(destination)`), **Booking.com** (`bookingSearch(destination)`), **Google Flights** search.

Insta enrichment:
- For each `place_suggestions[i]` missing `image_url` → `fetchWikiImage(name)`.
- Ensure each suggestion has a `url` → fall back to `googleMapsSearch(name)`.
- Update `InstaResult.tsx` to render a small **"Open in Maps"** pill on each suggestion (uses `ExternalLink` icon already imported pattern from MoviesResult).

### 4. Restaurants / Food → Places

The `regexIntentHint` already catches `restaurant|cafe|...`. Strengthen it: add `food near me`, `where to eat`, `dinner spot`, `breakfast spot`, `brunch`, `bakery`, `dessert`, `bar near`. No new intent — guarantees the food queries land on the Places card with its existing Maps/website CTAs.

### 5. News digest + remaining general categories (fitness, health, career, finance, code, learn, home, tools, news)

These stay on `general` intent (per user — "for other remaining categories use wikipedia"). In the general post-process branch (new):
- If `hero_image_url` missing → `pickImage([query, first entity from keywords], firstFewSourceUrls)`.
- Promote sources into `related_links` when the LLM didn't fill them: take top 3 sources, label = hostname, so the card always has external CTAs (read-on-publisher behavior).
- For news-style queries (regex: `news|today|this week|latest|update`) prefer Open Graph image of the top source over Wikipedia so users see the actual article hero.

`GeneralResult.tsx` already renders `hero_image_url` and `related_links` — no changes needed.

### 6. Types

`src/lib/search/types.ts`:
- `InstaCaption.place_suggestions` items already allow `url`/`image_url` — no change.
- No new fields; existing schema covers everything.

## Files

```text
src/routes/api/search.ts            # main edits: helpers + enrichment branches + regex
src/components/results/InstaResult.tsx   # add "Open in Maps" pill per suggestion
```

That's it — Shopping / Trip / General cards already render the new fields, so no UI rewrites are needed beyond the Insta pill.

## Behavior contract

After this change, every result card across all 20 homepage categories will:
1. Show a real image (Wikipedia → Open Graph → AI fallback already in place for trip/insta hero).
2. Have at least one external CTA button per item (Amazon / Maps / Booking / publisher).
3. Never block on slow image lookups — all image fetches run in `Promise.all` with try/catch, and the card renders without an image if everything fails (existing `SafeImage` handles that).
