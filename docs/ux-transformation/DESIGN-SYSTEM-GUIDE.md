# Firuzo Design System 2.0 — Core Tokens & Utilities

**Owner:** ZCode Agent (UX Transformation Workstream)  
**Version:** 2.0 (post-audit)  
**Status:** READY FOR IMPLEMENTATION — only docs, no src/ edits yet  
**Last updated:** 2026-09-21  

## 1. Semantic Color Tokens (Tailwind v4 + CSS variables)

```css
/* globals.css @theme extension */
--color-brand: #00a9a5;           /* turquoise primary */
--color-brand-dark: #046E6B;      /* darker for text on white */
--color-action: #F0A62A;          /* gold booking CTA */
--color-price: #9C6209;           /* amber price */
--color-surface: #ffffff;
--color-surface-elevated: #f8fafc;
--color-border: #e5e7eb;
--color-text-primary: #111827;
--color-text-secondary: #6b7280;

.dark {
  --color-surface: #1f2937;
  --color-surface-elevated: #374151;
  --color-border: #374151;
  --color-text-primary: #f9fafb;
}
```

**Rule:** Only turquoise (#00a9a5) allowed for text on white surfaces. Never invert.

## 2. Spacing & Touch Targets (Mobile-First)

```css
@utility touch-target {
  @apply min-w-[44px] min-h-[44px] flex items-center justify-center;
}

@utility safe-pb {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}

@utility safe-pt {
  padding-top: max(1rem, env(safe-area-inset-top));
}

@utility no-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar { display: none; }
}
```

**Rule:** All CTAs (Book/Continue, filters, payment) must live in thumb zone (bottom fixed bar or bottom sheet). Minimum 44×44px interactive area, 8px gap.

## 3. Typography & RTL

- **Fonts:** Vazirmatn / Shabnam (line-height: 1.65) for Persian.
- **Logical properties only:** start- / end- / ms- / me- / ps- / pe- (never left/right/ml/mr/pl/pr).
- **Icons:** Chevrons flip in RTL (`rtl:rotate-180`), media icons (play/pause/star/clock) do **not** flip.

## 4. Card & Elevation

- Radius: `rounded-2xl`
- Border: `border border-border/80`
- Dark: `dark:border-white/10 dark:bg-surface-elevated`
- Elevation shadows: `shadow-elev-1/2/3` (turquoise tint)

## 5. Button Variants (from code audit)

```tsx
// src/components/ui/button.tsx
const buttonVariants = cva(
  "rounded-lg border border-transparent ...",
  {
    variants: {
      variant: {
        brand: "bg-brand-dark text-surface hover:bg-brand transition-colors",
        action: "bg-action text-ink hover:bg-action-hover font-black active:scale-[0.98]",
      },
      size: { default: "h-10 ...", icon: "size-10" }
    }
  }
)
```

**Rule:** `action` variant for all booking/payment CTAs (gold, bold, active scale).

## 6. Bottom Sheets & Mobile Chrome

- All dialogs <768px → Bottom Sheet (drag handle, swipe-down).
- StickyMobileBar / StickyCTA ownership contract: use StickyMobileBar on checkout (BottomNav hidden), StickyCTA elsewhere.

## 7. Non-Goals (from audit)

- Never redesign away core card hierarchy, cart, checkout flow, wallet.
- Never add Admin tab or service catalog as primary navigation.
- Never use heavy drop-shadows or modals on mobile.

**Exit Gate for Phase 2:** All tokens implemented in globals.css + Button + Card components. Run `npm run lint` + `npm run gate:uiux` (must stay green).

---

**Next Action:** After user approval of this guide, proceed to Phase 3 (Navigation + Home) on branch `feat/ux-ia-nav` only.

(End of Phase 2 documentation — ready for implementation)