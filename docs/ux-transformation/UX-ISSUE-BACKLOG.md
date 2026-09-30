# UX Issue Backlog

Severity: **P0** blocks a critical journey · **P1** major usability/consistency · **P2** meaningful · **P3** polish.

Implementation status (2026-09-21, branch `feat/ux-ia-nav`): P0-001, P0-002, P1-001, P1-003, P1-010, P1-011, P1-012 **implemented in nav/Explore hub**. P1-004/P1-005 **implemented for Phase 4 scope** (shared `FilterSheet`, `ResultState` retry, `CityAutocomplete` everywhere incl. `FlightSearchHeader` dedupe, recents memory, D-013 map decision). P2-002 **implemented** (`src/lib/search-params.ts`). Remaining rows still documented only.

When many pages share a problem, the fix is the **systemic component**, not N page patches.

---

## P0 — critical journey / IA blockers

### UX-P0-001 — Traveler IA is a service catalog, not five intents

- **Route:** global (`Header`, `BottomNav`, `/`, `/book`, `/services`)
- **Problem:** User cannot answer “where am I?” Primary chrome exposes flights, hotels, tours, 11 services, admin, `/book`, and home quick icons as near-equals.
- **Evidence:** `DesktopNav.tsx` `NAV_CATEGORIES`; `BottomNav` slot 2 → `/book`; `QuickServicesBar`; `/services`.
- **Root cause:** Navigation was grown per feature, not per intent.
- **Solution:** Implement architecture in `UX-ARCHITECTURE.md` (primary 5, secondary products, hide admin from customers). One nav model, all surfaces.
- **Affected flows:** Discover → Search → Trip
- **Not:** recoloring the header in isolation

### UX-P0-002 — `/book` is primary Search but behaves like a checkout chrome page

- **Route:** `/book`
- **Problem:** Mobile tab label is Search; page is a mosaic of product tiles; `AppChrome` treats `/book` like checkout and **hides BottomNav**.
- **Evidence:** `BottomNav.tsx` items; `AppChrome.tsx` `isCheckout` regex includes `book`.
- **Root cause:** `/book` reused as both “search hub” and “focus mode”.
- **Solution:** Either (a) retarget tab 2 to Explore hub and keep BottomNav visible, or (b) put the real `SearchWidget` on `/book` and stop treating it as checkout. Decision D-004 / Q-001.
- **Affected:** Mobile primary nav, search entry

### UX-P0-003 — Checkout is not yet Trip → Passengers → Services → Review → Pay → Confirm

- **Route:** `/checkout`
- **Problem:** Stepper is passengers → payment → issuing. Addons/cross-sell/referral sit inside the page without a Review step. User can miss what they are buying.
- **Evidence:** `CheckoutStepper.tsx` `CheckoutPhase`; `checkout/page.tsx`.
- **Root cause:** Implementation optimized for speed-to-pay, not decision confidence.
- **Solution:** Extend phases in one stepper + one application service. Do not add a second checkout.
- **Preserve:** server reprice, soft lock, wallet, eCardo, passenger schemas.
- **Affected:** BOOK → PAY → CONFIRM

### UX-P0-004 — My Trips is a booking record, not a Trip OS

- **Route:** `/my-trips`, `/my-trips/[id]`
- **Problem:** Detail shows PNR, cancel, boarding pass, SOS, expense split, invoice — not Flight+Hotel+eSIM+Transfer+Documents as one trip. `AccountSidebar` pulls the page into Account mode.
- **Evidence:** `my-trips/[id]/page.tsx` imports; list page sidebar.
- **Root cause:** Data model is booking-centric; UX copied account layout.
- **Solution:** Trip shell (timeline, upcoming action, attached services). Sidebar optional on desktop account only.
- **Depends on:** checkout still writing items onto the same booking aggregate (already `booking.items`) — mostly presentation + attach APIs.

### UX-P0-005 — Capability honesty on commerce surfaces

- **Route:** `/flights/search`, `/hotels/**`, checkout payment selector
- **Problem:** Live-looking search/pay UI while matrix says flights MOCK/BETA, hotels MOCK, Shetab DISABLED, Visa/MC & USDT COMING_SOON.
- **Evidence:** `FEATURE_REALITY_MATRIX.md`; `PaymentGatewaySelector.tsx`; `CapabilityBadge.tsx` exists but is not the default language of results.
- **Root cause:** UI completeness outran provider contracts.
- **Solution:** Bind badges + disabled rails to `src/lib/capabilities`. Never hide broken pay methods behind pretty buttons.
- **Business risk:** trust, chargebacks, support load

---

## P1 — major consistency / journey

### UX-P1-001 — Three (four) service directories

- **Routes:** `/`, `/book`, `/services`, header Services
- **Solution:** One Explore hub + Home search only. Deprecate duplicate catalogs or make them aliases.

### UX-P1-002 — Home is a dashboard of capabilities

- **Route:** `/`
- **Evidence:** `page.tsx` section order vs target hierarchy.
- **Solution:** Phase 3 Home architecture; keep `SearchWidget` first; demote `QuickServicesBar` or turn into a single “more services” entry.

### UX-P1-003 — QuickServicesBar token violations + wrong bus target

- **Route:** `/` `QuickServicesBar.tsx`
- **Problem:** Hardcoded blue/amber/purple gradients; bus `href: '/trains'`.
- **Solution:** Brand/mint tokens; fix href or hide bus until a bus route exists.

### UX-P1-004 — Flight vs hotel search interaction model gap

- **Routes:** `/flights/search` vs `/hotels/search`
- **Evidence:** Hotels have `HotelFilterSheet` + chips + map + skeleton. Flights have rich cards/compare but filters still page-local.
- **Solution:** Shared Search chrome: query summary, sort, filter sheet, results, map/list where relevant.

### UX-P1-005 — Overlay pattern sprawl

- **Components:** `Sheet`, `Dialog`, `FilterSheet`, `DatePickerSheet`, `HotelFilterSheet`, `KycCompletionSheet`, various modals
- **Solution:** Usage rules: `<768` selection → bottom `Sheet` only. Desktop → dialog/popover. No new overlay primitives.

### UX-P1-006 — Empty/error primitives not universal

- **Evidence:** `EmptyState` + `HotelEmptyState`; home lacks network retry.
- **Solution:** One `EmptyState` / `ErrorState` / `ResultState` with density variants.

### UX-P1-007 — Sticky CTA contract not globally applied

- **Evidence:** `StickyCTA` vs `StickyMobileBar` comments; prompt requires thumb-zone CTA on conversion screens.
- **Solution:** Adopt the existing contract; audit detail pages that use ad-hoc `fixed bottom`.

### UX-P1-008 — Ancillaries do not attach to a trip

- **Routes:** `/esim`, `/insurance`, `/transfers`, `/cip`, `/visa`, `/city-pass`
- **Evidence:** pages call `setBookingContext` / cart independently.
- **Solution:** After buy: “Add to Istanbul trip” → visible in `/my-trips/[id]`. Checkout addons already a seed (`AddonsSection`).
- **Status (progressing):** eSIM attach-to-cart shipped (server resolver extended additively for live eSIM packages). Insurance/CIP/tours already cart-capable. Transfers/visa/city-pass buttons + post-purchase attach to an *existing* trip (booking-link API) remain.

### UX-P1-009 — AI is a destination, not a companion

- **Routes:** `/plan`, `FiruzoChatWidget`, `AiPlannerHookSection`
- **Solution:** Entry from Search (plan tab already exists), Trip Q&A, Support. SHOW→REVIEW→CONFIRM→APPLY. No silent money/booking mutation.

### UX-P1-010 — Admin in customer Trips menu

- **File:** `DesktopNav.tsx` trips items `admin`
- **Solution:** Role-gate or move to account/command palette.

### UX-P1-011 — Interpreter labeled SOS

- **File:** `DesktopNav` key `sos` → `/interpreter`
- **Solution:** SOS stays on trip detail (`EmergencySosCard`); interpreter is a service.

### UX-P1-012 — Hardcoded Persian on `/book` tiles

- **File:** `book/page.tsx` `tag: '۴۰۰+ ایرلاین'` etc.
- **Solution:** `useTranslations` / `lt()` — i18n gate does not catch JSX literals.
- **Status:** fixed on `feat/ux-ia-nav` (Explore hub copy is i18n'd).

### UX-P1-013 — Invented badges on decision cards (fake basis)

- **Routes:** `/flights/search` (BentoFlightCard), hotels results (HotelCard)
- **Problem:** "Cheapest" badge driven by a hardcoded price threshold *and* by `idx === 0` of whatever sort the user chose; hotels showed fabricated «فقط ۲ اتاق باقی مانده» purely when `rating >= 8.5`. Trust and decision quality damage — users can compare against a lie.
- **Root cause:** badges written as marketing copy, not derived from data.
- **Solution (shipped):** bind "Cheapest" to the real min price of the current result set; delete scarcity badges without an inventory field. Rule: every badge states a basis that exists in data (`seatsLeft`, `freeCancellation`, rating, breakfast).
- **Save parity (shipped):** flights results gained a device-local Heart control (`src/lib/favorites.ts` + `useFlightComparison.favs`). Hotels' favorites are still session-only (lost on reload) — migration to the shared lib is open follow-up.
- **Tour card WHEN (shipped):** next real departure + guaranteed flag + real seats-left bound to `Tour.departureDates`; nothing renders when a tour has no departure data.

---

## P2

| ID | Route | Problem | Solution |
|---|---|---|---|
| UX-P2-001 | `/flights`, `/hotels` | Extra landings vs search | Redirect or thin wrappers around SearchWidget |
| UX-P2-002 | Search | Dual query params `city` vs `destination` | Canonicalize in one helper (hotels already accept both) |
| UX-P2-003 | Checkout stepper | 36px dots | Keep visual; if clickable, 44px |
| UX-P2-004 | My Trips | No delayed-flight status | Status badge from booking/ops events |
| UX-P2-005 | Wallet | No per-txn PDF | Finance mode document action |
| UX-P2-006 | Date pickers | Three implementations | Wheel/sheet on mobile, calendar desktop, one API |
| UX-P2-007 | `/snapp` | Finance-like service in Explore | Keep secondary; don’t put in bottom nav |
| UX-P2-008 | Chat + ContactDock + ToursPromo | Chrome noise on content pages | Contextual rules (already off on checkout) |

---

## P3 — polish (only after architecture + flows)

Photography, motion, editorial layouts, hover, skeletons, micro-interactions — Phase 13 in the roadmap. Do not spend implementation budget here yet.

Includes: hero glow text, extra badges, gradient service icons, decorative rounded-card overuse.

---

## Suggested first implementation slice (still future)

Not this session. When Phase 3 starts, one systemic PR:

1. Nav model (DesktopNav + BottomNav + AppChrome `/book` exception)
2. Explore hub (reuse `/book` or `/services`, delete the other catalog)
3. No Home restyle beyond removing duplicate quick-bar *if* Explore exists

If Home is redesigned without 1–2, the issue is **not** fixed (NO ISOLATED REDESIGN).
