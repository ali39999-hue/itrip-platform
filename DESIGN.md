# Firuzo Mobile & Web Design System (DESIGN.md)

> Authority document for AI coding agents and designers building interfaces for the Firuzo / iTrip Travel Super App. Grounded in Apple Human Interface Guidelines, Material 3, and WCAG 2.2 AA.

---

## 1. Brand Tokens & Color Palette

### 1.1 Primary & Accent Colors
- **Brand Turquoise (هویت اصلی):**
  - `--color-brand`: `#00A9A5` (buttons, active tabs, brand accents)
  - `--color-brand-dark`: `#046E6B` (**the ONLY turquoise permitted for readable text on white backgrounds** — WCAG AA compliant)
  - `--color-deep`: `#053F3E` (dark headers, contrast text, deep surfaces)
  - `--color-mint`: `#E4F6F5` (light badge backgrounds, active pill highlights)
- **Saffron Action (فقط رزرو و پرداخت):**
  - `--color-action`: `#F0A62A` (reserved strictly for conversion CTAs: "رزرو نهایی", "تایید و پرداخت")
  - `--color-action-price`: `#9C6209` (price labels and numerical values on cold neutrals)
- **Neutrals & Surfaces:**
  - Background: `bg-slate-50` (light) / `bg-[#0B1313]` (dark)
  - Card Surface: `bg-white` (light) / `bg-[#142020]` (dark)
  - Card Border: `border-slate-200/80` (light) / `border-white/10` (dark)

### 1.2 Elevation Shadows
- Always use turquoise-tinted shadows instead of raw black:
  - `shadow-elev-1`: `0 1px 2px rgba(5,63,62,0.05), 0 4px 16px rgba(5,63,62,0.06)`
  - `shadow-elev-2`: `0 2px 6px rgba(5,63,62,0.07), 0 14px 32px rgba(5,63,62,0.11)`
  - `shadow-brand`: `0 8px 24px rgba(0,169,165,0.28)`

---

## 2. Typography & Persian Nuances

- **Primary Font:** `IRANYekanXFaNum` (Persian numerals for dates, prices, flight times).
- **English Numbers/Codes:** `font-en` (`Plus Jakarta Sans`) strictly for flight IATA codes (`IKA`, `DXB`, `SYZ`), booking PNR codes, and card numbers.
- **Hierarchy:**
  - Screen Titles: `text-xl font-bold tracking-tight text-deep`
  - Card Titles (Hotel/Airline): `text-base font-bold text-slate-900`
  - Metadata / Badges: `text-xs font-medium text-slate-500`
  - Prices: `text-lg font-extrabold text-[#9C6209] font-en/IRANYekanXFaNum`

---

## 3. Mobile Navigation & Thumb-Zone Ergonomics

```
+-------------------------------+  <- 0% (Status Bar & Safe Area)
| [<]  انتخاب پرواز            |  <- Minimal App Bar (Height 56px)
+-------------------------------+
|  [همه] [هواپیمایی] [قیمت]     |  <- Horizontal Filter Scroll (Snap)
|-------------------------------|
|  +-------------------------+  |  <- Card-Heavy Travel Cards
|  | Mahan Air | 14:30 -> 16:00 |  |     (Border: 1px, Radius: 16px)
|  | 2,450,000 تومان  [انتخاب]  |  |
|  +-------------------------+  |
|  +-------------------------+  |
|  | IranAir   | 18:00 -> 19:30 |  |
|  | 2,200,000 تومان  [انتخاب]  |  |
|  +-------------------------+  |
|                               |  <- NATURAL THUMB REACH ZONE (Bottom 35%)
+-------------------------------+
|  [ فیلترها (۳) ]   [ جستجو ]  |  <- Fixed Bottom Bar / Primary Action
+-------------------------------+  <- 100% (Home Indicator Safe Area)
```

1. **Fixed Action Bar:**
   - Any screen with a decisive next step must fix the primary button to the bottom thumb zone:
   `fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-100 z-30`
2. **Touch Sizing:**
   - Tap targets must measure at least **44×44px**.
   - Steppers (`+` / `-`), filter badges, close icons must have comfortable hit areas.
3. **Bottom Sheets:**
   - Mobile dialogs (dates, passengers, sorting) MUST open from bottom (`rounded-t-3xl`), with swipe-down dismissal and top drag pill.

---

## 4. Travel Card Specifications (Flights & Hotels)

- **Shape:** `rounded-2xl` with `p-4`.
- **Flight Card Layout:**
  - Row 1: Airline logo + Name + Flight class pill (اکونومی / سیستمی).
  - Row 2: Departure time & airport `->` Duration / Stops `->` Arrival time & airport.
  - Row 3: Baggage allowance + Remaining seats badge (`text-rose-600 bg-rose-50`).
  - Row 4: Price formatted with comma separators + Action button (`bg-[#F0A62A] text-slate-900 font-bold`).
- **Hotel Card Layout:**
  - 16:9 Aspect ratio image with rounded top corners + Star rating overlay badge.
  - Hotel name + Distance from city center / holy shrine.
  - Amenities badges (WiFi, Breakfast, Pool) using concise icons.
  - Nightly price + "مشاهده اتاق‌ها" button.
