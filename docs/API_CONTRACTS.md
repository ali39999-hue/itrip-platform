# FIRUZO CHILD — REST API CONTRACT SPECIFICATION (v1)

**Prefix:** `/api/v1/business`  
**Authority:** Section 7 of Master Roadmap  
**Protocol:** HTTPS / JSON REST  
**Status:** Canonical Interface Contract  

---

## 1. Global Request & Response Standards

### 1.1 Headers
- `Content-Type: application/json`
- `Accept: application/json`
- `Idempotency-Key: <UUID>` (Required on payment and submission mutations)
- `Authorization: Bearer <JWT>` or Session Cookie (for authenticated endpoints)
- `X-Business-Signature: <HMAC-SHA256>` (Required on `POST /payments/callback`; binds the payment id, timing-safe verified — unsigned callbacks are rejected with `403 invalid_signature`)

### 1.1.1 Authorization Matrix
| Endpoint group | Authorization |
|:---|:---|
| `GET /packages`, `GET /packages/[slug]`, `GET /vouchers/verify/[code]` | Public |
| `POST /requests` | Guest-allowed (Phase 1); authenticated callers get `createdById` ownership binding |
| `GET/PATCH /requests/[id]`, `POST /requests/[id]/documents`, `GET /requests/[id]/voucher` | Object-level (T0804): owner session or `business:request:review` staff; guest-created requests (null owner) remain id-addressable — 403 otherwise |
| `POST /requests/[id]/submit` | Guest-allowed (Phase 1), ownership binding applies on next read |
| `POST /requests/[id]/review` | Permission `business:request:review` (SUPER_ADMIN, OPERATOR) — 401 anonymous, 403 missing permission |
| `POST /requests/[id]/grant` | Permission `business:request:grant` (SUPER_ADMIN, FINANCE) — 401 anonymous, 403 missing permission |
| `POST /payments/callback` | HMAC signature (PSP server-to-server); idempotent for settled payments |

### 1.2 Error Schema
All error responses adhere to the standard envelope:
```json
{
  "success": false,
  "error": {
    "code": "CAPACITY_FULL",
    "message": "ظرفیت تاریخ حرکت انتخاب‌شده تکمیل است.",
    "details": {
      "departureId": "cm123456",
      "available": 0,
      "requested": 2
    }
  }
}
```

Standard Error Codes:
- `400 BAD_REQUEST`: Validation failure, invalid JSON body.
- `401 UNAUTHORIZED`: Authentication required.
- `403 FORBIDDEN`: Action not permitted for actor role/tenant.
- `404 NOT_FOUND`: Resource (package, request, departure) does not exist.
- `409 INVALID_TRANSITION`: State machine transition illegal.
- `409 IDEMPOTENCY_CONFLICT`: Concurrent execution with identical key.
- `422 UNPROCESSABLE_ENTITY`: Document validation or business rule rejection.
- `500 INTERNAL_ERROR`: System error; safe fallback returned to client.

---

## 2. Catalog & Discovery Endpoints

### 2.1 `GET /api/v1/business/packages`
List active packages with nearest departure date.
- **Query Parameters:**
  - `goal` (optional, string): e.g., `'B2B_MEETINGS'`, `'FACTORY_VISIT'`, `'EXHIBITION'`
  - `destination` (optional, string): City or country filter
- **Response `200 OK`:**
```json
[
  {
    "id": "cm101pkg",
    "slug": "china-canton-fair-tech-2026",
    "title": "تور تخصصی نمایشگاه کانتون فیر گوانگجو ۲۰۲۶",
    "titleEn": "Canton Fair Tech & Hardware Delegation",
    "destination": "گوانگجو، چین",
    "durationDays": 7,
    "basePriceRial": 450000000,
    "nearestDepartureDate": "2026-11-15T08:00:00.000Z",
    "imageUrl": "/images/canton-fair.jpg"
  }
]
```

### 2.2 `GET /api/v1/business/packages/:slug`
Retrieve complete package detail with all upcoming departures and optional add-ons.
- **Path Parameter:** `slug` (string)
- **Response `200 OK`:**
```json
{
  "id": "cm101pkg",
  "slug": "china-canton-fair-tech-2026",
  "title": "تور تخصصی نمایشگاه کانتون فیر گوانگجو ۲۰۲۶",
  "destination": "گوانگجو، چین",
  "durationDays": 7,
  "basePriceRial": 450000000,
  "summary": "برنامه‌ای جامع برای فعالان فناوری، بازدید تخصصی و جلسات B2B.",
  "itinerary": [
    "روز ۱: پرواز به گوانگجو، ترانسفر فرودگاهی و استقرار در هتل ۵ ستاره.",
    "روز ۲: بازدید فاز اول نمایشگاه با حضور مترجم فنی همزمان.",
    "روز ۳: جلسات B2B از پیش هماهنگ‌شده با تولیدکنندگان برتر قطعات."
  ],
  "includes": ["بلیط رفت و برگشت", "اقامت هتل ۵ ستاره", "مترجم تخصصی", "بیمه مسافرتی"],
  "requiredDocs": ["گذرنامه با حداقل ۶ ماه اعتبار", "معرفی‌نامه شرکتی"],
  "departures": [
    {
      "id": "cm201dep",
      "departDate": "2026-11-15T08:00:00.000Z",
      "returnDate": "2026-11-22T18:00:00.000Z",
      "capacity": 20,
      "bookedCount": 12
    }
  ],
  "addons": [
    {
      "id": "cm301add",
      "code": "PRIVATE_TRANSLATOR",
      "title": "مترجم اختصاصی تمام‌وقت",
      "priceRial": 85000000,
      "unit": "per_group"
    }
  ]
}
```

---

## 3. Request Lifecycle Endpoints

### 3.1 `POST /api/v1/business/requests`
Create draft request, claim 48h soft hold on departure capacity, and compute initial quote.
- **Request Body:**
```json
{
  "packageId": "cm101pkg",
  "departureId": "cm201dep",
  "paxCount": 2,
  "addonIds": ["cm301add"],
  "companyName": "نوآوران داده‌ورزی فردا",
  "nationalId": "14009988776",
  "repName": "مهندس سهراب سپهری",
  "repPhone": "09121112233",
  "field": "Artificial Intelligence"
}
```
- **Response `201 Created`:**
```json
{
  "id": "cm401req",
  "code": "FZB-2026-0042",
  "status": "draft",
  "totalAmount": 985000000,
  "depositAmount": 295500000,
  "expiresAt": "2026-10-04T18:00:00.000Z"
}
```

### 3.2 `POST /api/v1/business/requests/:id/submit`
Lock pricing quote, record travelers roster, accept terms, and transition to `submitted`.
- **Headers:** `Idempotency-Key: sub_...`
- **Request Body:**
```json
{
  "termsAccepted": true,
  "travelers": [
    {
      "fullNameLatin": "Ali Rezaei",
      "passportNo": "A12345678",
      "passportExpiry": "2029-11-20",
      "birthDate": "1988-04-12"
    },
    {
      "fullNameLatin": "Maryam Tehrani",
      "passportNo": "B87654321",
      "passportExpiry": "2028-06-15",
      "birthDate": "1992-09-24"
    }
  ]
}
```
- **Response `200 OK`:** Returns updated request object with status `'submitted'`.

---

## 4. Payment & PSP Webhook Endpoints

### 4.1 `POST /api/v1/business/requests/:id/payments`
Initialize deposit or final settlement payment intent.
- **Headers:** `Idempotency-Key: pay_...`
- **Request Body:**
```json
{
  "kind": "deposit",
  "method": "shetab_gateway"
}
```
- **Response `201 Created`:**
```json
{
  "paymentId": "cm501pay",
  "amountRial": 295500000,
  "gatewayUrl": "https://gateway.firuzo.com/pay/cm501pay",
  "expiresAt": "2026-10-02T18:30:00.000Z"
}
```

### 4.2 `POST /api/v1/business/payments/callback`
Authoritative PSP callback handler. Enforces HMAC verification and transitions state.
- **Headers:** `X-Shetab-Signature: <HMAC-SHA256>`
- **Request Body:**
```json
{
  "paymentId": "cm501pay",
  "status": "SUCCESS",
  "gatewayRef": "SHP-9988221144",
  "timestamp": 1790964100
}
```
- **Response `200 OK`:**
```json
{
  "verified": true,
  "requestId": "cm401req",
  "currentStatus": "deposit_paid",
  "paidAmount": 295500000
}
```

---

## 5. Voucher Verification Endpoints

### 5.1 `GET /api/v1/business/vouchers/verify/:code`
Public verification endpoint for airlines, hotels, and event organizers.
- **Response `200 OK`:**
```json
{
  "valid": true,
  "voucherCode": "FZB-VCH-2026-0042",
  "tourTitle": "تور تخصصی نمایشگاه کانتون فیر گوانگجو ۲۰۲۶",
  "departureDate": "2026-11-15",
  "companyName": "نوآوران داده‌ورزی فردا",
  "paxCount": 2,
  "issuedAt": "2026-10-02T18:15:00.000Z"
}
```
