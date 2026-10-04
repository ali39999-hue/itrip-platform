# FIRUZO CHILD — ERP OPERATIONS MODEL

**Authority:** Section 19 of Master Roadmap  
**Status:** Canonical Operational Contract  
**Principle:** ERP exposes **domain operations**, not raw database tables.

---

## 1. Operational Domains & Commands

### 1.1 Catalog Operations
| Operation | Command | Authorization |
|:---|:---|:---|
| Create/Update Package | `catalog.package.upsert` | Catalog Manager |
| Publish/Unpublish Package | `catalog.package.publish` | Catalog Manager |
| Create Departure | `catalog.departure.create` | Catalog Manager |
| Adjust Capacity | `catalog.departure.adjustCapacity` | Booking Operator |
| Manage Add-ons | `catalog.addon.upsert` | Catalog Manager |

### 1.2 Booking Operations
| Operation | Command | Authorization |
|:---|:---|:---|
| Review Request | `booking.request.review` | Booking Operator |
| Approve & Advance | `booking.request.approve` | Booking Operator |
| Request Changes | `booking.request.requestChanges` | Booking Operator |
| Apply Grant/Subsidy | `booking.request.grant` | Finance Operator |
| Cancel Request | `booking.request.cancel` | Booking Operator |
| Revoke Voucher | `booking.voucher.revoke` | Booking Operator |
| Handle Exception | `booking.exception.raise` | Booking Operator |

### 1.3 Customer Operations (CRM)
- **Customer 360:** company profile, request history, qualification history, documents, interactions — assembled from Child tables + identity projection.
- **Lead Pipeline:** custom trip requests enter as `Lead` with `Assignment` and `SLAState`.
- **Tags & Follow-ups:** `CustomerTag`, `FollowUpTask` with due dates and assignees.

### 1.4 Content Operations
- Pages, articles, collections, translations, SEO fields managed through the CMS model (`docs/CMS_MODEL.md`) with revision history.

### 1.5 Finance References
- Child reads (never writes) ledger postings, invoice references, refund states via `FiruzoCoreClient`.
- Grant amounts applied at Child level; revenue realization posted via Core contract.

### 1.6 Operational Control
- **Staff assignment:** `assigneeId` on `BusinessRequest` (string ref to Core `User.id`, no FK).
- **Task queue & SLA:** pending `under_review` requests older than SLA threshold flagged in exception queue.
- **Audit trail:** `BusinessStatusEvent` append-only log with actor attribution.

---

## 2. Role Model & Permission Policies

Minimum roles: Super Admin, Product Admin, Catalog Manager, Booking Operator, CRM Agent, Content Editor, SEO Editor, Finance Operator, Support Agent, Auditor, Read Only.

Permissions are enforced with policy functions, never scattered role checks:

```ts
can(user, "booking.request.review", request)
can(user, "catalog.package.publish", pkg)
can(user, "customer.view_sensitive_data", customer)
```

---

## 3. ERP UI Surfaces (Phase 10 Target)

- Admin home with exception queue counters
- Catalog & departures management
- Requests list with filters (status, departure, company)
- Request detail: traveler roster, documents, status timeline, review actions
- Customers 360 view
- Audit log viewer
