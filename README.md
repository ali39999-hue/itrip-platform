# iTrip / Firuzo Platform v2.0

> **Next-Generation International & Local Travel Booking Engine with AI Trip Planner & Multi-Currency Settlement**  
> Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, next-intl (5 Languages), Zustand, and Playwright E2E.

[![Playwright Tests](https://img.shields.io/badge/Playwright-26%2F26%20Passed-brightgreen)](https://playwright.dev/)
[![Next.js](https://img.shields.io/badge/Next.js-16.0-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-blue)](https://react.dev/)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline%20Ready-teal)](public/manifest.json)
[![Languages](https://img.shields.io/badge/Languages-FA%20%7C%20EN%20%7C%20AR%20%7C%20ZH%20%7C%20RU-orange)](messages/)

---

## 🌟 Overview & Architecture

**iTrip / Firuzo** is a full-featured, localized travel marketplace designed for effortless booking of flights, hotels, curated tours, and cross-border ancillary services (eSIM, travel insurance, on-demand live interpreter, visa processing, airport transfers).

```mermaid
graph TD
  User([User / Traveler]) --> Search[Unified 12-Col Search Engine]
  User --> Planner[AI Conversational Planner]
  
  Search --> Flights[/flights/search]
  Search --> Hotels[/hotels/search]
  Search --> Tours[/tours]
  
  Hotels --> HotelDetail[/hotels/:id]
  Hotels --> LeafletMap[Interactive OSM Map Pane]
  
  Flights --> Checkout[/checkout]
  HotelDetail --> Checkout
  Tours --> Checkout
  
  Checkout --> Passengers[Passport OCR & Passenger Form]
  Checkout --> Addons[eSIM + Insurance Addons]
  Checkout --> Payment[Shetab / USDT / Card Gateway]
  Payment --> Voucher[Instant GDS Voucher & PNR]
  
  User --> Wallet[/wallet Multi-Currency]
  User --> MyTrips[/my-trips Management]
  Admin([Platform Admin]) --> AdminERP[/admin ERP Portal]
```

---

## 🚀 Key Features

### 1. Unified 12-Column Responsive Search Engine
- Single-row alignment on desktop for all 4 search modes (`Smart Plan`, `Flights`, `Hotels`, `Tours`).
- Seamless Jalali / Gregorian date picker without double borders.
- Autocomplete destination city search across 7 countries.
- Touch-friendly responsive stacked layout on mobile.

### 2. Smart AI Trip Planner (`/plan`)
- Conversational journey wizard tailored to family, solo, business, or luxury preferences.
- Dynamic timeline builder with interactive budget calculator and 1-click bundle checkout.

### 3. Comprehensive Hotel Discovery (`/hotels/search`)
- Multi-parameter filtering: price range slider, star ratings, review scores, free cancellation.
- Interactive OpenStreetMap (Leaflet) tile view with hotel price pins and fly-to popups.
- Floating property comparison drawer.
- High-resolution, authentic photography mapped per property ID.

### 4. GDS Flights Booking (`/flights/search`)
- Visual flight duration timeline, airline badges, cabin class toggle, and baggage allowances.
- Instant checkout transition with cross-sell bundle recommendations.

### 5. Multi-Currency Settlement & Wallet (`/wallet`)
- Dual wallet architecture: Toman (IRR) and Tether (USDT).
- Simulated instant refund guarantees and payment tracking.

### 6. Full Internationalization & RTL
- 5 fully localized languages: Persian (`fa`, RTL), English (`en`, LTR), Arabic (`ar`, RTL), Chinese (`zh`, LTR), Russian (`ru`, LTR).
- Automated directional switching, localized fonts (Vazirmatn / Plus Jakarta Sans), and localized number formatting.

### 7. Progressive Web App (PWA)
- Custom service worker (`public/sw.js`) with cache-first tile caching and stale-while-revalidate static assets.
- Offline fallback page (`/offline.html`).
- Complete manifest with maskable and Apple touch icon sets.

---

## 🗺️ Route Inventory (29 Core Routes)

| Category | Routes |
| :--- | :--- |
| **Core & Discovery** | `/`, `/destinations`, `/services`, `/guide`, `/travelogues`, `/support` |
| **Search & Booking** | `/flights/search`, `/flights/checkout`, `/hotels/search`, `/hotels/[id]`, `/tours`, `/plan`, `/book`, `/checkout`, `/payment-status` |
| **Account & Trips** | `/auth`, `/account`, `/my-trips`, `/my-trips/[id]`, `/wallet` |
| **Ancillary Services** | `/esim`, `/insurance`, `/interpreter`, `/snapp`, `/trains`, `/transfers`, `/visa`, `/city-pass` |
| **Admin ERP** | `/admin`, `/admin/bookings`, `/admin/content`, `/admin/finance` |

---

## 🎨 Design System & Firuzo Palette

The platform adheres to the **Firuzo Luxe** design tokens:

```css
--color-brand: #00a9a5;       /* Primary Turquoise */
--color-brand-dark: #046e6b;  /* Deep Teal (Text & Focus) */
--color-deep: #053f3e;        /* Dark Forest Teal */
--color-mint: #e4f6f5;        /* Soft Mint Background */
--color-action: #f0a62a;      /* Saffron Gold (Primary CTA / Booking) */
--color-surface: #ffffff;     /* Pure White Card Surface */
--color-soft: #f4f8f8;        /* Soft Cool Neutral */
--color-line: #dce5e4;        /* Subtle Border Line */
```

### Component Primitives (`src/components/ui/`)
- `Card`, `Badge`, `Skeleton`, `Dialog` (Modal), `Sheet` (Mobile Drawer), `Tabs`, `Tooltip`, `Avatar`, `EmptyState`, `Button`, `DatePicker`.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 18.18+ or 20+
- npm, yarn, or pnpm

### Installation

```bash
# 1. Clone repository
git clone https://github.com/ali39999-hue/itrip-platform.git
cd itrip-platform

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Open [http://localhost:3000/fa](http://localhost:3000/fa) in your browser.

---

## 🧪 Testing & Quality Assurance

The codebase is fortified with a **Playwright End-to-End Test Suite (26 Suites)**:

```bash
# Run full E2E test suite
npx playwright test

# Run targeted visual tests
npx playwright test tests/search-widget-visual.spec.ts

# Run tests in UI mode
npx playwright test --ui
```

---

## 📦 Project Structure

```text
itrip-platform/
├── messages/               # 5-language translation JSONs (fa, en, ar, zh, ru)
├── public/                 # Icons, PWA manifest, offline.html, sw.js
├── src/
│   ├── app/                # Next.js 16 App Router ([locale] pages & layouts)
│   ├── components/
│   │   ├── flights/        # Flight cards & timelines
│   │   ├── home/           # Homepage hero & modular sections
│   │   ├── hotels/         # Hotel card, search filters, Leaflet map pane
│   │   ├── search/         # 12-col Search engine & custom hooks
│   │   ├── shared/         # Header, Footer, SosInterpreter, CrossSell
│   │   └── ui/             # Firuzo UI primitives (Card, Badge, Dialog, etc.)
│   ├── i18n/               # next-intl routing & configuration
│   ├── lib/                # Countries, data, formatters, jalali utils
│   └── stores/             # Zustand stores (booking, country, auth)
└── tests/                  # 26 Playwright E2E test suites
```

---

## 📄 License & Team

Developed for the **iTrip / Firuzo Platform** v2.0 Release.
