# UX Route Matrix

Scope: traveler-facing App Router under `src/app/[locale]/`. Admin/ERP routes are listed only as **out of traveler IA**.

Legend:

- **IA:** PRIMARY · SECONDARY · UTILITY · CONTEXTUAL · REDIRECT · ADMIN
- **Mode:** Discovery · Search · Commerce · Trip · Finance · Account · Utility
- **States:** L loading · E empty · R error/retry · V validation · P permission · $ price-change

Primary CTA is the one action the page exists to complete.

---

## A. Primary destinations

| Route | File | Purpose | User | Primary task | Primary CTA | Secondary | IA | Mode | UX problems now | Missing states | Downstream |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | `page.tsx` + `HeroSection` | Start a trip search; inspire | Guest / customer | Answer “where are you going?” | Search submit | Service icons, dest cards, AI hook | PRIMARY | Discovery | Catalog density; QuickServices duplicates search; bus→trains | Network retry | `/flights/search`, `/hotels/search`, `/tours`, `/plan` |
| `/book` | `book/page.tsx` | Service picker (mobile tab 2) | Guest | Choose a product to search | Tile → product search | Quick list (snapp, visa, …) | PRIMARY (mislabeled Search) | Discovery | Hardcoded FA tags; chrome hides BottomNav; not a search form | Empty N/A | Product routes |
| `/my-trips` | `my-trips/page.tsx` | List purchases / lookup | Customer / guest w/ ref | Find a trip | Open trip / guest lookup | Import ticket | PRIMARY | Trip | Sidebar makes it feel like Account | Delayed status | `/my-trips/[id]` |
| `/my-trips/[id]` | `my-trips/[id]/page.tsx` | Operate one booking | Owner | See voucher, cancel, countdown | Boarding pass / documents | SOS, splitter, invoice | PRIMARY | Trip | Booking not Trip OS; AccountSidebar | Item-level empty (no eSIM yet) | `/voucher/[id]`, `/invoices/[id]`, `/support` |
| `/wallet` | `wallet/page.tsx` | Balance, top-up, FX | Customer | Understand money + top up | Top-up | FX exchange | PRIMARY | Finance | Must stay visually distinct from marketplace cards | Receipt PDF per txn | Checkout wallet pay |
| `/account` | `account/page.tsx` | Profile, KYC, loyalty | Customer | Manage identity | Save profile / KYC | Travelers, org, auto-buy | PRIMARY | Account | Mixes wallet snapshot | Permission if session drop | `/account/travelers`, `/auth` |

---

## B. Search & select

| Route | File | Purpose | Primary CTA | IA | Mode | Notes |
|---|---|---|---|---|---|---|
| `/flights` | `flights/page.tsx` | Flight landing | Go to search | SECONDARY | Discovery | Extra entry vs Home/header |
| `/flights/search` | `flights/search/page.tsx` | Decision list | Select fare → cart/checkout | SECONDARY | Search | Compare, calendar, refund modal, `EmptyState`, live-meta stale. Filters heavier on desktop. Inventory MOCK/BETA. |
| `/hotels` | `hotels/page.tsx` | Hotel landing | Search | SECONDARY | Discovery | |
| `/hotels/search` | `hotels/search/page.tsx` | Faceted results + map | Open hotel | SECONDARY | Search | Best-in-class: sidebar + `HotelFilterSheet`, chips, compare, skeleton, empty. Accepts `city`/`destination`/`q`. |
| `/hotels/[id]` | `hotels/[id]/page.tsx` | Decision confidence | Book room (sticky) | CONTEXTUAL | Commerce | BottomNav hidden. Needs included/excluded/cancel. Inventory MOCK. |
| `/tours` | `tours/page.tsx` | Tour catalog | Open tour | SECONDARY | Discovery | Header treats as high-intent |
| `/tours/[id]` | `tours/[id]/page.tsx` | Tour detail | Book (sticky) | CONTEXTUAL | Commerce | BottomNav hidden. Allotment REAL. |
| `/plan` | `plan/page.tsx` | NL + wizard itinerary | Generate / add to cart | SECONDARY | Discovery | AI must not invent live prices |
| `/destinations` | `destinations/page.tsx` | Browse places | Pick destination → search | SECONDARY | Discovery | Candidate Explore content |
| `/travelogues`, `/travelogues/[id]` | editorial | Read | CONTEXTUAL | Discovery | |
| `/guide` | `guide/page.tsx` | Practical guide | Read | UTILITY | Discovery | |

---

## C. Commerce / checkout

| Route | File | Purpose | Primary CTA | IA | Mode | States / risks |
|---|---|---|---|---|---|---|
| `/cart` | `cart/page.tsx` | Unified trip-in-progress | Checkout | UTILITY | Commerce | Client store + server cart resume. Empty cart. |
| `/checkout` | `checkout/page.tsx` | Passengers → pay → issue | Pay | CONTEXTUAL | Commerce | Phases: passengers, payment, issuing, success. Addons/referral/cross-sell inline. SoftLockTimer, reprice, StickyMobileBar. Auth + hold expiry. |
| `/payment-status` | `payment-status/page.tsx` | PSP return | Continue to trip | CONTEXTUAL | Commerce | Redirects, failure retry |
| `/demo/ecardo-checkout` | demo | Gateway demo | — | UTILITY | Commerce | Not traveler IA |
| `/verify` | verify | Payment/booking verify | — | UTILITY | Commerce | |
| `/voucher/[id]` | voucher | Show/verify voucher | Download / offline | CONTEXTUAL | Trip | HMAC verify REAL |
| `/invoices/[id]` | invoices | Tax invoice | Download | CONTEXTUAL | Finance | |

---

## D. Super-app services (should attach to Trip)

| Route | Purpose | Primary CTA | IA now | Target IA | Attach-to-trip |
|---|---|---|---|---|---|
| `/esim` | Buy data package | Add to cart / checkout | SECONDARY | SECONDARY + Trip child | Missing as Trip OS section |
| `/insurance` | Buy policy | Continue | SECONDARY | same | Checkout addon exists |
| `/transfers` | Airport car | Book | SECONDARY | same | |
| `/cip` | Airport lounge | Book | SECONDARY | same | |
| `/visa` | Visa assistance | Start | SECONDARY | same | Often ops, not instant |
| `/trains` | Rail search | Search | SECONDARY | same | Bus tile wrongly points here |
| `/city-pass` | City transit pass | Buy | SECONDARY | same | |
| `/snapp` | Ride wallet top-up | Top up | SECONDARY | UTILITY/finance-adjacent | Not a trip item unless tagged |
| `/interpreter` | Interpreter / SOS-ish | Request | SECONDARY | Support + service | Header calls it SOS |
| `/services` | Full catalog | Filter + open | SECONDARY | Merge with Explore | Duplicates `/book` |
| `/services/about` | About | Read | UTILITY | Utility | |

---

## E. Account cluster

| Route | Purpose | IA |
|---|---|---|
| `/auth` | Sign in / OTP | UTILITY |
| `/account/travelers` | Passenger profiles | CONTEXTUAL |
| `/account/organization` | B2B hub | CONTEXTUAL (role) |
| `/account/auto-buy` | Auto-buy rules | CONTEXTUAL |
| `/support` | Tickets / help | UTILITY |

---

## F. Redirects & chrome exceptions

| Route | Behavior |
|---|---|
| `/trips` | `redirect` → `/{locale}/my-trips` |
| Admin `src/app/[locale]/admin/**` | Own layout, no traveler Header/BottomNav |
| Checkout, payment-status, book, ecardo demo | `AppChrome` hides BottomNav, ContactDock, chat, tours promo |
| Hotel/tour detail | BottomNav self-hides |

---

## G. Admin (not in traveler transformation)

`/admin`, bookings, finance, inventory, ops, organizations, users, travel-files, tickets, tours, suppliers, settings, logs, manifests, referrals, analytics/behavior, content, exceptions, operator.

Mode: Admin density. Do not restyle as marketplace cards.

---

## H. Route-to-purpose mapping (target)

| User intent | Canonical route | Must not send user to |
|---|---|---|
| I want to go somewhere | `/` search | Random service tile |
| I want to browse inspiration | Explore hub (`/book` retargeted or `/destinations`) | `/admin` |
| I need a flight/hotel/tour now | `/flights/search` etc. | A second competing home |
| I am paying | `/checkout` | Product-specific payment forms |
| I already bought | `/my-trips` | Wallet, unless the question is money |
| I need money tools | `/wallet` | Service catalog |
| I need me / travelers / security | `/account` | Trip detail sidebar overload |
| I need help about this trip | Trip detail → support | Generic chat with no trip id |

---

## I. Coverage of required states (critical paths)

| Path | Happy | Validation | Empty | API fail | Permission | Expired | Mobile | RTL |
|---|---|---|---|---|---|---|---|---|
| Home → Search | Partial | SearchWidget `error` | — | Not designed | n/a | n/a | Hero+widget | dir on html |
| Flight results | Yes | — | EmptyState | toast | n/a | stale cache badge | card+filters TBD sheet | mixed |
| Hotel results | Yes | — | HotelEmptyState | weak | n/a | — | FilterSheet | |
| Detail → cart | Yes | — | rooms empty TBD | — | n/a | inventory | sticky CTA | |
| Cart → checkout | Yes | passenger zod | empty cart | gateway map | auth gate | SoftLockTimer | StickyMobileBar | |
| Pay → confirm | Yes | — | — | payment-status | — | duplicate submit protection in domain | | |
| My trip | Yes | cancel modal | list empty | 404 | IDOR server | — | boarding pass | |
| Wallet | Yes | amount | login | — | auth | — | chips | |
| Plan | Wizard | — | — | loading only | — | — | | |

Automated E2E exists (`tests/*.spec.ts`, 33 specs recorded) but this pack does not treat “e2e PASS” as visual proof at 320px.
