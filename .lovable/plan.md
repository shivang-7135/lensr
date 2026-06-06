# Plan: Light Mode + Categories + Motion/Image Polish

## 1. Light/Dark Theme Switch

**Tokens (`src/styles.css`)**
- Move current dark values from `:root` into `.dark { ... }` (and keep as default for SSR by also setting on `:root` initially, then overridden).
- Add a parallel light palette under `:root` (no `.dark` class):
  - Background: soft pearl `oklch(0.985 0.005 250)` with subtle warm tint
  - Foreground: `oklch(0.18 0.02 270)`
  - Glass tints flipped: white-on-light becomes `oklch(0 0 0 / 4–10%)` with darker rim and softer drop shadow
  - Accent kept (azure) but slightly deepened for contrast on light
  - Aurora gradient: lighter pastel version (mint, sky, lilac) at lower opacity
- Both palettes share the same token names so all components work unchanged.

**Theme provider (`src/components/ThemeProvider.tsx` — new)**
- Reads `localStorage("lensr-theme")` with fallback to `prefers-color-scheme`.
- Applies/removes `dark` class on `<html>`.
- Exposes `useTheme()` returning `{ theme, setTheme, toggle }`.
- Mount inside `RootComponent` in `__root.tsx`. Inline a tiny `<script>` in `RootShell` head to set the class before hydration (prevents flash).

**Toggle UI (`src/components/ThemeToggle.tsx` — new)**
- Sun/Moon lucide icon button using `glass-soft` style, placed in `SiteHeader`.
- Smooth icon crossfade on click.

**Root shell**
- Replace hardcoded `<html className="dark">` with `<html>` + the no-flash script. Aurora blob colors switched via CSS variables (already tokenized) so they adapt automatically.

## 2. Twenty Search Categories on Homepage

Replace the current 4-card `FEATURES` grid with a richer **"What can you ask Lensr?"** section: 20 curated example queries grouped by intent, each clickable to pre-fill the search bar and submit.

**Categories (20)**
Shopping · Price history · Trip planning · Insta caption · Recipe ideas · Gift finder · Book recommendations · Movie/TV picks · Coding help · Career & resume · Fitness plan · Health questions · Finance & investing · Local events · Restaurant picks · Home decor · Tech comparisons · Learning path · News digest · Productivity tools

**Implementation**
- New `src/lib/search/categories.ts` exporting an array of `{ id, label, icon, example, gradient }`.
- New `src/components/CategoryGrid.tsx`: responsive 4-col grid of `glass glass-hover` chips. Click → navigates to `/?q=<example>` (or calls the same submit path the SearchBar uses). Stagger fade-up animation.
- `SearchBar` gets an optional `initialQuery` prop (or reads `?q=`) so click-to-search works.
- Section heading: "Try asking…" + small caption.

## 3. Background Animation + Image Capability Enhancement

**Background motion (`__root.tsx` + `styles.css`)**
- Add a third slow drift animation with different easing/duration so blobs no longer move in sync.
- Add a faint `conic-gradient` "shimmer" layer that rotates over 60s.
- Add subtle parallax: blobs translate slightly on mouse move (throttled, respects `prefers-reduced-motion`).
- New `@keyframes aurora-rotate` + `@utility aurora-shimmer`. All animations gated behind `@media (prefers-reduced-motion: no-preference)`.

**Image capability enhancements**
- **SafeImage upgrade (`src/components/results/SafeImage.tsx`)**: add shimmer skeleton while loading, smooth fade-in on load, optional `aspectRatio` prop, click-to-zoom lightbox using a Radix Dialog.
- **InstaResult**: when AI image is generated, show a polaroid-style glass frame with subtle tilt + hover lift; allow download button.
- **ShoppingResult**: product images get hover zoom (transform scale 1.04) and a glass overlay revealing the "Buy" pills on hover.
- **GeneralResult**: if a sufficiently good hero image URL exists in sources, render a wide hero card at the top of the answer.
- **AI image prompt (`src/routes/api/search.ts`)**: extend the gemini image step to also run for `trip` (a hero destination shot) and `shopping` (a clean studio mockup) when no real product image was found in sources. Keep sanitization: AI-generated URLs are allowed as-is (they're data URLs / blob refs, not external).

## Out of Scope
- No backend schema changes.
- No auth changes.
- No changes to search agent prompts beyond the additional image step described.

## Files Touched
**New**
- `src/components/ThemeProvider.tsx`
- `src/components/ThemeToggle.tsx`
- `src/components/CategoryGrid.tsx`
- `src/lib/search/categories.ts`

**Edited**
- `src/styles.css` (light palette, motion utilities)
- `src/routes/__root.tsx` (theme bootstrap, extra aurora layer, parallax)
- `src/routes/index.tsx` (CategoryGrid replaces FEATURES)
- `src/components/SiteHeader.tsx` (ThemeToggle)
- `src/components/SearchBar.tsx` (initialQuery / `?q=` support)
- `src/components/results/SafeImage.tsx` (skeleton, lightbox)
- `src/components/results/InstaResult.tsx`, `ShoppingResult.tsx`, `GeneralResult.tsx` (image polish)
- `src/routes/api/search.ts` (extend AI image generation to trip/shopping fallbacks)
