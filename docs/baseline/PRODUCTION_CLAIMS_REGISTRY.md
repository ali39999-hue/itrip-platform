# Production Claims & Trust Registry (TRUTH-003 / TRUTH-004)

**Last Audit Date:** 2026-09-08  
**Auditor:** Firuzo Production Hardening Team  
**Runtime Baseline:** Commit `4196538` / v1.5.0  

This registry tracks every public trust, marketing, and capability claim presented across the Firuzo platform UI, marketing sections, metadata, and communications.

## Permitted Capability States

- `LIVE`: Backed by real production infrastructure, live credentials, and live external APIs.
- `BETA`: Functional in production with defined operational boundaries.
- `SIMULATED`: Code complete with internal state machine, deterministic calculation, or sandbox simulation.
- `MOCK`: Uses seeded or mock data catalogs; external supplier credentials not yet connected.
- `COMING_SOON`: Feature under active development or scheduled for release; user informed before action.
- `DISABLED`: Not active or intentionally suppressed in current release.

---

## 1. Marketing & Public Trust Claims Audit

| Claim ID | Claim Text / Feature | Location | Claimed Status | Actual Runtime Reality | Verdict / Action Taken | Owner |
|---|---|---|---|---|---|---|
| CLAIM-001 | "ارزان‌ترین نرخ تضمینی / Lowest Rate Guaranteed" | Hero / Search UI | LIVE | Algorithmic pricing without live cross-agency scraper | **REMOVED** (Replaced with "Authoritative transparent pricing") | Product |
| CLAIM-002 | "صدور آنی و قطعی بلیط / Instant Guaranteed Ticketing" | Flights / Checkout | LIVE | GDS connection uses sandbox/mock adapter | **QUALIFIED** (Qualified as "Instant Booking Hold & Verification") | Core Platform |
| CLAIM-003 | "اتصال مستقیم به کلیه ایرلاین‌های بین‌المللی" | Flights search | LIVE | Seeded flight catalog via FlightSupplierPort | **QUALIFIED** (Displays actual partner airline network) | Suppliers Team |
| CLAIM-004 | "نظرات خریداران تایید شده / Verified Buyer Reviews" | Tour / Hotel Reviews | LIVE | Reviews seeded in CMS without mandatory completed booking ID | **ENFORCED** (Verified badge requires linked Confirmed Booking) | CMS / Community |
| CLAIM-005 | "پشتیبانی اختصاصی ۲۴ ساعته تلگرام و واتساپ" | Footer / Support | LIVE | Telegram Bot and WhatsApp gateways active | **LIVE** (Verified real destination links) | Support / Ops |
| CLAIM-006 | "کیف پول چند ارزی (ریال، تتر و درهم)" | Financial section | LIVE | Internal wallet supports IRR and multi-currency ledger | **LIVE** (Ledger backed, no unsupported live FX trading) | Finance |
| CLAIM-007 | "خرید خودکار هوشمند (Auto-Buy)" | Account / Auto-buy | LIVE | Active rule engine with spend caps and kill switch | **LIVE / CONTROLLED** (Hard budget limits enforced) | Smart Travel |
| CLAIM-008 | "ظرفیت واقعی تورها / Real Tour Inventory" | Tour details | LIVE | Linked to real `TourDepartureDate.availableSeats` | **LIVE** (Inventory engine row-locked) | Inventory |

---

## 2. Supplier Reference Separation (TRUST-005 / BOOK-006)

- **Internal Booking Reference:** Formatted as `ITR-XXXXXX` or `FIR-XXXXXX`. This is an internal system identifier.
- **Supplier PNR / GDS Reference:** Generated ONLY when an external supplier returns an authoritative PNR.
- **Rule:** UI components must never display internal reference as "Supplier PNR" or "Airline Confirmation Code". If external PNR is not yet issued, status displays "در انتظار تایید تامین‌کننده (Pending Supplier Confirmation)".

---

## 3. Brand Naming Dictionary (BRAND-001 / BRAND-002)

- Canonical Persian Brand Name: **فیروزو**
- Canonical English Brand Name: **Firuzo**
- Forbidden Brand Variations: **فیروزه** (except for historical external place/hotel names such as *هتل پارسیان فیروزه*), **فیروز**.
