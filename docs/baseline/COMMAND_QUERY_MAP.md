# BASE-005 — Application Command/Query Map

Generated 2026-09-06 against baseline `0fc1a105`. C = command (mutation), Q = query.
"Scoped" = tenant/org boundary explicitly enforced beyond authentication.

## Server actions — `src/actions/booking.ts`
| Action | Type | Auth | Scoped | Logic placement |
|---|---|---|---|---|
| `createBookingDraft` | C | safeAuth | stamps org/branch from context | **Mostly inline** (pricing resolution, add-ons, hold + compensation, PII persistence) — only holds delegate to InventoryEngine. Largest logic concentration in the app |
| `payBooking` | C | safeAuth | assertTenantAccess | Delegates → BookingSagaOrchestrator (good shape) |
| `getMyBookings` / `getBookingById` | Q | safeAuth | customerId / assertTenantAccess | inline prisma; `getBookingById` decrypts/masks PII inline |
| `requestWalletTopUp` | C | safeAuth | owner-only | Delegates to PaymentDomainService + gateway; DEMO branch inline (double-gated env+NODE_ENV) |
| `exchangeWalletCurrency` | C | safeAuth | owner-only | balance check via raw ledger aggregates (duplicates GLS logic); posting delegates to GLS |
| `getWallet` | Q | safeAuth | owner-only | DEMO seed top-ups inline; balance aggregation duplicates GLS |

## Server actions — `src/actions/admin.ts`
| Action | Type | Auth | Scoped | Logic placement |
|---|---|---|---|---|
| `runLedgerReconciliation` | Q | requirePermission(finance) | n/a | delegates → ReconciliationService |
| `getAdminFinanceStats` | Q | requirePermission(finance) | **platform-wide by design** | inline aggregations |
| `getAdminBookings` | Q | requirePermission(booking:view:all) | tenant-scoped Prisma ext | thin inline query |
| `refundBookingAdmin` | C | requirePermission(booking:refund:approve) | **no assertTenantAccess** | **Inline full refund workflow** — bypasses RefundDomainService, no Refund row |
| `getAdminSuppliers` / `createAdminSupplier` | Q/C | requirePermission(inventory:manage) | no | inline prisma |
| `getAdminInventory` / `createAdminInventoryItem` / `updateAllotment` | Q/C/C | requirePermission(inventory:manage) | no | inline; **updateAllotment + hold release bypass InventoryEngine** |

## Server actions — `src/actions/auth.ts`
| Action | Type | Auth | Notes |
|---|---|---|---|
| `loginWithCredentials` / `logoutUser` | C | NextAuth itself | delegated |
| `requestOtp` | C | pre-auth + rate limit | **IP limit layer not wired (no IP passed)** |
| `verifyOtpAndLogin` | C | OTP server-side check | inline user lookup + role mapping |
| `updateProfileDetails` | C | safeAuth | owner-only whitelist + AES-GCM PII encryption |
| `getMyKyc` / `getSessionUser` | Q | safeAuth | owner-only |

## API routes
| Route | Type | Auth | Notes |
|---|---|---|---|
| `POST /api/payments/webhook` | C | HMAC signature + replay window + IP rate limit | signature fail-open when secret unset (P0 gap #1); HMAC over re-serialized JSON (P0 gap #5) |
| `GET /api/admin/search` | Q | requirePermission | **no tenant scoping** across 5 inline queries |
| `GET /api/flights/search`, `/api/hotels/search`, `/api/hotels/[id]` | Q | public catalog | static catalog-backed |
| `GET /api/health/live`, `/api/health/ready` | Q | public | ready does DB+outbox+gateway checks **+ full ledger scan per probe** |
| `ANY /api/auth/[...nextauth]` | both | NextAuth | — |

## Business logic misplaced in UI/route layers (top offenders)
1. `admin/page.tsx:37-58` — 11 direct prisma queries across 7 models computing KPIs in the page.
2. `api/admin/search/route.ts:18-70` — 5 inline cross-domain queries, unscoped.
3. `admin/ops/page.tsx:12-16`, `admin/travel-files/[id]/page.tsx:24`, `admin/travel-files/page.tsx:15`, `admin/exceptions/page.tsx:15` — queries defined inside pages.
4. `actions/admin.ts:146-232` — domain workflow (state walk + ledger + holds + audit) inline in the action.
5. `lib/security/crypto-vault.ts:94` — utility writes AuditLog directly.
6. `api/health/ready/route.ts:57` — heavy reconciliation on every probe.

Target architecture rule (BASE-005/BOOK-010): **actions authenticate + validate + dispatch only**; pages read
via query services; all Booking/Inventory/Refund mutations go through their domain services.
