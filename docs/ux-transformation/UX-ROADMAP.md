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
| 4 | Search UX | **DONE** (shared sheet, states, autocomplete, recents, params) |
| 5 | Result & decision cards | **IN PROGRESS** (no-invented-badges sweep done) |
| 6 | Detail pages | **IN PROGRESS** (audit done; QuickBar honesty fix shipped) |
| 7 | Unified checkout | **IN PROGRESS** (Review phase shipped; Trip/Services phases open) |
| 8 | Trip OS | **IN PROGRESS** (detail de-Accounted + trip services shell shipped) |
| 9 | Wallet / Account | **IN PROGRESS** (gateway honesty shipped) |
| 10 | Super-app services attach | **IN PROGRESS** (eSIM attach shipped) |
| 11 | AI UX | **IN PROGRESS** (planner APPLY flow conformed to D-008) |
| 12 | Mobile-first hardening | **IN PROGRESS** (static sweeps clean; live viewport pass pending) |
| 13 | Visual / motion / editorial | NOT STARTED |
| 14 | Quality convergence | **IN PROGRESS** (all offline gates green; live-server gates pending) |

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

## Phase 4 — Search UX — DONE

Shipped on `feat/ux-ia-nav`:

- Flights results now use the shared `FilterSheet` primitive (drag pill, focus trap, safe-area footer) instead of a page-local overlay — same interaction contract as hotels.
- Flight error state → shared `ResultState` with in-place retry (`fetchFlights`), no full-page reload; error copy localized in 5 locales.
- `src/lib/search-params.ts` canonicalizes `city | destination | q` (UX-P2-002) — hotels page uses it; unit-tested.
- **Flight edit sheet:** panel clicks no longer bubble to the backdrop (the sheet used to close on any inside tap); origin/destination inputs now use the shared `CityAutocomplete`.
- **One autocomplete, not three:** `FlightSearchHeader`'s hand-rolled origin/destination dropdowns (~90 lines) were removed in favor of the shared `CityAutocomplete` — the same component `SearchWidget` forms (flight/hotel/tour) and the edit sheet already use. Popular-route pills and the query-summary strip in the header are unchanged.
- **Recent searches (search session memory):** `src/lib/recent-searches.ts` (localStorage, device-only, SSR-safe, unit-tested) + shared `RecentSearchChips`. Successful route searches are remembered (deduped by route, newest first, cap 5); chips appear on the `/flights` landing page under the SearchWidget (tap → re-run search) and inside the flight edit sheet (tap → fill fields).
- **Map/list parity decision (D-013):** hotels already ship map/list (desktop side-by-side + mobile fullscreen map). For flights a map is not applicable — results are route-based, not geo-pins. Recorded in the decision log, not implemented by force.

Gate evidence: unit tests green (nav 9, search-params 4, recents 6), eslint clean on all touched files, `tsc` clean, `gate:uiux` 0 violations on touched paths.

---

## Phase 5 — Results & decision

Decision cards; sort/filter/compare/save; no invented badges.

First slice shipped on `feat/ux-ia-nav` (UX-P1-013):

- **Flight "Cheapest" badge was invented twice over:** the card showed it for any fare under a hardcoded threshold (Rial 26M / Toman 2.6M), and the page passed `isCheapest={idx === 0}` — meaning the *fastest* or *earliest* flight could wear "Cheapest". Now the page computes the real price floor of the current result set and the badge renders only on cards matching it (ties included). Threshold fallbacks removed from both card views.
- **Hotel fake scarcity removed:** `HotelCard` rendered «فقط ۲ اتاق باقی مانده / Only 2 rooms left» whenever `rating >= 8.5` — a fabricated urgency badge with no inventory basis. Deleted. Legit condition badges (free cancellation, breakfast, rating) are data-bound and stay.
- Tours page scanned: no fabricated badge patterns found.

Still open in Phase 5: stated-basis labels like "Best value", migrating hotel favorites (session-only today) onto the shared persisted favorites lib, compare for tours.

Also shipped (tour decision-card parity — WHEN):

- `Tour.departureDates` (real `startDate / availableSeats / guaranteed`) now surfaces on the listing card: next upcoming departure date + «اعزام قطعی / Guaranteed» badge when true + seats-left badge only when the departure actually has ≤ 3 seats. Tours without departure data render nothing extra — no fabrication. All card badges across flights/hotels/tours are now data-bound.

Also shipped (save/favorite parity):

- `src/lib/favorites.ts` — device-local, namespace-scoped favorites (`firuzo:favorites:flight`), SSR-safe, unit-tested.
- `useFlightComparison` now carries `favs / toggleFav / isFav` (same shape as the hotels hook) with a hydrate-then-save pattern so SSR HTML never mismatches.
- `BentoFlightCard` renders a Heart save control in both mobile and desktop views (`aria-pressed`, rose-warm fill, 44px touch target); results page wires the set.

---

## Phase 6 — Details

Shared outline; sticky CTA; included/excluded/cancel.

Audit + first fixes on `feat/ux-ia-nav`:

- **Outline coverage confirmed** from code: hotel detail = Hero → info → rooms (options) → BookingPanel (price, tax breakdown, refund deadline via `FREE_CANCEL_HOURS`, capacity guards) → map → related; tour detail = Hero → QuickBar (key facts) → itinerary → departure dates → services → policies (includes/excludes + cancellation steps) → reviews → subnav.
- **Sticky CTA contract satisfied** on both detail pages: hand-rolled mobile bars (`fixed bottom-0`, safe-area padding, price + CTA, `z-[86]`) with BottomNav hidden on detail routes — same contract `StickyCTA`/`StickyMobileBar` document. Consolidating these two bars onto the shared primitive is optional later polish, not a journey gap.
- **Fixed (no-fabrication rule):** `TourQuickBar` claimed «هتل ۵ ستاره لوکس», «پرواز رفت و برگشت + ترانسفر», «حداکثر ۱۲ نفر», «فارسی، English» and «پوشش کامل حوادث» for *every* tour regardless of data. Missing values now render «—»; the insurance claim was replaced by a data-bound «کنسلی رایگان تا N روز قبل اعزام» row from `tour.cancellationPolicy`.

Still open in Phase 6: optional consolidation of the two detail sticky bars onto `StickyCTA`; hover/desktop density review.

---

## Phase 7 — Unified checkout

Phases: Trip, Passengers, Services, Review, Payment, Confirmation. Keep domain services. Surface price-change and expiry.

First slice shipped on `feat/ux-ia-nav` (D-006):

- **Review phase added between passengers and payment** — the fix for "user can miss what they are buying". After the draft is created (both single-item and multi-item-cart paths) the flow lands on a display-only review: item + travel date + traveler count, passenger name list, addon chips, the same `PriceBreakdownTable` as the sidebar, `SoftLockTimer`, an explicit note that the server re-evaluates the final amount before payment (price-change modal still guards the delta), and Edit-details / Continue-to-payment actions. Mobile keeps the total-visible `StickyMobileBar`.
- Stepper is now 4 steps (`passengers → review → payment → issuing`) with `stepReview` localized in all 5 locales; i18n gate stays at 100% parity.
- **Untouched money path:** `createBookingDraft`, `createMultiItemBookingDraftAction`, `repriceBookingAction`, soft lock, wallet/eCardo/card-transfer rails, cart resume (`?phase=payment`) still land directly on payment.

Still open in Phase 7: first-class **Services** phase (addons promoted out of the passenger screen per D-006) and a **Trip** summary phase for multi-item carts.

---

## Phase 8 — Trip OS

Trip container; drop AccountSidebar from trip detail; timeline; documents; upcoming action.

First slice shipped on `feat/ux-ia-nav` (P0-004):

- **AccountSidebar removed from trip detail** — the page now runs in Trip density (D-009), full-width at 1280px; account navigation stays in `/account` (the sidebar remains on the `/my-trips` list page, where it still serves account-mode browsing — open question for a later slice).
- **Trip services shell:** a «خدمات این سفر / Services on this trip» strip renders every `booking.items[]` entry (flight / hotel / tour / eSIM / insurance / transfer / train, icon + parsed `itemTitle` + confirmed check) — the "Flight+Hotel+eSIM as one trip" requirement. Multi-item trips only; a single-service trip keeps its boarding-pass voucher without duplication.
- **Upcoming action:** already covered by `TripCountdown` banner + lifecycle stepper; documents (voucher PDF, invoice, offline save) already shipped in the existing page.

Still open in Phase 8: attach-flow from ancillary purchases into this trip (D-007, with Phase 10), timeline per-item detail expansion, list-page sidebar decision.

---

## Phase 9 — Wallet / Account

Finance vs account density. Don’t marketplace-card the ledger.

First slice shipped on `feat/ux-ia-nav` (D-010 on a money surface):

- **Shetab deposit rail honesty:** the wallet presented Shetab as a live selectable gateway with a hardcoded green badge, while `payment.shetab` is DISABLED in production (matrix/capabilities). The rail now reads `/api/capabilities` on mount: not LIVE/BETA ⇒ button disabled with an honest «فعال نیست / Not active» chip, auto-fallback to eCardo if it was selected, and the intro copy drops «شتاب» claims. Unknown status counts as not-live (never look live until proven).
- **Ledger density check:** the transaction history is already quiet/tabular (direction-colored rows, no marketing skins) — no marketplace-carding found; no change needed.

Still open in Phase 9: per-transaction document action (P2-005, needs a booking/invoice reference exposed on wallet transactions — backend), account cluster density review.

---

## Phase 10 — Services attach

Attach-to-trip for eSIM, insurance, transfer, etc.

First slice shipped on `feat/ux-ia-nav` (D-007 via the cart path):

- **eSIM «افزودن به سبد سفر» on `/esim`:** every package card now offers a secondary attach action next to the direct-buy CTA. The package joins the persistent cart as an `ESIM` item and becomes part of the user's next **consolidated booking** — one checkout, one trip record, visible in the trip's "Services on this trip" strip (Phase 8).
- **Server price authority extended additively:** `resolveServerBasePrice` gained an optional `details` param and a live-eSIM branch (`SimService.getCatalog()` matched by `packageId`/`productId`, `priceToman × 10` — the same Toman→IRR conversion the CIP branch applies). `resolveServerCartPricing` forwards item details. Static ESIM ids and every other type keep their existing resolution — all pre-existing money paths are byte-for-byte unchanged; unknown prices still fail closed.
- **Already attach-capable** (verified in code): insurance and CIP add to cart; tours add to cart.

Still open in Phase 10: attach buttons for transfers/visa/city-pass (same pattern, resolver already handles TRANSFER/VISA), post-purchase "add to an existing paid trip" (needs a booking-link API — backend).

---

## Phase 11 — AI

Search / plan / trip Q&A / support. SHOW→REVIEW→CONFIRM→APPLY.

First slice shipped on `feat/ux-ia-nav` (D-008):

- **Planner "Book all" no longer books an AI-invented price.** Previously it synthesized a fake `tours` booking with `amount: plan.total` (a client-side estimate) and jumped straight to checkout — silent money mutation. Now the planner's real SKUs (outbound/return flight, hotel with nights, transfer, eSIM, insurance — each a catalog entry with its id as the cart item id) are added to the persistent cart and the **UnifiedCartDrawer opens as the REVIEW step**; checkout is CONFIRM (server re-resolves every price, fail-closed), payment is APPLY. Experiences stay editorial — they have no bookable SKU and are never turned into money by the AI.
- **Chat widget verified clean:** `FiruzoChatWidget` has no cart/booking mutation paths.

Still open in Phase 11: AI assist entries from Support and Trip detail (trip Q&A), recents inside planner refinement.

---

## Phase 12 — Mobile hardening

Viewports 320, 360, 390, 430, 768, 1024, 1440+. Overflow, safe area, 44px, sheets, keyboard, maps, checkout.

Static hardening pass on `feat/ux-ia-nav`:

- `gate:uiux` full-repo: **0 violations across 618 files** (logical properties, touch targets, RTL flips).
- Fixed-width overflow sweep (320px): no traveler-facing offenders — fixed pixel widths are `sm:`+ only, decorative blurs, or max-widths; compare bars are fluid (`start-3 end-3`) on mobile.
- `fixed bottom` sweep: one offender found and fixed — hotel detail's transient toast lacked safe-area inset (`bottom-6` → `calc(1.5rem + env(safe-area-inset-bottom))`).
- Already compliant from earlier phases: viewport `viewportFit: cover` + `maximumScale: 5` (pinch-zoom allowed), BottomNav 62px + safe-area, sticky bars above-nav offset, sheets with drag pills and focus traps, checkout mobile total bar.

**Pending for a full Phase 12 verdict:** a live multi-viewport render pass (Playwright at 320/390/430/768/1440 on home, Explore hub, flights/hotels search, checkout, trip detail). Requires a running dev server — intentionally not started here to avoid colliding with other sessions' port usage.

---

## Phase 13 — Visual polish

Only after 3–9. Photography, motion, skeletons, empty art. Motion = feedback, not decoration.

---

## Phase 14 — Quality convergence

UI = UX = RTL = LTR = a11y = performance = SEO = i18n = business logic = payments = auth = analytics = docs = tests = production.

Gate run on `feat/ux-ia-nav` (2026-09-21):

| Gate | Result |
|---|---|
| `lint` (full src) | **PASS** — 0 warnings |
| `typecheck` | **PASS** |
| `gate:uiux` (full src) | **PASS** — 0 violations / 618 files |
| `gate:i18n` | **PASS** — 938 keys × 5 locales, 100% parity, no new inline-localization debt |
| `gate:i18n-lt` | **PASS** — incomplete 172 ≤ 172 baseline; unlocalized FA improved (−6) |
| `test:unit` (full suite) | **PASS — 1162/1162** (includes the 22 tests added by phases 3–11) |
| `gate:a11y` | **PENDING** — needs a live server (deliberately not started; port shared with other sessions) |
| `test:e2e` (33 specs) | **PENDING** — needs a live server; specs updated for the new checkout Review phase (below) |

Critical-path e2e coverage (existing specs):

- `golden-journeys.spec.ts`: flight search → passenger → **review** → payment → voucher → my-trips; hotel search → compare → detail → room → **review** → payment → trips; planner → timeline; my-trips + wallet; admin.
- `critical-flows.spec.ts`: auth + KYC, hotel booking, admin security.
- `tours-booking-flow.spec.ts`: 3 tour checkout journeys, each now asserting the **review step** between passengers and payment (updated for D-006 — five assertion sites across the two files).
- Gaps (documented, not yet specced): dedicated e2e for the **UnifiedCartDrawer → multi-item consolidated checkout** (cart step of the critical path) and for the **explore-hub → search** entry.

**Rule kept:** nothing is declared done from screenshots or lint alone — the live-server gates (a11y + e2e) are explicitly pending, not claimed.

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
