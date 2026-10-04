# FIRUZO CHILD — USER JOURNEYS & MOBILE-FIRST UX SPECIFICATION

**Authority:** Sections 1, 13, 28 of Child Master Roadmap & `AGENTS.md`  
**Status:** Canonical UX & Ergonomics Contract  

---

## 1. Mobile-First Travel Super App Ergonomics

### 1.1 Thumb-Zone Driving Anchor
- **Rule:** Conversion CTAs ("ثبت درخواست و ادامه", "پرداخت پیش‌پرداخت", "تسویه نهایی", "مشاهده ووچر") **MUST** be anchored in the natural thumb zone on screens `< 768px`.
- **Implementation:**
  ```css
  .fz-action-bar--sticky {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(12px);
    padding: 1rem;
    padding-bottom: max(1rem, env(safe-area-inset-bottom));
    border-top: 1px solid var(--fz-border);
    z-index: 40;
  }
  ```

### 1.2 Touch Targets & Interactive Spacing
- **Minimum Interactive Size:** 44×44px (iOS HIG) / 48×48px (Material 3).
- **Rule:** Every icon button (back, calendar trigger, quantity stepper, upload box, option chip) must have a touch target of at least 44×44px.
- **Minimum Gap:** 8px between adjacent interactive elements to eliminate mis-taps.

### 1.3 Bottom Sheets over Desktop Modals
- On viewport widths `< 768px`, all selection dialogs (Departure picker, Addon selector, Passport upload, Document preview) **MUST** render as Bottom Sheets with a drag handle pill (`w-10 h-1 rounded-full bg-border mx-auto mb-3`) and swipe-to-dismiss gesture.

---

## 2. Core Business User Journeys

### Journey A — Discovery to Issued Voucher (7-Step Master Flow)

```text
[1. Vertical Landing]  /fa/business
   │  Hero proposition + GoalWheel (Exhibition / B2B / Factory)
   ▼
[2. Tour Package]      /fa/business/tours/[slug]
   │  Itinerary days + Departure date radio chips + Addon toggles + Sticky bottom bar
   ▼
[3. Request & Roster]  /fa/business/requests/new
   │  Company national ID + Representative + Traveler passport Latin fields + Terms
   ▼
[4. Deposit Payment]   /fa/business/requests/[id]/deposit
   │  Locked 30% quote + 48h expiration countdown + Shetab gateway trigger
   ▼
[5. Status Hub]        /fa/business/requests/[id]
   │  Real-time timeline (deposit_paid → under_review → approved) + Document status
   ▼
[6. Final Settlement]  /fa/business/requests/[id]/settlement
   │  Grant subsidy deduction + Remaining 70% balance payment
   ▼
[7. Digital Voucher]   /fa/business/requests/[id]/voucher
      Cryptographic HMAC QR Code + Offline presentation + Public verification link
```

### Journey B — Qualification & Document Validation
1. User provides company national ID (11 digits, validated against Iranian legal company registry format).
2. Traveler passport details entered with client-side regex check (capital Latin letters, standard passport format, expiration >= 6 months).
3. Traveler roster submitted with locked quote snapshot; capacity hold secured in Allotment.
4. Operator reviews company qualification, applies institutional grant/subsidy if eligible, and approves request.

---

## 3. Mandatory Page State Standards (Section 28)

Every Child screen implements 7 data states and 5 responsive breakpoints:

### 3.1 Data States
- **Loading State:** Skeleton cards matching layout height; no layout shift (CLS < 0.05).
- **Loaded State:** Complete data presentation with accessible semantic markup.
- **Empty State:** Clean illustrated empty card with clear recovery CTA ("مشاهده سایر برنامه‌ها").
- **Partial State:** Graceful fallback if non-critical add-ons or images fail to load.
- **Error State:** Human-readable Persian error message with safe retry button.
- **Permission Denied:** Clean 403 screen explaining required organization access.
- **Offline/Degraded:** Service Worker PWA cached voucher presentation with verified banner.

### 3.2 Responsive Breakpoints
- **Small Mobile (320px):** Single-column stacked cards, compact typography, full-width buttons.
- **Standard Mobile (390px - iPhone 14/15):** Default mobile baseline with fixed thumb-zone bar.
- **Tablet (768px):** Two-column split (summary sticky sidebar + main form).
- **Desktop (1024px–1440px):** 12-column grid layout, enhanced photo galleries, persistent breadcrumbs.
