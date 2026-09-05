# iTRIP / FIRUZO — BOOKING LIFECYCLE & STATE MACHINE SPECIFICATION
**Domain:** Booking Aggregates, State Machines & Relational Audit History  
**Version:** 3.0 (Production Hardened)  

---

## 1. Multi-Dimensional Decoupled State Machines (BOOK-002, BOOK-003)

Rather than overloading all lifecycle stages into a single ambiguous column, iTRIP separates lifecycle tracking into four distinct dimensions:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BOOKING AGGREGATE LIFECYCLE                        │
│                                                                             │
│  1. BookingStatus:                                                          │
│     DRAFT ──► HELD ──► PENDING_PAYMENT ──► CONFIRMING ──► CONFIRMED         │
│       │        │             │                               │              │
│       │        ▼             ▼                               ▼              │
│       └───► EXPIRED       EXPIRED                     CANCEL_REQUESTED      │
│                                                              │              │
│                                                              ▼              │
│                                                          CANCELLING         │
│                                                              │              │
│                                                              ▼              │
│                                                          CANCELLED          │
│                                                              │              │
│                                                              ▼              │
│                                                           REFUNDED          │
│                                                                             │
│  2. PaymentStatus:                                                          │
│     INITIATED ──► PENDING_CUSTOMER ──► AUTHORIZED ──► CAPTURED              │
│          │                                                │                 │
│          ▼                                                ▼                 │
│        FAILED                                          REFUNDED             │
│                                                                             │
│  3. FulfillmentStatus:                                                      │
│     PENDING ──► IN_PROGRESS ──► CONFIRMED (or FAILED)                       │
│                                                                             │
│  4. TicketStatus:                                                           │
│     NOT_ISSUED ──► ISSUING ──► ISSUED ──► REFUND_PENDING ──► REFUNDED      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Valid Transition Table

```typescript
export const VALID_BOOKING_TRANSITIONS = [
  { from: ['DRAFT'], to: 'HELD' },
  { from: ['DRAFT', 'HELD'], to: 'PENDING_PAYMENT' },
  { from: ['HELD', 'PENDING_PAYMENT'], to: 'EXPIRED' },
  { from: ['HELD', 'PENDING_PAYMENT', 'DRAFT'], to: 'PAYMENT_CONFIRMED' },
  { from: ['PAYMENT_CONFIRMED'], to: 'CONFIRMING_SUPPLIER' },
  { from: ['PAYMENT_CONFIRMED', 'CONFIRMING_SUPPLIER'], to: 'CONFIRMED' },
  { from: ['CONFIRMED'], to: 'CANCEL_REQUESTED' },
  { from: ['CANCEL_REQUESTED'], to: 'CANCELLING' },
  { from: ['CANCELLING'], to: 'CANCELLED' },
  { from: ['CANCELLED'], to: 'REFUND_INITIATED' },
  { from: ['REFUND_INITIATED'], to: 'REFUNDED' },
];
```

Any attempt to skip states (e.g. `DRAFT -> CONFIRMED` or `CONFIRMED -> DRAFT`) throws:
`Invalid state transition: Cannot transition booking from DRAFT to CONFIRMED`.

---

## 3. Relational Booking Status History (BOOK-004)

Status transitions are no longer stored solely in JSON strings. The database provides the relational `BookingStatusHistory` table:

```prisma
model BookingStatusHistory {
  id            String   @id @default(cuid())
  bookingId     String
  fromStatus    String
  toStatus      String
  actor         String   @default("SYSTEM") // User ID or Worker / Gateway
  reason        String?
  correlationId String?
  createdAt     DateTime @default(now())

  booking       Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  @@index([bookingId])
  @@index([createdAt])
}
```

This enables SQL querying of booking operational lifecycles, auditing transition durations, and building SLA metrics for operator dashboards.

---

## 4. Booking + Hold Atomicity (BOOK-005)

When a customer initiates checkout:
1. `InventoryEngine.createHold` acquires a soft lock on the allotment row with a 15-minute TTL.
2. In `createBookingDraft`:
   ```typescript
   try {
     booking = await prisma.booking.create({ ... });
   } catch (err) {
     if (holdToken) {
       await InventoryEngine.releaseHold(holdToken);
     }
     throw err;
   }
   ```
3. If booking persistence fails for any reason (DB connection drop, foreign key violation, payload error), compensation triggers immediately to release the hold, eliminating orphan inventory allotments.
