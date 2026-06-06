## Goal

Re-skin the whole app with an Apple "Liquid Glass" / 3D glass aesthetic — translucent panels, soft specular highlights, depth, ambient color wash — so the product feels premium and worth coming back to. No functional changes.

## Visual system

**Background stage.** Deep near-black canvas (`oklch(0.14 0.02 270)`) layered with two large, soft, slowly drifting radial blobs (indigo + cyan) and a faint noise grain. This is the "behind the glass" that makes blur read.

**Glass primitive.** A single `.glass` utility used by every card, panel, header, button, and input:
- `background`: layered — a 60–75% translucent surface tint over a subtle top-to-bottom white-to-transparent gradient (the specular sheen)
- `backdrop-filter: blur(24px) saturate(140%)` (Tailwind `backdrop-blur-xl backdrop-saturate-150`, never hand-write `-webkit-backdrop-filter` per project gotcha)
- `border: 1px solid rgba(255,255,255,0.18)` plus an inner `box-shadow: inset 0 1px 0 rgba(255,255,255,0.25)` for the rim light
- outer shadow with a colored tint to suggest the glass casting light onto the surface below
- `border-radius: 1.25rem` (22px, Apple-ish)

Two variants on the same primitive: `.glass-strong` (more opacity, for primary panels) and `.glass-soft` (more transparent, for chrome/header).

**Color tokens (`src/styles.css`).** Rewrite to a dark glass palette in oklch with proper light/dark `@theme inline` mapping:
- background: deep indigo-black
- foreground: near-white with cool tint
- primary/accent: vibrant azure (`oklch(0.72 0.18 245)`) for CTAs and citations
- signal: mint for positive deltas (lowest price, pros)
- destructive: warm coral
- New tokens: `--glass-tint`, `--glass-border`, `--glass-rim`, `--glass-shadow`, `--gradient-aurora`, `--shadow-elevated`

**Typography.** Keep current font-display for headers; tighten tracking on h1/h2 (`tracking-tight`), bump weight to `font-semibold`. Body stays at the same scale.

**Motion.** Subtle: cards get a `transform: translateY(-2px)` + brighter rim on hover (200ms ease-out). The background blobs drift on a 30s loop. Result cards fade-up on mount (staggered 60ms). No heavy parallax, no scroll-jacking.

## Files touched (presentation only)

1. **`src/styles.css`** — replace color tokens with the glass palette, add `.glass` / `.glass-strong` / `.glass-soft` utilities via `@utility`, add aurora background, add `--shadow-elevated`, add fade-up keyframes.
2. **`src/routes/__root.tsx`** — add the fixed aurora background div + noise overlay behind the app, so every route inherits the stage. Switch body to the dark glass background.
3. **`src/components/SiteHeader.tsx`** — convert to a sticky `glass-soft` bar with rim light.
4. **`src/components/SearchBar.tsx`** — glass input with inset shadow and azure focus glow.
5. **`src/routes/index.tsx`** — landing hero re-styled on the glass stage (no copy changes).
6. **Result cards** — swap solid `border border-border` / `bg-secondary` for the glass utilities:
   - `ResultsStream.tsx` (intent chip, partial-answer panel, skeletons)
   - `results/ResearchPanel.tsx`, `AgentTimeline.tsx`
   - `results/ShoppingResult.tsx`, `TripResult.tsx`, `InstaResult.tsx`, `PriceHistoryResult.tsx`, `GeneralResult.tsx`
   - `results/SourcesGrid.tsx`, `DetailDisclosure.tsx`
   Each gets the glass surface, the rim light, and an aurora-tinted hover.
7. **`src/components/ui/button.tsx`** — add a `glass` variant (default primary CTA in new theme) using the same tokens; existing variants stay so admin/auth pages don't break.

## Out of scope

- Auth / admin route redesigns beyond inheriting the new tokens (they keep their current shadcn layout)
- Re-doing the price-history chart visuals beyond updating its stroke to the new accent
- Animations beyond hover lift, fade-up on mount, and the ambient background drift
- New imagery / illustrations

## Acceptance

- Every surface that today uses `bg-secondary` / `bg-card` / `border-border` in result UI reads as translucent frosted glass over the aurora background.
- Hover on any glass card shows a brighter rim and a 2px lift.
- Light mode still works (glass utilities adapt via the existing `:root` vs `.dark` tokens; dark is the default).
- No Chrome regression from prefixed `backdrop-filter` (we only use Tailwind utilities or the standard property).
