# iTRIP / FIRUZO — ERP OPERATIONS & TRAVEL FILE WORKSPACE
**Domain:** Travel File Dossier, Exception Center, Operational Queues & Reconciliation  
**Version:** 3.0 (Production Hardened)  

---

## 1. Unified Travel File Dossier (ERP-001, Section 30)

The **Travel File** (`/admin/travel-files/[id]`) is the operational command center for travel coordinators, support staff, and back-office agents. Instead of navigating across disconnected screens, operators view the complete trip dossier on a single page:

1. **Customer & Dossier Header:**
   - Trip reference (e.g. `TRP-10021`), customer name, email, phone, and national ID.
2. **Traveler Profiles & Travel Documents:**
   - Full passenger names (Fa/En), passport numbers, expiration dates, visa statuses.
3. **Multi-Product Booking Items:**
   - Flights: Airline, flight number, route, departure/arrival timestamps, seat class, baggage allowance, PNR, e-ticket numbers.
   - Hotels: Property name, room type, check-in/out dates, meal plan, voucher reference.
   - Ancillaries: Transfers, eSIM packages, insurance policies.
4. **Financial Summary:**
   - Gross booking amount, supplier net cost, markup, VAT, fees, payment status (`CAPTURED`), invoice ID.
5. **Chronological Operational Timeline:**
   - Audit trail of all state transitions, refund requests, voucher issuances, and notifications.

---

## 2. Operational Exception Center (OPS-001, Section 29)

Located at `/admin/exceptions`, the Exception Center surfaces real-time discrepancies requiring human intervention:

| Exception Type | Severity | Detection Trigger | Resolution Action |
|---|---|---|---|
| `PRICE_MISMATCH` | HIGH | Server pricing engine differs from supplier quotation | Re-quote offer or apply commercial adjustment |
| `PAYMENT_MISMATCH` | HIGH | Recorded payment amount != booking total | Escalate to finance or investigate PSP callback |
| `SUPPLIER_STATEMENT_MISMATCH` | HIGH | Supplier billing statement != accrued liability batch | Generate credit memo or dispute invoice line |
| `SUPPLIER_TIMEOUT` | CRITICAL | GDS/Bedbank booking API timed out | Manual confirmation or trigger compensation |
| `TICKET_NOT_ISSUED` | HIGH | Booking confirmed but PNR/ticket not returned | Queue for manual GDS robot reissue |
| `REFUND_TIMEOUT` | MEDIUM | Customer refund pending PSP settlement >24h | Manual bank transfer or retry batch |

---

## 3. Global Multi-Tenant Search (Section 31)

Located at `/api/admin/search` and wired to the UI header shortcut (Ctrl+K):
- **Searchable Keys:**
  - Booking Reference (`ITR-...`)
  - External PNR (`FZ-...`)
  - Trip Reference (`TRP-...`)
  - Customer Name, Email, Phone
  - Refund Number (`RFD-...`)
  - Invoice Number (`INV-...`)
- **Tenant Isolation:**
  - Results are filtered through the user's `TenantAuthContext`. Agents from Agency A never see Agency B records.
