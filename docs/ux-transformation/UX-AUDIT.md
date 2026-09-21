# UX Audit — Phase 0 Baseline

**Audited:** 2026-09-21  
**Code root:** `itrip-platform/`  
**Product version:** `1.8.6` (`package.json`)  
**Git note:** `main` was observed ahead of `origin/main` with dirty `docs/baseline/*` from another session. This audit does not depend on those dirty files.  
**Production:** `https://itrip-platform.vercel.app/` reported aligned at 1.8.6 in `FEATURE_REALITY_MATRIX.md` — live route-by-route browser pass is **not** claimed in this document (not run from this session).

This is an inventory, not a redesign. No `src/` files were modified.

---

## 1. What this product actually is

Firuzo / iTRIP is a Next.js 16 App Router travel platform with:

- Traveler portal under `src/app/[locale]/` (5 locales: `fa` default, `en`, `ar`, `zh`, `ru`)
- ERP / admin under `/admin`
- Domain logic in `src/domains/` (booking saga, ledger, inventory, payments)
- Design tokens in `src/app/globals.css` (`brand`, `brand-dark`, `action`, `ink`, `surface`, elevation shadows)
- Quality gates that currently report PASS in `docs/baseline/quality-report.json` (typecheck, lint, i18n, a11y 0 blocking, 1140 unit tests)

The engineering kernel is stronger than the **experience architecture**. Users still meet many parallel products (flights, hotels, tours, eSIM, snapp, city-pass, visa, …) rather than one journey:

```
DISCOVER → SEARCH → PLAN → SELECT → BOOK → PAY → CONFIRM → MANAGE TRIP → SUPPORT → AFTER-TRIP
```

---

## 2. Freeze: what must not be redesigned away

| Asset | Location | Verdict |
|---|---|---|
| Semantic color + elevation tokens | `src/app/globals.css` | Keep; complete density/z-index/motion later |
| Button `brand` / `action` | `src/components/ui/button.tsx` | Keep; enforce usage rules |
| Sheet + Dialog with focus trap | `src/components/ui/Sheet.tsx`, `Dialog.tsx` | Keep as primitives |
| Mobile sheets / sticky CTA | `src/components/mobile/*` | Keep; make them the **only** mobile overlay pattern |
| Unified EmptyState | `src/components/ui/EmptyState.tsx` (+ re-export `empty-state.tsx`) | Keep |
| Search widget + mode tabs | `src/components/search/*` | Keep; simplify IA around it |
| Hotel search system (filters, sheet, compare, map) | `src/components/hotels/search/*` | Stronger than flights; use as pattern |
| Flight decision card | `src/components/flights/BentoFlightCard.tsx` | Keep; align other product cards to this decision density |
| Checkout application service + stepper | `src/domains/booking/CheckoutApplicationService.ts`, `CheckoutStepper.tsx` | Keep logic; extend phases |
| Sticky checkout bar | `src/components/checkout/StickyMobileBar.tsx` | Keep; document vs `StickyCTA` |
| Cart | `/cart`, `UnifiedCartDrawer` | Keep as Trip-in-progress |
| My Trips artifacts | `BoardingPassCard`, `TripCountdown`, offline voucher | Keep; wrap in Trip OS shell |
| Bottom nav 5 slots | `BottomNav.tsx` | Keep slot count; retarget Explore |
| `viewportFit: cover` | `[locale]/layout.tsx` | Keep |
| Logical direction + next-intl | routing, `dir` on `<html>` | Keep |
| `/trips` → `/my-trips` | `trips/page.tsx` | Keep canonical |

---

## 3. Information architecture as shipped

### 3.1 Mobile bottom navigation (primary, `< lg`)

From `src/components/layout/BottomNav.tsx`:

| Slot | Label key | Target | Hidden on |
|---|---|---|---|
| 1 | home | `/` | — |
| 2 | search | `/book` | — |
| 3 | myTrips | `/my-trips` (or `/auth?callbackUrl=`) | — |
| 4 | wallet | `/wallet` | — |
| 5 | account | `/account` (or auth) | — |

Hidden on checkout, payment-status, hotel detail, tour detail. Chrome also hides BottomNav on `book` and `demo/ecardo-checkout` via `AppChrome` `isCheckout` regex — **slot 2 `/book` therefore has no bottom nav**, which is inconsistent with treating `/book` as a primary destination.

### 3.2 Desktop header (primary + mega-menus, `xl+`)

From `DesktopNav.tsx`:

- Always visible: Flights `/flights/search`, Hotels `/hotels/search`, Tours `/tours`
- Dropdown **Explore:** destinations, tours (again), travelogues, guide
- Dropdown **Services:** snapp, city-pass, flights (again), hotels (again), visa, insurance, transfer, cip, trains, esim, about
- Dropdown **Trips:** my-trips, wallet, interpreter (labeled SOS), **admin**

Problems:

1. Flights/Hotels appear both as top links and inside Services.
2. Admin is in traveler navigation.
3. Interpreter is labeled SOS but is a paid service page.
4. There is no single Explore hub; `/book` is a second catalog.

### 3.3 Home composition

`src/app/[locale]/page.tsx` order:

1. Optional CMS announcement  
2. Hero + `SearchWidget` (tabs: flights, hotels, tours, plan)  
3. `QuickServicesBar` (icon grid of products; bus tile points at `/trains`)  
4. Promos, popular flights, special offers, destinations, comparator, AI hook, app download, why Firuzo, FAQ, trust  

Home is closer to a **feature catalog** than the target:

```
Hero → Search → Personalized suggestions → Destinations → Bundles → Services → Editorial → Trust
```

`QuickServicesBar` duplicates Search tabs and `/book`.

---

## 4. Journey integrity (system, not pages)

| Journey | Current path | Breaks |
|---|---|---|
| Discover | `/` + destinations + travelogues | Competing catalogs (`/`, `/book`, `/services`, quick bar) |
| Search | `SearchWidget` → `/flights/search`, `/hotels/search`, `/tours`, `/plan?q=` | Flight vs hotel filter/map maturity mismatch; no unified “search session” object |
| Plan | `/plan` wizard + NL query | Isolated; “add whole plan to cart” not a first-class OS action |
| Select | Cards + compare (flights/hotels) | Tours/services still information cards; claims must stay capability-gated |
| Book / Pay | `/cart` → `/checkout` phases passengers → payment → issuing | Missing Review phase; addons not a named step; services can also jump `setBookingContext` straight to checkout |
| Confirm | `SuccessConfirmation` + voucher | Must land in Trip OS, not a dead-end success screen |
| Manage trip | `/my-trips`, `/my-trips/[id]` | Detail is booking-centric (PNR, cancel, boarding pass) plus `AccountSidebar` — not a trip container for eSIM/hotel/transfer |
| Wallet / Account | `/wallet`, `/account`, `/account/travelers` | Distinct enough; wallet and account both show money — watch visual mode |
| Support | `/support`, chat widget, interpreter | Chat is global chrome; not trip-contextual |

---

## 5. Duplicate / competing implementations

These are **systemic**. Fix once.

| Problem | Instances |
|---|---|
| Empty states | Canonical `EmptyState`; hotels still have `HotelEmptyState` |
| Sticky conversion | `StickyCTA` (docked, above nav) vs `StickyMobileBar` (checkout, nav hidden) — documented in code, but other pages may roll their own `fixed bottom-0` |
| Overlays | `Sheet`, `Dialog`, plus feature sheets (`HotelFilterSheet`, `DatePickerSheet`, `FilterSheet`, `KycCompletionSheet`, passport modal) |
| Service directories | Home quick bar, `/book` tiles, `/services` filterable catalog, header Services mega-menu |
| Trip list vs account chrome | `AccountSidebar` on my-trips list **and** trip detail |
| Search entry | Header `CityHotelSearch`, Hero `SearchWidget`, `/book` tiles, `/flights` landing |
| Date picking | `DatePicker.tsx`, `JalaliWheelDatePicker.tsx`, `DatePickerSheet.tsx` |

---

## 6. State coverage (idle / loading / empty / error / retry)

| Surface | Loading | Empty | Error / retry | Notes |
|---|---|---|---|---|
| Home | CMS falls back; comparator has pulse skeleton | — | Network error not a first-class home state | Prompt requires retry on home |
| Flight search | spinner / skeleton in page | `EmptyState` | toast + capability stale meta | Nearby-dates empty not confirmed as productized |
| Hotel search | `HotelSkeletonList` | `HotelEmptyState` | — | Stronger than flights |
| Checkout | pending on pay | empty cart redirect | gateway errors via `translateGatewayError` | Price-change / expired hold exist as timer + reprice actions |
| My Trips | `Loader2` | guest lookup + empty | 404 on missing id | Delayed-flight state not a first-class badge |
| Wallet | loader | login gate | — | Finance density OK |
| Plan | `FiruzoAiLoading` | — | — | Must not invent prices |

Missing globally: consistent **partial results**, **permission denied**, **session expired** traveler patterns (admin has more of this).

---

## 7. Mobile / RTL / a11y baseline (from code, not a live device lab)

**Present:**

- `viewportFit: "cover"`
- `@utility touch-target`, `safe-pb`, `safe-pt`
- Bottom sheets for hotel filters
- `min-h-[44px]` on search tabs, many icon buttons
- `dir` from locale; logical `start`/`end` used in many components
- `gate:a11y` PASS with 0 blocking violations (fa + en, 14 funnels) per quality report
- `prefers-reduced-motion` mentioned on checkout sticky bar

**Gaps (code-level):**

- `/book` is a primary tab but chrome treats it as checkout-like (no BottomNav)
- Quick service icons use hard color gradients (blue/amber/purple) instead of brand tokens — visual noise vs DESIGN.md
- Hardcoded Persian marketing strings in `/book` tiles (`tag: '۴۰۰+ ایرلاین'`) despite i18n gate for message files
- Bus entry routes to `/trains`
- Checkout stepper circles are 36–40px — under 44px touch if they become interactive later
- Production visual QA of 320/360/390/430 was **not** re-run in this session (screenshots exist in workspace root from 2026-09-18/20)

---

## 8. Business-logic risks that UX must not paper over

From `FEATURE_REALITY_MATRIX.md` (authoritative capability truth):

- Flight inventory: MOCK/BETA (Parto cache / seeded)
- Hotel inventory: MOCK
- Shetab PSP: DISABLED
- Visa/Mastercard + USDT: COMING_SOON
- eCardo: REAL
- Wallet ledger: REAL
- Tours allotment: REAL
- Card-to-card: BETA (ops review)

UX rule (D-010): never show “live GDS” chrome or “pay with Visa” as if captured when capability is COMING_SOON. `CapabilityBadge` already exists — use it on search/detail, not only admin.

Checkout **must** keep server-authoritative totals (`repriceBookingAction`). Client `booking-store` is a draft, not the price of record.

---

## 9. Quality baseline (do not regress)

Recorded in `docs/baseline/quality-report.json` at generation time 2026-09-21:

| Gate | Status |
|---|---|
| typecheck | PASS |
| lint | PASS |
| i18n | PASS |
| security | PASS |
| uiux | PASS |
| unit | PASS (1140 / 166 files) |
| a11y | PASS (0 blocking) |
| build | PASS |
| e2e | PASS (33 specs recorded) |

This session did **not** re-run those commands (isolation; another session owns baseline files).

Scripts available when implementation starts: `npm run gate:a11y`, `gate:uiux`, `typecheck`, `lint`, `test:unit`.

---

## 10. Audit verdict

**Do not start visual polish.**  
**Do not redesign Home in isolation.**

The product has:

- A real checkout kernel
- A real wallet
- A real (booking-centric) My Trips
- A strong hotel search module
- A five-tab mobile chrome that almost matches the target IA

The product lacks:

- One Explore surface
- Navigation hierarchy (primary vs 11 equal services)
- Trip as a container for ancillaries
- Checkout Review + Services as named phases
- Honest capability communication on search/detail
- One overlay/empty/sticky pattern used everywhere

**Next:** `UX-ARCHITECTURE.md` (Phase 1) is the design of those systems. Implementation of navigation/Home is Phase 3+ and must follow `UX-ROADMAP.md`.
