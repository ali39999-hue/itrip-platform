# Experience Architecture — Phase 1

This is the **target** mental model. Mapping to current files is explicit so implementation can migrate, not rewrite.

Related decisions: `UX-DECISION-LOG.md` D-004 … D-009.

---

## 1. Operating-system loop

```
DISCOVER → SEARCH → PLAN → SELECT → BOOK → PAY → CONFIRM → MANAGE TRIP → SUPPORT → AFTER-TRIP
```

Every screen must answer:

1. Where am I?
2. What can I do here?
3. What is the current state?
4. What happens next?
5. What do I need to provide?
6. What have I already purchased?
7. How much does it cost?
8. How do I continue?

---

## 2. Product surfaces (five, not fifty)

| Surface | Job | Canonical route | Density mode |
|---|---|---|---|
| **Home** | Intent + search | `/` | Discovery |
| **Explore** | Inspiration + all services without equal priority | `/book` (retarget) or `/explore` alias | Discovery |
| **Trips** | Post-purchase OS | `/my-trips` | Trip |
| **Wallet** | Trust + money | `/wallet` | Finance |
| **Account** | Identity, travelers, security | `/account` | Account |

Secondary (not bottom-nav): Flights, Hotels, Tours, Plan, eSIM, Insurance, Visa, Transfer, Trains, City Pass, CIP, Interpreter, Snapp, Guide, Destinations, Travelogues.

Utility: Auth, Support, Cart, Checkout, Payment status, Voucher, Invoice.

Admin: never in customer primary/secondary nav.

---

## 3. Navigation model

### 3.1 Hierarchy

```
PRIMARY     Home, Explore, Trips, Wallet, Account
SECONDARY   Flights, Hotels, Tours, Plan
CONTEXTUAL  Search results, details, checkout, trip id
UTILITY     Cart icon, support, language/country, theme
```

### 3.2 Mobile (`< lg`)

Keep **five** `BottomNav` slots:

| Slot | Label | href | Notes |
|---|---|---|---|
| Home | home | `/` | |
| Explore | explore (not “search”) | `/book` as hub **or** `/destinations` until hub ships | BottomNav **visible** |
| Trips | myTrips | `/my-trips` | auth callback preserved |
| Wallet | wallet | `/wallet` | |
| Account | account | `/account` | |

Hide BottomNav only when a **thumb-zone sticky CTA** owns the bottom: checkout, payment-status, hotel/tour **detail** (already), maybe payment webview. **Do not** hide on Explore hub.

Back: platform back + page `MobileHeader` (RTL chevron `rtl:rotate-180`). Deep links restore search query string (`from`, `to`, `city`, dates).

Sheets: all pickers (date, pax, city, filters, sort) on `<768` use `Sheet` side=bottom + drag pill.

### 3.3 Desktop (`xl`)

```
Logo | Flights | Hotels | Tours | Explore ▾ | Plan |   spacer   | Cart | Wallet | Account
```

Explore ▾: destinations, travelogues, guide, **all ancillary services**.  
Do **not** repeat Flights/Hotels inside Explore.  
Do **not** put Admin or SOS-as-interpreter here.

Tablet (`md`–`lg`): desktop compact or mobile nav — pick one in Phase 3; default to BottomNav + hamburger, not a broken half-mega-menu.

### 3.4 Why each item sits where it sits

| Item | Placement | Why |
|---|---|---|
| Search widget | Home (and sticky on Explore) | Highest frequency intent |
| Flights/Hotels/Tours | Desktop secondary always-on | Highest revenue intents; muscle memory |
| Plan/AI | Secondary + inside Search tab | Companion, not a sixth tab |
| eSIM etc. | Explore + checkout addons + trip attach | Low frequency until after core book |
| Cart | Utility icon | Trip-in-progress, not a primary life-state |
| Admin | Account (staff) / URL | Role, not a travel intent |
| Interpreter | Explore + trip support | Not navigation SOS |

---

## 4. User journeys (target)

### 4.1 Core commerce

```
Home SearchWidget
  → Results (filters/sort/compare)
    → Detail (decision page + sticky CTA)
      → Cart (unified)
        → Checkout (passengers → services → review → pay)
          → Confirmation
            → My Trip OS
```

### 4.2 Plan-led

```
Search tab Plan  or  /plan
  → Understand intent (SHOW)
    → Recommend itinerary (REVIEW)
      → Confirm items
        → Add to cart (APPLY)
          → same checkout
```

### 4.3 Ancillary attach

```
Buy eSIM (Explore or checkout addon)
  → Attach to trip (or create trip shell)
    → Appears in My Trip → Services
```

Same for insurance, transfer, CIP.

### 4.4 In-trip

```
My Trips → Trip
  ├── Timeline
  ├── Upcoming action
  ├── Flight / Hotel / Tour / Transfer / eSIM / Insurance / Visa
  ├── Documents / Vouchers / Payments
  └── Support (“ask about my trip”)
```

---

## 5. Search architecture

Progressive disclosure:

```
DESTINATION → DATES → TRAVELERS → SEARCH
then FILTER / SORT / MAP / COMPARE / SAVE
```

States: idle, typing, autocomplete, recent, popular, loading, partial, success, no results, error, retry, invalid combo, date constraints, traveler constraints.

**Reuse:** `SearchWidget`, `SearchModeTabs`, `CityAutocomplete`, `TravelerPicker`, hotel filter sheet.

**Unify:** flight filters should use the same `FilterSheet` contract as hotels.

Mobile:

```
Search → Bottom sheet filters → Results → Map/List toggle
```

Do not collapse desktop columns and call it mobile.

---

## 6. Decision cards (SELECT)

Cards are **decision instruments**, not information dumps.

Priority: WHAT · WHEN · WHERE · PRICE · KEY CONDITIONS · WHY THIS OPTION · PRIMARY ACTION.

Flights (`BentoFlightCard`) already close: airline, times, duration, baggage, price, select, compare, cheapest flag. Extend hotels/tours/services to the same questions. Never invent “Best” without a stated basis.

---

## 7. Detail pages

Shared outline, different visual mode (Discovery vs Commerce):

Hero → Summary → Key facts → Options → Conditions → Included → Excluded → Reviews/trust → Location → Related → CTA

Mobile: content + sticky bottom CTA (`StickyCTA` with `aboveNav` if BottomNav visible).

---

## 8. Unified booking

One order context. Never separate flight form / hotel form / insurance form as unrelated checkouts.

| Phase | Responsibility |
|---|---|
| Trip | What is in the cart; dates; route |
| Passengers | Manifest; saved travelers; passport rules |
| Services | eSIM, insurance, transfer opt-in |
| Review | Authoritative server price, taxes, FX, conditions |
| Payment | Wallet / eCardo / card-to-card; disabled rails honest |
| Confirmation | Voucher + deep link to Trip OS |

Frontend never trusts client totals. Handle: loading, price change, expired inventory, payment fail, retry, partial, redirect, session expiry, duplicate submit (domain already has idempotency — surface it).

---

## 9. Deep links

Preserve query params across locale prefix:

- Flights: `from`, `to`, dates, pax, country
- Hotels: canonical `city` (accept legacy `destination`/`q`)
- Plan: `q`, `dest`, `who`, `days`
- Checkout resume: existing unpaid cart / booking id
- Trip: `/my-trips/[id]`
- Auth: `callbackUrl`

Locale switch must keep path+query (`next-intl` navigation already used).

---

## 10. Cross-feature transitions

| From | To | Mechanism |
|---|---|---|
| Result select | Cart | `UnifiedCartService` + store |
| Cart | Checkout | single `/checkout` |
| Checkout success | Trip | `router` to `/my-trips/[id]` not a dead success island |
| Service page | Checkout | same cart line types |
| Chat / Plan | Cart | explicit confirm |
| Trip | Support | ticket with `bookingId` |

---

## 11. Design-system completion (Phase 2 input, not rewrite)

Preserve tokens. Fill gaps:

- Density modes (Discovery … Admin)
- Motion (feedback/orientation only)
- Z-index scale (header, sheet, nav, toast) — BottomNav is `z-[85]`, mobile drawer `z-[250]`, search widget `z-[70]` — document a scale
- Iconography rules (flip only directional chevrons)
- Form controls already growing (`amount-input`, `otp-field`, `national-id-input`) — keep, don’t duplicate

Usage rule: before a new component, search `src/components/ui` and `src/components/mobile`.

---

## 12. Explicit non-goals for Phase 1

- No new npm overlay library
- No Home photography pass
- No admin visual refresh
- No second checkout
- No deleting working cart/ledger/booking code
