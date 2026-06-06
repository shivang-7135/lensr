## Goal

Make result cards visually richer and more actionable by surfacing **images** and **buy / related links** per intent. Today, shopping picks have a "Source" link but no thumbnail; trip days have no destination imagery; insta place suggestions have no preview; general results have only a sources list.

## Scope (frontend + synthesis JSON only)

No new search providers, no scrapers. Images and links come from the LLM synthesis step (Gemini `google_search` grounding already returns URLs in citations), enriched with one optional thumbnail field per item.

## Changes

### 1. Schema additions — `src/lib/search/types.ts`

Add optional fields (all nullable, render-only):

- `ShoppingPick`: `image_url?: string`, `buy_links?: { label: string; url: string }[]`
- `TripDay`: `image_url?: string`
- `TripStructured`: `related_links?: { label: string; url: string }[]` (official tourism site, booking, maps)
- `InstaStructured.place_suggestions[]`: `image_url?: string`
- `GeneralStructured`: `related_links?: { label: string; url: string }[]`
- `Source`: `image_url?: string` (favicon or og:image, optional)

### 2. Synthesis prompt — `src/routes/api/search.ts`

Update `schema_hint`-equivalent JSON instructions for each intent to request:

- `image_url`: a direct https image URL drawn from the evidence (product page hero, Wikipedia/Wikimedia, official site). Must be a real URL found in research, never invented. Omit if none.
- `buy_links` (shopping) / `related_links` (trip, general): 2–4 labeled outbound links picked from the gathered sources (e.g. "Amazon", "Best Buy", "Official site", "Wikipedia"). Reuse source URLs already cited.

Validation: drop any `image_url` / link whose URL doesn't appear in the gathered sources list (prevents hallucinated images). If validation strips everything, the field is simply absent and the UI falls back to current layout.

also with text generate the result in insta as well.

price history should also show like a graph to get the lowest price possible.

### 3. UI rendering

- `**ShoppingResult.tsx**`: add a 16:9 thumbnail at the top of each pick card (lazy-loaded, rounded, `object-cover`, graceful fallback to a tinted placeholder on `onError`). Replace the single "Source" link with a row of "Buy" pill buttons from `buy_links`, falling back to `url`.
- `**TripResult.tsx**`: add a slim banner image per day (when present) and a "Related links" row under the itinerary.
- `**InstaResult.tsx**`: render thumbnails next to place suggestions.
- `**GeneralResult.tsx**`: render "Related links" pill row above the detail disclosure.
- `**SourcesGrid.tsx**`: if `image_url` (favicon) is present, show a 16px icon next to the title.

All images use `loading="lazy"`, `referrerPolicy="no-referrer"`, and a `useState`-based error fallback that hides the `<img>` if it fails to load — so broken hotlinks never leave a broken-image icon visible.

### 4. Out of scope

- Server-side OG/favicon scraping
- Image proxy / caching
- Affiliate link rewriting
- Backend Python pipeline changes (it already passes structured JSON through; once the JSON contract is widened, the Python agents can opt in later)