# FIRUZO CHILD — DATA OWNERSHIP MATRIX & PERSISTENCE POLICIES

**Authority:** Section 6 & Principle P01 of Child Master Roadmap  
**Status:** Canonical Data Ownership Contract  

---

## 1. Single Master Invariant (P01)

Every data entity in the ecosystem has exactly **one** authoritative master owner.
- The Child owns its specialist catalog, enterprise requests, company profiles, qualification records, traveler rosters, and voucher credentials.
- Firuzo Core owns global user authentication, the double-entry general ledger, payment execution rails, and organizational hierarchy.
- Projections and references are strictly unidirectional and read-only. Dual-master state writes are banned.

---

## 2. Comprehensive Data Ownership Matrix

| Data Domain | Authoritative Master | Child Access Level | Integration Mode | Storage Location | Invariant & Retention Policy |
|:---|:---:|:---:|:---:|:---:|:---|
| **Global User Identity** | Firuzo Core | Read-Only Projection | In-process API / JWT | `users` table | Immutable core ID (`cuid`); Child never alters user credentials. |
| **Authentication Session** | Firuzo Core | Consume | Cookie / NextAuth | Session Cookie | Encrypted, HTTP-only, 30-day rolling expiration. |
| **Enterprise Company Profile** | Child | Full Ownership | Direct Read/Write | `business_companies` | 11-digit unique `nationalId`. Optional link to Core `organizationId`. |
| **Specialist Tour Catalog** | Child | Full Ownership | Direct Read/Write | `business_tour_packages` | Versioned package configurations, integer Rial base pricing. |
| **Departures & Allotments** | Child | Full Ownership | Direct Read/Write | `business_departures` | Date-constrained inventory; `bookedCount <= capacity`. |
| **Specialist Addons** | Child | Full Ownership | Direct Read/Write | `business_addons` | Unit-based price multipliers (`per_person` / `per_group`). |
| **Specialist Requests** | Child | Full Ownership | Direct Read/Write | `business_requests` | Unique human-readable code `FZB-YYYY-XXXX`. 6-stage lifecycle. |
| **Traveler Rosters & PII** | Child | Full Ownership | Direct Read/Write | `business_travelers` | Validated Latin names; passport expiry >= 6 months from travel. |
| **Qualification Documents** | Child | Full Ownership | Direct Read/Write | `business_documents` | File binaries stored in Core Media Vault; signed URLs only. |
| **Payment Execution Record** | Firuzo Core (PSP Rails) | Reference | PSP Callback / Webhook | `business_payments` | Authoritative verification via Shetab HMAC. Unique idempotency key. |
| **Financial General Ledger** | Firuzo Core | Write via Contract | `FiruzoCoreClient` | `ledger_accounts` | Double-entry balance: `SUM(DEBIT) === SUM(CREDIT)`. |
| **Specialist Digital Voucher** | Child | Full Ownership | Direct Read/Write | `business_vouchers` | Cryptographic HMAC QR payload; public verify endpoint. |
| **Audit Stream** | Child | Full Ownership | Direct Append-Only | `business_status_events` | Append-only. Mutations and deletions prohibited. |
| **Telemetry & Metrics** | Child / Core Pipeline | Write / Read | Structured Event Log | In-memory + Logger | Redacted PII, structured JSON with latency and error tags. |

---

## 3. Database Isolation Evolution

1. **Current Co-located Modular Schema (Phase 1):**
   - Tables share the PostgreSQL 16 database under the `business_*` prefix (`business_companies`, `business_tour_packages`, `business_departures`, etc.).
   - Schema separation is strictly enforced at application boundaries via `FiruzoCoreClient`.
2. **Target Autonomous Schema (Phase 2):**
   - Direct database migration to a dedicated Child schema/database (`firuzo_child`).
   - Foreign key dependencies to Core tables (`organizationId`, `assigneeId`) are already decoupled as plain string fields without database-level foreign key constraints.
