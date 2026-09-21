# UX Transformation Roadmap

Execute in this order. Do not skip because the current page “looks fine”. If an earlier architectural issue blocks a later phase, fix the architecture first.

Companion prompt principles are in the user master prompt; this file is the **repo-specific** execution plan.

---

## Status board (2026-09-21)

| Phase | Name | Status |
|---|---|---|
| 0 | Baseline & freeze | **DONE** (this pack) |
| 1 | Experience architecture | **DONE** (docs; not implemented) |
| 2 | Design System 2.0 complete | **DONE** (`DESIGN-SYSTEM-GUIDE.md` matches tokens) |
| 3 | Global navigation + Home | **IN PROGRESS** (`feat/ux-ia-nav`) |
| 4 | Search UX | NOT STARTED |
| 5 | Result & decision cards | NOT STARTED |
| 6 | Detail pages | NOT STARTED |
| 7 | Unified checkout | NOT STARTED |
| 8 | Trip OS | NOT STARTED |
| 9 | Wallet / Account | NOT STARTED |
| 10 | Super-app services attach | NOT STARTED |
| 11 | AI UX | NOT STARTED |
| 12 | Mobile-first hardening | NOT STARTED |
| 13 | Visual / motion / editorial | NOT STARTED |
| 14 | Quality convergence | NOT STARTED |

Phases 3–9 are **one chain**. Redesigning Home while Search and Checkout stay on the old model creates new inconsistency.

---

## Phase 0 — Baseline & freeze — DONE

Delivered:

- `UX-AUDIT.md`
- `UX-ROUTE-MATRIX.md`
- `UX-ISSUE-BACKLOG.md`
- Quality/capability freeze notes (no live browser pass claimed)
- Isolation from other sessions

Gate: no redesign without this inventory — **passed**.

---

## Phase 1 — Experience architecture — DONE (documentation)

Delivered: `UX-ARCHITECTURE.md`, `UX-DECISION-LOG.md`.

Gate to Phase 2: architecture accepted. Implementation of nav still Phase 3.

---

## Phase 2 — Design System 2.0 — DONE (docs)

Delivered: `DESIGN-SYSTEM-GUIDE.md` completing (not replacing) tokens in `globals.css`, `Button`, mobile primitives, density modes, sticky-CTA contract.

---

## Phase 2 — Design System 2.0 (historical brief)

Complete, don’t replace, tokens and primitives:

Color, type, spacing, radius, shadow, motion, iconography, grid, density modes, elevation, z-index, focus, form controls, cards, sheets, dialogs, toast, tabs, stepper, timeline, tables.

**Exit:** `DESIGN-SYSTEM-GUIDE.md` in this folder (or `docs/`) matching `globals.css` + `button.tsx` + `mobile/*`. No new competing Button/Card.

---

## Phase 3 — Navigation + Home

Implement D-004 / P0-001 / P0-002 / P1-001 / P1-002.

1. Desktop + mobile nav per architecture
2. AppChrome: stop treating `/book` as checkout
3. Explore hub (reuse `/book` or `/services`, alias the other)
4. Home hierarchy: Hero/Search → suggestions → destinations → bundles → services entry → editorial → trust
5. Fix QuickServicesBar bus link / token colors or remove bar

**Exit:** User can go Home → Explore → Trips → Wallet → Account on 390px and 1440px without duplicate catalogs. RTL + LTR. Tests for nav labels/targets.

**Forbidden:** Home color/radius-only PR.

---

## Phase 4 — Search UX

Shared search session + states. Hotel sheet pattern → flights. Autocomplete, recents, errors, retry.

---

## Phase 5 — Results & decision

Decision cards; sort/filter/compare/save; no invented badges.

---

## Phase 6 — Details

Shared outline; sticky CTA; included/excluded/cancel.

---

## Phase 7 — Unified checkout

Phases: Trip, Passengers, Services, Review, Payment, Confirmation. Keep domain services. Surface price-change and expiry.

---

## Phase 8 — Trip OS

Trip container; drop AccountSidebar from trip detail; timeline; documents; upcoming action.

---

## Phase 9 — Wallet / Account

Finance vs account density. Don’t marketplace-card the ledger.

---

## Phase 10 — Services attach

Attach-to-trip for eSIM, insurance, transfer, etc.

---

## Phase 11 — AI

Search / plan / trip Q&A / support. SHOW→REVIEW→CONFIRM→APPLY.

---

## Phase 12 — Mobile hardening

Viewports 320, 360, 390, 430, 768, 1024, 1440+. Overflow, safe area, 44px, sheets, keyboard, maps, checkout.

---

## Phase 13 — Visual polish

Only after 3–9. Photography, motion, skeletons, empty art. Motion = feedback, not decoration.

---

## Phase 14 — Quality convergence

UI = UX = RTL = LTR = a11y = performance = SEO = i18n = business logic = payments = auth = analytics = docs = tests = production.

Critical path tests:

Home → Search → Result → Detail → Cart → Checkout → Payment → Confirmation → My Trip  

plus Auth, Wallet, Profile, Services, Planner.

Each: happy, validation, empty, API fail, permission, expired, mobile, RTL.

Never declare done from screenshots or lint alone.

---

## Implementation rules (every later PR)

1. Search for existing component/token/flow first.
2. Changing a shared component → grep usages + run relevant tests.
3. Changing backend contract → inspect all consumers.
4. NO ISOLATED REDESIGN: does this improve the **journey**?
5. Do not collide with sessions writing `docs/baseline/*` or Claude worktrees. Prefer a dedicated branch `feat/ux-ia-nav` when code starts.
6. Gates: `typecheck`, `lint`, `test:unit`, `gate:a11y`, `gate:uiux`.

---

## Next concrete action

Phase 3 nav is on `feat/ux-ia-nav`. After gates stay green: Phase 4 Search UX (shared filter sheet / session). Do **not** restyle Home cards further in this branch.
