# iTrip / Firuzo Platform Release Notes — v1.5.0

**Release Tag:** `v1.5.0`  
**Release Date:** 2026-09-07  
**Target Environment:** Node.js 22+ / PostgreSQL 16 / Next.js 16.3 (Turbopack) / React 19  
**Previous Release:** `v1.4.1` (`1a255ac`)  

---

## 🚀 Key Highlights & What's New

### 1. Referral & Group Leader Incentive System
- **Comprehensive Data Model:** Introduced Prisma migration `20260907180000_add_referral_group_leader_system` establishing schema definitions for `ReferralCampaign`, `ReferralTier`, `ReferralCode`, `ReferralUsage`, `ReferralReward`, `GroupLeaderProfile`, `GroupLeaderBatch`, `GroupLeaderPayment`, `GroupBookingIncentive`, and `CommissionPayout`.
- **Domain Services & Commission Calculator:** Built `ReferralDomainService` and `GroupLeaderService` providing tier-based discount computation, multi-tier commission structures, usage limits, fraud prevention, and settlement batches.
- **Admin Management Console:** Implemented full-featured administrative portal at `/admin/referrals` allowing operators to monitor campaign performance, manage tiers, verify group leaders, and execute commission disbursements.
- **Checkout Integration:** Introduced `ReferralInputSection` on the checkout page supporting real-time coupon verification, tiered discounts, and synchronized price breakdown calculations.

### 2. Multi-Channel Notification Gateways
- **Production Telegram Gateway:** Built `ProductionTelegramProvider` enabling instant dispatch of booking vouchers, ticket PDFs, payment receipts, and operational alerts via the Telegram Bot API.
- **Production WhatsApp Gateway:** Built `ProductionWhatsappProvider` enabling transactional messaging with template support and localized delivery confirmations.
- **Outbox Pattern Integration:** Seamlessly integrated both providers with `OutboxConsumer` ensuring at-least-once delivery and failure-recovery semantics.

### 3. Authentication & Social Identity Enhancements
- **Telegram WebApp & Social Login:** Added native Telegram WebApp authentication and callback handlers (`/api/auth/telegram/callback`, `/api/auth/callback/wechat`).
- **NextAuth Adapters:** Extended NextAuth configuration with Telegram credentials verification, role/permission propagation, and session synchronization.

### 4. UI/UX & Media Pipeline Modernization
- **Hotel Experience:** Enhanced `HotelHero` component with responsive image galleries, amenity badges, and high-performance layout rendering.
- **Image Resilience:** Upgraded `image-utils.ts` with responsive fallbacks, domain whitelisting, and blur hash placeholders.
- **SSR Optimization:** Configured dynamic rendering and route aliasing for hotel and tour detail views.

---

## 🧪 Quality Assurance & Gates Passed

| Gate | Status | Command / Details |
|---|---|---|
| **Unit & Invariant Tests** | ✓ PASS | 315 passed across 48 test suites (`npm run test:unit`) |
| **Strict TypeScript Compilation** | ✓ PASS | 0 errors (`npm run typecheck`) |
| **ESLint Architecture Guardrails** | ✓ PASS | 0 errors (`npm run lint`) |
| **I18N Completeness (5 Locales)** | ✓ PASS | 844 keys with 100% parity (`npm run gate:i18n`) |
| **Security Vulnerability Scan** | ✓ PASS | 0 critical / high vulnerabilities (`npm run security:scan`) |
| **Next.js Production Build** | ✓ PASS | Successful production build with Turbopack (`npm run build`) |
