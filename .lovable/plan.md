# Fix: real grounded answers + better fallback + smarter intent

The current screen happens because the second LLM call (structured-JSON synthesis with `google/gemini-2.5-flash`) returned something that didn't parse as JSON, so `synthesizeStructured` returned the placeholder `{ tldr: "No structured answer available.", detail_markdown: evidence }`. The frontend then rendered that as a Shopping card with an empty "Recommendation" and dumped the evidence brief verbatim. The evidence brief itself is real grounded data — we just throw it away into raw markdown.

Three real problems to fix:

1. **Structured synthesis is brittle** — single JSON-mode call on `gemini-2.5-flash` with no retry, no JSON repair, no schema validation. When it fails the UI shows the broken card.
2. **Intent classification is regex-based** — "Buy porsche gt3 germany" matches `/buy|under \$|best/`, so it gets shoved into the Shopping schema even though there is no comparable product list to pick from. Wrong template → wrong card.
3. **Fallback rendering is wrong** — when synthesis fails we should render the evidence as a clean General result with proper markdown (GFM, citations linked to sources), not a half-empty Shopping card.

## Changes

### 1. `src/routes/api/search.ts` — backend pipeline

- **LLM-based intent classification.** Replace `classifyIntent` regex with one `gemini-2.5-flash-lite` JSON call: `{"intent": "...", "confidence": 0..1, "reason": "..."}`. Keep the regex as a fast pre-hint passed to the LLM. For low confidence (<0.6) default to `general` instead of guessing shopping.
- **Stronger grounded research.** Keep `google/gemini-2.5-flash` with `google_search` tool, but:
  - Drop the "do not write the final answer yet" framing and instead ask for: a 350–600 word evidence brief, with inline `[n]` citations and a numbered `Sources:` block at the end, sorted by usefulness.
  - Parse sources from grounding metadata in all known response shapes (`message.grounding_metadata`, `message.metadata.grounding_metadata`, `candidates[0].grounding_metadata`, OpenAI `tool_calls` results). Fall back to URL extraction from the brief — but only keep URLs that also appear in the model's `Sources:` list to avoid noise.
  - If 0 sources come back, surface a `stage: "search_loop_1_empty"` event and skip structured synthesis entirely → render as General with the evidence.
- **Robust structured synthesis.**
  - Switch the synthesis model to `google/gemini-3-flash-preview` (stronger JSON adherence) and keep `response_format: json_object`.
  - On parse failure, run a single repair pass: send the bad output back to `gemini-2.5-flash-lite` with `"Repair this to valid JSON matching schema X. Reply with JSON only."` and try once more.
  - Validate the returned object against the intent schema (required keys present and non-empty: `tldr`, plus intent-specific keys like `picks` for shopping, `days` for trip, `captions` for insta). If validation fails, **degrade to `general`** with `{ tldr, key_facts, detail_markdown: evidence }` instead of returning a broken card.
  - Never return the literal string `"No structured answer available."` — that's the tell that everything below it is unstyled markdown.
- **Sources fidelity.** Pass the real numbered source list into the synthesis prompt and force the model to reuse those exact `[n]` indices in `detail_markdown` so citations resolve.

### 2. `src/components/ResultsStream.tsx` — render the right card

- New helper `pickRenderer(intent, structured, markdown, sources)`:
  - If `structured` is missing or its intent-required keys are empty (e.g. shopping with no `picks`, trip with no `days`), render as `GeneralResult` built from `{ tldr: structured?.tldr || firstParagraph(markdown), key_facts: [], detail_markdown: markdown }`.
  - Otherwise render the intent-specific component as today.
- Render inline `[n]` citations in markdown as clickable superscript links to the corresponding source URL (small `<a>` custom component in `ReactMarkdown`).

### 3. `src/components/results/GeneralResult.tsx` — usable as the universal fallback

- Already has `tldr` + `key_facts` + `detail_markdown`. Ensure `remark-gfm` is wired (it is) and add the same citation-link renderer so `[1]`, `[2]` inside the brief become clickable.
- If `key_facts` is empty, hide the heading instead of rendering an empty section.

### 4. `src/components/results/AgentTimeline.tsx`

- Add a row for the new `search_loop_1_empty` stage so the user sees "no sources found — falling back to model knowledge" instead of silent confusion.

## Out of scope

- Real Serper pipeline (already lives on the Python backend; this fix is for the TS fallback the preview is hitting).
- Adding caching, save-search, or multi-loop reflection in the TS fallback.
- Redesigning the Shopping/Trip/Price/Insta cards themselves — they're fine when fed valid data.

## Technical notes

- JSON repair pass uses a small/cheap model so it doesn't add meaningful latency.
- Intent schema validation lives next to `SCHEMA_HINT` in `search.ts` as a tiny `validators: Record<Intent, (o) => boolean>` map — no Zod needed server-side.
- Citation linker: a `components={{ a, sup }}` map on `ReactMarkdown` resolves `[n]` → `sources[n-1].url`. A small regex pre-pass in markdown converts `[1]` → `[<sup>1</sup>](#)` only when the integer is within range.
- Keep the existing SSE event shape; only add `search_loop_1_empty` and reuse `stage`.

## After this

For "Buy porsche gt3 germany" the user will see either:
- a clean **General** card with TL;DR, key facts, and the full grounded brief with linked `[n]` citations, or
- a real Shopping card with actual picks (e.g., 992 GT3, GT3 Touring, GT3 RS) only when there's enough comparable data to fill it.

No more half-empty cards saying "No structured answer available." over real research.
