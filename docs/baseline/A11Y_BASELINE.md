# A11Y-001 — Accessibility (WCAG) Baseline

Measured 2026-09-06 with **axe-core** (`@axe-core/playwright`, tags `wcag2a/2aa/21a/21aa`)
against the running dev server, default locale `fa` (RTL).
Tool: `scripts/a11y-baseline.mjs` (re-runnable) · raw data: `a11y-baseline.json` (same folder).

## Baseline result

| Page | Failing nodes | Rules |
|---|---|---|
| `/fa` (home) | 0 | — |
| `/fa/flights` | 4 critical | `aria-required-parent` ×4 (shared search-widget dropdown) |
| `/fa/hotels` | 4 critical + 1 serious | same `aria-required-parent` ×4 · `color-contrast` ×1 (`.shadow-md` element) |
| `/fa/services` | 0 | — |
| `/fa/support` | ~~1 critical~~ **fixed** | `select-name` — category `<select>` now programmatically labelled (`htmlFor`/`id`) |

Runs vary with live content/timing; re-run the script for current numbers. The **structural**
findings are the three rules above.

## Triage & owners

1. **`aria-required-parent` (critical, shared)** — the search-widget dropdown items use an ARIA
   role without its required container. Owner file: `src/components/search/SearchWidget.tsx`
   (**currently carries in-progress user work — fix deferred to that owner**). Wrap the role'd items
   in their required parent (`role="listbox"`/`role="menu"` as appropriate) or drop the ARIA role
   from plain items.
2. **`color-contrast` (serious, hotels landing)** — one element (`.shadow-md` card) fails the 4.5:1
   ratio. Adjust `text-sub`/background tokens on that card; verify with a re-run.
3. ~~`select-name` (critical, support)~~ — **fixed in this run** (label association), zero axe
   violations on the page after the fix.

## Path to A11Y-002 (CI gate — needs a product decision)

The measurement tool is re-runnable. To turn it into a CI gate: pick the blocking threshold
(recommended: **0 critical, 0 serious** on the scanned page set, expanding the page list to
auth/checkout/admin with authenticated scanning), then add a `playwright test` wrapper that asserts
`violations` above the threshold is empty. Deferred until the two remaining structural issues are
fixed and severity policy is owned by the product side.

## Keyboard / focus / motion spot-check (manual)

- `<html dir>` is set per locale (RTL fa/ar) — verified in code (`app/[locale]/layout.tsx`).
- Keyboard/focus: `focus-visible` rings are present on form controls (`focus-visible:ring-2`), including the fixed select.
- Reduced motion: **already covered** — `globals.css` ships a `prefers-reduced-motion: reduce`
  block (animation/transition durations clamped, smooth scroll disabled). A11Y-004 spot-check passes.
