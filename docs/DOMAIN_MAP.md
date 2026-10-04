# FIRUZO CHILD — BOUNDED CONTEXT MAP & ROUTE CATALOG

**Authority:** Section 5 & 12 of Child Master Roadmap  
**Status:** Canonical Domain Inventory (Phase 0 Baseline)  

---

## 1. Bounded Context Map

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CHILD BOUNDED CONTEXTS                          │
│                                                                        │
│  ┌─────────────────────────┐            ┌───────────────────────────┐  │
│  │   Specialist Catalog    │            │  Qualification & Request  │  │
│  │ - BusinessTourPackage   │            │ - BusinessRequest         │  │
│  │ - BusinessDeparture     │───────────▶│ - BusinessTraveler        │  │
│  │ - BusinessAddon         │            │ - BusinessDocument        │  │
│  └─────────────────────────┘            └─────────────┬─────────────┘  │
│                                                       │                │
│                                                       ▼                │
│  ┌─────────────────────────┐            ┌───────────────────────────┐  │
│  │   Trip & Experience     │◀───────────│    Commerce & Payment     │  │
│  │ - BusinessVoucher       │            │ - BusinessPayment         │  │
│  │ - BusinessStatusEvent   │            │ - Grant/Subsidy Calc      │  │
│  │ - Itinerary & Checks    │            │ - Shetab Gateway Callback │  │
│  └─────────────────────────┘            └─────────────┬─────────────┘  │
│                                                       │                │
│                                                       ▼                │
│  ┌─────────────────────────┐            ┌───────────────────────────┐  │
│  │       Company/CRM       │            │        Operations         │  │
│  │ - BusinessCompany       │            │ - Review & Approval       │  │
│  │ - Tenant Link           │            │ - Voucher Revocation      │  │
│  └─────────────────────────┘            └───────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Entities & Attributes

| Entity | Primary Table | Key Fields | Invariants & Business Rules |
|:---|:---|:---|:---|
| **Company** | `BusinessCompany` | `id, name, nationalId, repName, repPhone, field, organizationId` | `nationalId` is 11-digit unique identifier. `organizationId` optional link to Core Organization. |
| **Tour Package** | `BusinessTourPackage` | `id, slug, title, destination, durationDays, basePrice, includes, requiredDocs, status` | `slug` is unique. `basePrice` is stored in integer Rials. `status` must be `PUBLISHED` for discovery. |
| **Departure** | `BusinessDeparture` | `id, packageId, departDate, returnDate, capacity, bookedCount` | `departDate >= now()`. `bookedCount <= capacity`. Capacity is checked at draft creation and payment. |
| **Addon** | `BusinessAddon` | `id, packageId, code, title, price, unit` | `unit` is `'per_person'` or `'per_group'`. Multiplier calculated by server during quote generation. |
| **Request** | `BusinessRequest` | `id, code, companyId, departureId, paxCount, status, totalAmount, depositAmount, grantAmount, paidAmount, expiresAt` | `code` format `FZB-YYYY-XXXX`. Transition between 6 stages strictly enforced by server state machine. |
| **Traveler** | `BusinessTraveler` | `id, requestId, fullNameLatin, passportNo, passportExpiry, birthDate` | Passports must be valid for >= 6 months from departure date. Names strictly validated in Latin alphabet. |
| **Document** | `BusinessDocument` | `id, requestId, travelerId, type, fileUrl, state, rejectReason` | `state` in `('pending', 'approved', 'rejected')`. Uploads stored in media vault with signed access URLs. |
| **Payment** | `BusinessPayment` | `id, requestId, kind, method, amount, status, gatewayRef, idempotencyKey, paidAt` | Unique `idempotencyKey`. `kind` in `('deposit', 'settlement')`. Verified via Shetab HMAC callback. |
| **Voucher** | `BusinessVoucher` | `id, requestId, code, travelerId, qrPayload, pdfUrl, issuedAt, revokedAt` | Issuance only allowed when `paidAmount >= totalAmount - grantAmount`. Verified via public `/verify/:code`. |
| **Status Event** | `BusinessStatusEvent` | `id, requestId, fromStatus, toStatus, actorId, note, createdAt` | **Append-only audit trail.** Never mutated or deleted. Produces audit timeline and triggers notifications. |

---

## 3. Frontend Route Inventory (`/[locale]/business/*`)

| Path | Purpose | Page Owner | Data Source | Auth | Mobile Status | Loading/Error State |
|:---|:---|:---|:---|:---|:---|:---|
| `/business` | Landing & Vertical Discovery | Frontend / UX | `BusinessDomainService.listPackages` | Public | Optimized (Thumb CTA, GoalWheel) | Full skeleton & error boundary |
| `/business/tours/[slug]` | Tour Package Specification | Frontend / Product | `BusinessDomainService.getPackageBySlug` | Public | Bottom Action Bar (`fixed bottom-0`) | Dynamic SSR with 404 fallback |
| `/business/requests/new` | Request & Traveler Roster Form | Frontend / UX | Client Form + Zod Contracts | Company Rep | Single-column thumb layout | Field validations & error banners |
| `/business/requests/[id]` | Request Status Timeline & Hub | Frontend / Ops | `GET /api/v1/business/requests/[id]` | Company / Admin | Status Tag + Timeline view | Real-time polling & skeleton |
| `/business/requests/[id]/deposit` | Deposit Payment Screen | Frontend / Finance | `POST .../payments` + Gateway Ref | Company Rep | Sticky pay button | Countdown timer & retry state |
| `/business/requests/[id]/settlement` | Final Settlement Screen | Frontend / Finance | `POST .../payments` + Gateway Ref | Company Rep | Sticky pay button | Balance breakdown & retry state |
| `/business/requests/[id]/voucher` | Digital Voucher & QR Code | Frontend / Travel | `GET .../voucher` + Verification | Traveler / Rep | Fullscreen QR display | Print stylesheet & offline ready |

---

## 4. REST API Endpoint Inventory (`/api/v1/business/*`)

| Endpoint | Method | Purpose | Input / Validation | Response |
|:---|:---:|:---|:---|:---|
| `/packages` | `GET` | Catalog discovery | Query: `goal, destination` | `200 OK` (Package cards array) |
| `/packages/[slug]` | `GET` | Package details & departures | Param: `slug` | `200 OK` (Detail object) / `404` |
| `/requests` | `POST` | Create draft request | Zod `DraftRequestSchema` | `201 Created` (Request with 48h hold) |
| `/requests` | `GET` | List company requests | Query: `nationalId, companyId` | `200 OK` (Request array) |
| `/requests/[id]` | `GET` | Get single request details | Param: `id` | `200 OK` (Full request aggregate) |
| `/requests/[id]/submit` | `POST` | Submit request & lock quote | Zod `SubmitRequestSchema` | `200 OK` (Status: `submitted`) |
| `/requests/[id]/documents` | `POST` | Upload traveler passport/doc | Multipart form + type check | `201 Created` (Document record) |
| `/requests/[id]/review` | `POST` | Operator review decision | `action: 'approve' \| 'reject'` | `200 OK` (Transitioned status) |
| `/requests/[id]/grant` | `POST` | Apply subsidy/grant amount | `grantAmount: number` | `200 OK` (Updated balance) |
| `/requests/[id]/payments` | `POST` | Create payment intent | `kind: 'deposit' \| 'settlement'` | `201 Created` (Gateway payment URL) |
| `/payments/callback` | `POST` | Authoritative PSP webhook | Shetab HMAC verification | `200 OK` (Atomic state advance) |
| `/requests/[id]/voucher` | `GET` | Retrieve issued voucher | Param: `id` | `200 OK` (Voucher + QR payload) |
| `/vouchers/verify/[code]` | `GET` | Public voucher authenticity | Param: `code` | `200 OK` (Validity badge + details) |
