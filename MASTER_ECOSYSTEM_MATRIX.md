# iTrip / Firuzo Platform — Master Architecture & Ecosystem Matrix (113 Items)
**Reference Document:** `../_docs/iTRIP_MASTER_ECOSYSTEM_MATRIX.md`  
**Standard Version:** 1.0 (September 2026)

This document formalizes the canonical technical ecosystem of the iTrip / Firuzo travel platform and ERP, unifying the 63 engineering tools, frameworks, and standards with the 50 domain benchmark open-source travel repositories.

---

## 1. Golden Architectural Rules

1. **Zero Package Collisions (No Blind Installs):**  
   Never install conflicting libraries into `package.json`.  
   - DO NOT install Mantine or daisyUI (conflicts with Tailwind v4 `@theme` and Base UI tokens).
   - DO NOT install TanStack Router (conflicts with Next.js App Router and `next-intl`).
   - DO NOT install Cypress (conflicts/redundant with Playwright E2E and `@axe-core/playwright`).
   - DO NOT install WCAG or OWASP ASVS (these are audit specifications, not npm libraries).

2. **The 4-Quadrant Classification:**
   - **Quadrant 1 (Active Core Dependencies):** Next.js 16, React 19, Tailwind CSS v4, Base UI / shadcn, Lucide React, Zustand v5, Zod v4, React Hook Form v7, TanStack Query v5, TanStack Table v8, Prisma 5.22, Vitest v4, Playwright, axe-core.
   - **Quadrant 2 (Design & Component Anatomy References):** Mantine, daisyUI, Primer React, Designers Italia. Used for component specs and UX inspiration.
   - **Quadrant 3 (Standards & Verification Frameworks):** W3C WCAG 2.1 AA, OWASP ASVS 5.0, OWASP Top 10, Web Vitals.
   - **Quadrant 4 (CI Scanners & DevOps):** Gitleaks, Semgrep rules in `scripts/security-scan.mjs`, Trivy, Snyk, Lighthouse CI.

3. **50 Benchmark Travel Repositories Mapping:**
   - **Booking & Inventory Holds:** `Lulan` + `OTAIP` -> `InventoryEngine.ts` (PostgreSQL atomic row-locking & holds).
   - **Trip Planner & Multi-currency:** `TREK` + `Cairn` + `TrekForge` -> `/plan`, `/my-trips`, `TourItinerary.tsx`.
   - **General Ledger & Refunds:** `ShopVerse` + `Spree Commerce` -> `GeneralLedgerService.ts` (`SUM(DEBIT) === SUM(CREDIT)` Decimal balance invariant).
   - **Multi-Tenant Travel CRM & Manifest:** `SYN Travel Agency` + `ToursAndTravelsManagement` + `TravelCRM` -> `Organization`, `OrganizationBranch`, `CommissionService.ts`.
   - **AI & Supplier Normalization:** `Hermes Travel CLI` + `Travel AI` + `Mirai` -> `supplier-orchestration.ts`, `auto-buy-worker.ts`.

---

For the complete 113-item detailed matrix with URLs, categories, priorities, and code placement, see:  
`_docs/iTRIP_MASTER_ECOSYSTEM_MATRIX.md`
