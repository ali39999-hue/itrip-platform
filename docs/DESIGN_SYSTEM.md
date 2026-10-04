# FIRUZO CHILD — DESIGN SYSTEM & VISUAL IDENTITY TOKENS

**Authority:** Sections 2, 3, 11 of Master Roadmap & `AGENTS.md`  
**Status:** Canonical Design System Contract  
**Namespace:** `--fz-*` Design Tokens & `src/components/business/*`  

---

## 1. Design Token Architecture (Layer A)

The Child platform utilizes dedicated semantic CSS tokens declared in `src/app/business.css` and `docs/reference/business-tokens.css`:

```css
:root {
  /* Brand Identity & Accents */
  --fz-brand: #0284c7;             /* Sky-600 — Professional Specialist Trust */
  --fz-brand-hover: #0369a1;       /* Sky-700 */
  --fz-brand-foreground: #ffffff;
  --fz-action: #059669;            /* Emerald-600 — Primary Conversion CTAs */
  --fz-action-hover: #047857;      /* Emerald-700 */
  --fz-action-foreground: #ffffff;

  /* Neutrals & Surfaces */
  --fz-bg: #f8fafc;                /* Slate-50 */
  --fz-surface: #ffffff;
  --fz-surface-elevated: #ffffff;
  --fz-surface-sub: #f1f5f9;       /* Slate-100 */
  --fz-border: #e2e8f0;            /* Slate-200 */
  --fz-border-active: #94a3b8;     /* Slate-400 */

  /* Text & Hierarchy */
  --fz-text-title: #0f172a;        /* Slate-900 */
  --fz-text-body: #334155;         /* Slate-700 */
  --fz-text-muted: #64748b;        /* Slate-500 */
  --fz-text-disabled: #94a3b8;

  /* Status Colors */
  --fz-status-draft: #64748b;
  --fz-status-submitted: #0284c7;
  --fz-status-deposit: #059669;
  --fz-status-review: #d97706;
  --fz-status-approved: #2563eb;
  --fz-status-issued: #059669;
  --fz-status-cancelled: #dc2626;

  /* Typography Scale */
  --fz-font-sans: 'Vazirmatn', -apple-system, BlinkMacSystemFont, sans-serif;
  --fz-line-height-relaxed: 1.75;  /* Essential for Persian dots and diacritics */

  /* Border Radii & Elevation */
  --fz-radius-sm: 8px;
  --fz-radius-md: 12px;
  --fz-radius-lg: 16px;
  --fz-radius-2xl: 20px;           /* Modern iOS/Android native card radius */
  --fz-shadow-card: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05);
}
```

---

## 2. Persian Typography & Internationalization (RTL) Standards

1. **Logical CSS Properties Mandate:**
   - **Banned:** `left-`, `right-`, `ml-`, `mr-`, `pl-`, `pr-`.
   - **Required:** `start-`, `end-`, `ms-`, `me-`, `ps-`, `pe-`.
   - Enforced by ESLint and `gate:uiux`.
2. **Directional Icon Flipping:**
   - Back/Forward navigation chevrons are mirrored in RTL using `rtl:rotate-180`.
   - Brand logos, clock icons, stars, and QR codes are **never** flipped.
3. **Persian Typography Protection:**
   - Font family: Vazirmatn with `leading-relaxed` (`line-height: 1.75`) to prevent clipping of Persian dots and diacritics on mobile screens.

---

## 3. Specialist Component Library (Layer C)

| Component | Path | Responsibility | Mobile UX Specification |
|:---|:---|:---|:---|
| **GoalWheel** | `src/components/business/GoalWheel.tsx` | Interactive specialist goal carousel | Horizontal momentum scroll with snapping (`snap-x`) |
| **RequestStepper** | `src/components/business/RequestStepper.tsx` | 5-step visual request progress bar | Compact horizontal stepper with numeric badges |
| **BizHeader** | `src/components/business/BizHeader.tsx` | Specialized lightweight mobile header | Chevron back + category badge + safe-area insets |
| **ActionButton** | `src/components/business/ActionButton.tsx` | Thumb-zone primary CTA button | `min-h-[48px]`, tactile press `active:scale-[0.98]` |
| **OptionRow** | `src/components/business/OptionRow.tsx` | Selectable radio card for departures | `min-h-[56px]` touch boundary, high contrast border |
| **PriceRow** | `src/components/business/PriceRow.tsx` | Formatted price & currency display | Persian numeral formatting with clear Rial label |
| **StatusTimeline** | `src/components/business/StatusTimeline.tsx` | Real-time status event milestone tracker | Vertical timeline with status pill badges |
| **SummaryCard** | `src/components/business/SummaryCard.tsx` | Financial and traveler summary block | `rounded-2xl`, subtle border, high scannability |
| **UploadBox** | `src/components/business/UploadBox.tsx` | Traveler passport & doc uploader | 44px drop zone, file preview, validation feedback |
| **VoucherCard** | `src/components/business/VoucherCard.tsx` | Official digital certificate view | High-contrast printable voucher layout |
| **VoucherQr** | `src/components/business/VoucherQr.tsx` | Scalable QR code renderer | Scaled for physical scanning under variable lighting |

---

## 4. Tactile Micro-Interactions

- **Button Feedback:** `active:scale-[0.98] transition-transform duration-100 ease-out`.
- **Card Selection:** Border highlight transitions from `border-border` to `border-brand` with high-contrast indicator.
- **Scroll Snapping:** Filter chips use `flex gap-2 overflow-x-auto no-scrollbar scroll-smooth snap-x pb-1`.
