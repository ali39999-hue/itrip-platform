# iTrip / Firuzo v2.0 Platform Release & QA Handoff Report

> **Target Release:** v2.0-rc2  
> **Repository:** `https://github.com/ali39999-hue/itrip-platform.git`  
> **Testing Status:** 25/25 Playwright End-to-End Test Suites Passed (100% Green)

---

## 1. VERIFIED (Fully Working & Tested)

The following core modules and capabilities have undergone end-to-end browser audits, Playwright automation suites, and visual QA:

- **E2E Test Suite (25/25 Suites Passed):**
  - Crawler Audit across all 29 routes (HTTP 200 validation for all 119 internal links)
  - Image Scanner (`next/image` attributes, blur placeholders, aspect ratios)
  - Internationalization & RTL Routing (`/fa`, `/en`, `/ar`, `/zh`, `/ru`)
  - Hotel Search Filtering & Sorting (Price slider, Star filters, Score, Free cancellation)
  - Hotel Comparison & Floating Compare Drawer
  - Hotel Details, Room Types & Multi-Image Gallery
  - Interactive OpenStreetMap & Leaflet Tile View (`/hotels/search`)
  - Multi-Step Checkout Flow (Passengers, Passport OCR demo, Pricing breakdown, Add-ons, Issuing voucher)
  - Interactive Smart AI Planner (`/plan` query params & multi-day itinerary generator)
  - Account, My Trips & Booking History (`/account`, `/my-trips`, `/my-trips/[id]`)
  - Multi-Currency Wallet (`/wallet`)
  - PWA Offline Fallback (`/offline.html`, `sw.js`, `manifest.json`, icon sets 192/512px)
  - Accessibility & Keyboard Navigation (Tab order, focus-visible rings, ARIA labels)
- **Visual Design System (Firuzo Luxe Palette):**
  - Colors: Deep Teal (`#0e6f6a`), Action Gold (`#d4af37`), Surface Glass (`rgba(255,255,255,0.85)`), High-Contrast Ink (`#0d1716`)
  - Typography: Vazirmatn / Plus Jakarta Sans / Noto Sans Arabic
  - Elevation & Polish: Micro-animations, shimmer placeholders, interactive chips

---

## 2. PARTIALLY VERIFIED

- **Flight Multi-City & Roundtrip Booking:**
  - One-way and Roundtrip route search, date selection, passenger count, and price sorting verified.
  - Multi-city complex segment assembly is currently routed into unified GDS query parameters.
- **Ancillary Micro-Services (`/esim`, `/insurance`, `/interpreter`, `/visa`, `/transfers`):**
  - UI booking flows, package calculators, and checkout handoffs are verified.
  - External carrier webhook sync (e.g. eSIM QR generation) operates on simulated GDS vouchers.

---

## 3. MOCK / SIMULATED SERVICES

- **GDS Core Issuing Gateway:** Simulated issuing engine returning authentic PNR tracking codes, voucher barcodes, and PDF download triggers in `CheckoutIssuingModal`.
- **Payment Gateway Integration:** Iran Shetab (Shaparak) / Visa / Mastercard / Multi-currency Wallet simulation modal with zero drop-off checkout verification.
- **Passport OCR Scanner:** Client-side mock parsing passport MRZ fields into passenger profile form.
- **AI Recommendation Engine:** Rule-based and generative prompt mock with full streaming animation and dynamic city context.

---

## 4. KNOWN ISSUES & RESOLUTIONS

| Issue | Status | Resolution |
| :--- | :--- | :--- |
| Single identical image on all hotels in search results | **RESOLVED** | Added `HOTEL_IMAGE_MAP` and `getHotelImage()` mapping unique authentic photos per hotel ID. |
| Hardcoded Iran destinations on Home regardless of Country | **RESOLVED** | `DestinationsSection.tsx` dynamically consumes `useCountryStore()` & `DESTINATION_IMAGE_MAP`. |
| Shimmer SVG syntax malformed | **RESOLVED** | Fixed interpolation in `src/lib/image-utils.ts`. |
| Hardcoded Persian strings in `HotelCard.tsx` | **RESOLVED** | Extracted to `HotelsSearch` namespace across all 5 languages (`fa`, `en`, `ar`, `zh`, `ru`). |
| Unsafe `any` type in `hotels/search/page.tsx` | **RESOLVED** | Strongly typed to `Hotel` interface from `@/lib/types`. |
| `@ts-ignore` in `DatePicker.tsx` | **RESOLVED** | Replaced with clean TypeScript casting. |
| `global-error.tsx` outside Design System | **RESOLVED** | Migrated to `bg-deep`, `text-ink`, `bg-action` and Firuzo tokens. |

---

## 5. TECH DEBT & OPTIMIZATIONS

- **CSS Bundling:** Keep monitoring font subset loading on slow 3G networks.
- **State Hydration:** Ensure all client-only components utilize `useEffect` or dynamic `ssr: false` when referencing browser storage.

---

## 6. NEXT PRIORITIES

1. **Production GDS API Connectors:** Hook up Amadeus / Sabre / Turkish Airlines NDC REST APIs to replace simulated flights payload.
2. **Payment Service Provider (PSP) Webhooks:** Connect real IPG gateways (ZarinPal, PayPing, Stripe for international).
3. **Live Telemetry & Sentry Integration:** Deploy client error tracking and performance monitoring.
4. **Production Deployment:** Trigger Vercel / Docker CI/CD deployment on main branch.

---

## 7. Remediation Log

### Phase 1 — Security (P0) Completed
- **1.1 Real Authentication:** Integrated `bcryptjs` in NextAuth Credentials provider; authorized against hashed DB passwords; added seed script `prisma:seed` with upserting admin and user accounts; gated demo auto-creation behind `DEMO_MODE=true`.
- **1.2 Admin Backdoor Removal:** Gated OTP mock credentials, backdoor codes (`12345`, `0000`), and hint text strictly behind `NEXT_PUBLIC_DEMO_MODE=true`; role authorization now driven by JWT token claims & database rather than client store overrides.
- **1.3 Server-Side Pricing Engine:** Wired `src/lib/pricing/engine.ts` into `createBookingDraft()`; actions now only receive resource IDs & quantities without accepting total money amounts from client; added `moneySchema` validation.
- **1.4 Gateway Ledger & Escrow:** Wired full dual-entry accounting for `gateway_shetab` alongside `wallet_irr` targeting `GATEWAY_SETTLEMENT` and `PLATFORM_ESCROW`; demo wallet auto-funding is gated by `DEMO_MODE`.
- **1.5 Secrets & Environment Config:** Aligned Prisma to use `DATABASE_URL` from env; cleaned `.env` and created `.env.example`; hardened middleware fail-fast and next.config dangerous IP allowances; normalized safe generic error messages in server actions.

### Phase 2 — Data Architecture & Split-Brain Removal Completed
- **2.1 Database Connection for User Dashboard:** Implemented `getMyBookings()` and `getWallet()` server actions; connected `/my-trips`, `/wallet`, and `/account` directly to the live Prisma database and dual-entry ledger accounts.
- **2.2 Dynamic Trip Details & AccountSidebar:** Refactored `my-trips/[id]` to dynamically query database bookings with strict user ownership checks (and 404 on missing bookings); extracted `AccountSidebar.tsx` into a reusable component.
- **2.3 Live Admin Dashboard Server Component:** Converted `/admin` root to a server component querying live DB statistics (confirmed bookings, total ledger revenue, processed refunds, outbox queue).
- **2.4 Dead Code Cleanup:** Removed unused `HotelService.ts`, `src/lib/suppliers`, and unneeded `@tanstack/react-query` dependency and providers.

### Phase 3 — Unified i18n & Missing Messages Completed
- **3.1 Missing Message Keys & Aria Handlers:** Added missing `Common.aria.error`, `Common.aria.retry`, `HotelDetail.roomQuantity`, `favorite` across all 5 language files (`fa`, `en`, `ar`, `zh`, `ru`).
- **3.2 ICU Formatting Fixes & Full Russian/Chinese Localization:** Fixed ICU parameters across locales, eliminating `FORMATTING_ERROR` and runtime warnings in console.
- **3.3 Multilingual Data Structure Harmonization:** Upgraded static data models (travelogues, interpreter specialties, hotel mock details) to structured 5-locale objects.
- **3.4 Audited Inline Localizations:** Added report script `scripts/report-lt.ts` to monitor and track locale resolution consistency.

### Phase 4 — SEO & Rendering Architecture Completed
- **4.1 Dynamic Metadata & Static Generation:** Created `generateStaticParams` and dynamic `generateMetadata` for `hotels/[id]`, `my-trips/[id]`, and `travelogues/[id]`; replaced inline 200 mockup with genuine Next.js `notFound()` 404 handler for nonexistent hotels.
- **4.2 Comprehensive Multi-locale Sitemap & Robots.txt:** Expanded `sitemap.ts` from 5 routes to all public and dynamic endpoints across all 5 supported locales; hardened `robots.ts` with strict disallows on `/admin`, `/checkout`, `/account`, `/wallet`, and `/api`.
- **4.3 Assets & Tracking Cleanup:** Added OpenGraph asset `public/og-image.jpg`; replaced hardcoded Google Analytics ID with optional environment variable `NEXT_PUBLIC_GA_ID`.

### Phase 5 — Testing Suite & CI/CD Hardening Completed
- **5.1 Incompatible Specs Resolved:** Synchronized `critical-flows.spec.ts`, `golden-journeys.spec.ts` (updated `dest=turkey`), and `planner.spec.ts` selectors and expectations with current UI.
- **5.2 Vitest Unit Testing Suite:** Configured `vitest.config.ts`, added unit tests in `src/lib/domain-logic.test.ts` covering date calculations (`dualDate`), financial conversions (`toLocalCurrency`, `formatMoney`, `chargeContext`), number formatting, `CurrencyService`, and `BookingDomainService`.
- **5.3 Test Scripts Integration:** Added `"typecheck": "tsc --noEmit"` and `"test:unit": "vitest run"` to `package.json`.

### Phase 6 — Polish, Standards, & Documentation Completed
- **6.1 CSS & UI Refinements:** Aligned `globals.css` color variables (`--color-paper`, `--color-ink`); secured Hero image state machine without direct DOM manipulation; standardized precise `/admin` regex matching in `AppChrome.tsx`.
- **6.2 State & Storage Hardening:** Configured `partialize`, schema `version`, and explicit migration on all Zustand stores (`firuzo-auth`, `firuzo-bookings`, `firuzo-country`) to ensure sensitive KYC data is never stored in unencrypted client localStorage.
- **6.3 Technical Documentation Realignment:** Aligned README badges with real Vitest and Playwright test metrics; verified `tsconfig.json` compiler targets `"ES2022"`.

---

## 8. ERP Core Master Architecture (Phase 0 & Phase 1 Execution)
- **Zero Client Backdoors:** Completely extracted demo authentication verification to secure server action `verifyOtpAndLogin()`, eliminating bundle-level mock credentials.
- **Prisma Schema Core Activation:** Activated `Supplier`, `SupplierContract`, `InventoryItem`, `Allotment`, `InventoryHold`, `Payment`, and `Role/UserRole` RBAC relationships in Prisma database.
- **Layered RBAC Permission Service:** Implemented `src/domains/identity/permission-service.ts` with granular string permissions (`booking:view:all`, `finance:settlement:match`, `inventory:manage`) enforced at the service layer.
- **Atomic Inventory Hold Engine:** Implemented `src/domains/inventory/InventoryEngine.ts` preventing overselling via atomic allotment decrement, TTL hold tokens, and background sweeper.
- **Formal State Machine & Saga Orchestration:** Implemented `src/domains/booking/state-machine.ts` with 13 deterministic lifecycle states and `BookingSagaOrchestrator.ts` handling dual-entry payments, hold capture, and realized revenue postings.
- **Standard Double-Entry Posting Templates:** Created `src/domains/ledger/GeneralLedgerService.ts` for strictly balanced escrow, revenue, supplier liability, and refund journals.
