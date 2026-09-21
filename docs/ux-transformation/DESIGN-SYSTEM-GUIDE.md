# Firuzo Design System 2.0 — Completion Guide

**Owner:** UX Transformation workstream  
**Status:** COMPLETE as documentation of the **existing** system (do not replace it)  
**Last updated:** 2026-09-21  
**Source of truth in code:** `src/app/globals.css`, `src/components/ui/button.tsx`, `src/components/mobile/*`, `src/components/ui/Sheet.tsx`, `src/components/ui/Dialog.tsx`

This file completes Phase 2. It does **not** invent a second token set. New UI must reuse these names.

---

## 1. Color (semantic tokens already in `@theme inline`)

| Token | Role | Rule |
|---|---|---|
| `brand` `#00a9a5` | Fill, rings, active nav | Never the only text color on white |
| `brand-dark` `#046E6B` (light) | Text/icon on white/surface | **Only** turquoise allowed for text on white |
| `mint-bright` `#7FD6D2` | Text on photography / deep | |
| `action` `#F0A62A` | Booking / payment CTA | One action CTA per screen |
| `price` `#9C6209` | Amounts | Use `--font-price` |
| `ink` / `sub` | Primary / secondary text | |
| `surface` / `surface-elevated` / `soft` / `paper` | Surfaces | |
| `line` | Borders | Prefer `border-line` / `border-border` |
| `flight` `#2980b9` · `hotel` `#F0A62A` · `tour` `#8e44ad` | Vertical accents only | Do not rainbow whole icon grids |

Dark values live on `.dark` and are referenced through `--brand-dark`, `--ink`, `--surface`, etc. Do not hardcode `slate-*` / `blue-500` on product chrome.

---

## 2. Elevation, radius, motion

- Shadows: `shadow-elev-1` / `shadow-elev-2` / `shadow-elev-3` / `shadow-brand` (turquoise-tinted, not grey blur).
- Cards: `rounded-2xl` + `border border-line/80` (or `border-border/80`). Dark: `dark:border-white/10 dark:bg-surface-elevated`.
- Press: `active:scale-[0.98] transition-transform duration-100` on cards and CTAs.
- Reduced motion: respect `prefers-reduced-motion` (Motion library already does).

---

## 3. Type & RTL

- Locale fonts are set on `<html>` (`--font-app-sans` / `--font-app-heading`). Persian digits: `FaNumFallback` unicode-range faces.
- Body copy: `leading-relaxed` for fa/ar.
- **Logical properties only:** `start-` / `end-` / `ms-` / `me-` / `ps-` / `pe-`. Physical `ml-`/`mr-`/`pl-`/`pr-`/`left-`/`right-` fail `gate:uiux`.
- Directional chevrons: `rtl:rotate-180`. Media icons (play, star, clock, check) do **not** flip.

---

## 4. Spacing, touch, safe area

Utilities already in `globals.css`:

- `touch-target` → 44×44px
- `safe-pb` / `safe-pt` / `safe-bottom` / `safe-top`
- `no-scrollbar` (aliases: `scrollbar-none`, `hide-scrollbar`)
- Fluid type: `text-fluid-h1` / `h2` / `h3`, `py-fluid-section`, `px-fluid-shell`

Interactive minimum: 44×44px (`min-h-[44px] min-w-[44px]` or `size-11`). Gap between adjacent targets ≥ 8px. Viewport: `viewportFit: cover`.

Thumb-zone CTAs sit in a **bottom bar or bottom sheet**, not the header.

---

## 5. Density modes (D-009)

Same tokens, different density. Do not one-skin every page.

| Mode | Surfaces | Density |
|---|---|---|
| Discovery | Home, Explore, destinations, travelogues | Airy, editorial, large imagery |
| Search | Flight/hotel/tour results | Tight rows, filters, compare |
| Commerce | Detail CTA, cart, checkout | Price + primary action always visible |
| Trip | My Trips, boarding pass, timeline | Operational, status-first |
| Finance | Wallet, invoices | Tabular, quiet |
| Admin | ERP | Out of traveler IA |

---

## 6. Components to reuse (no new primitives)

| Need | Use |
|---|---|
| Button | `Button` `variant="brand"` (nav/confirm) or `variant="action"` (book/pay). Sizes: `lg` = 48px row. |
| Empty / error / loading | `EmptyState` / `ResultState` — not page-local copies |
| Overlay `<768` | `Sheet` side=bottom + drag pill. Desktop: `Dialog` / popover |
| Filter / date / pax | `FilterSheet`, `DatePickerSheet`, `PassengerPicker` |
| Conversion bar | `StickyCTA` when BottomNav is visible (`aboveNav`). `StickyMobileBar` when BottomNav is hidden (checkout) |
| Nav | `BottomNav` + `DesktopNav` + `AppChrome` only |

---

## 7. Z-index (do not invent new stacking)

| Layer | z |
|---|---|
| Header | `z-[80]` |
| BottomNav | `z-[85]` |
| Sticky CTA / checkout bar | below nav or `aboveNav` offset |
| Command palette | `z-[200]` |
| Mobile drawer | `z-[250]` |

---

## 8. Capability honesty

Bind live/mock/coming-soon to `FEATURE_REALITY_MATRIX` + `CapabilityBadge`. Never style a MOCK rail as a live GDS/PSP.

---

## 9. Non-goals

- Do not add a second Button, Card, Sheet, or color palette.
- Do not put Admin in traveler nav.
- Do not use heavy drop-shadows or centered modals on mobile selection.
- Visual polish (photography, extra motion) is Phase 13.

**Phase 2 exit:** this guide matches code. Implementation of navigation is Phase 3 — no new competing components.
