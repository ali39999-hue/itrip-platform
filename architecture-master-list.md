# 🏗️ iTrip Frontend Architecture & Standards Master List

This document serves as the master blueprint for the iTrip platform's frontend ecosystem. As requested, instead of blindly running `npm install` for 60+ libraries, this list categorizes each tool, standard, or repository, detailing exactly whether it should be installed as a dependency, used as a reference point for patterns, or adopted as a standard for audits.

| Name | Link / Source | Category | Type | Suitable for iTrip? | Priority | Where to use in project | Install / Reference |
|---|---|---|---|---|---|---|---|
| **Next.js** | nextjs.org | Frontend Architecture | Repo | Yes (Core) | High | Core framework for SSR/SSG & App Router | Already Installed |
| **React** | react.dev | Frontend Architecture | Repo | Yes | High | Core UI Library | Already Installed |
| **shadcn/ui** | ui.shadcn.com | UI / UX | Repo | Yes | High | Primary component layer (Tailwind-based) | Already Installed |
| **Radix Primitives** | radix-ui.com | UI / UX | Repo | Yes | High | Underlying accessible components for shadcn | Install (Per component) |
| **Tailwind CSS** | tailwindcss.com | UI / UX | Repo | Yes | High | Styling engine | Already Installed (v4) |
| **Lucide React** | lucide.dev | UI / UX | Repo | Yes | High | Unified iconography system | Already Installed |
| **Storybook** | storybook.js.org | UI / UX | Tool | Yes | High | UI component catalog & isolated testing | Install |
| **Mantine** | mantine.dev | UI / UX | Repo | No | Low | Overlaps with shadcn/Tailwind paradigm | Reference Only |
| **daisyUI** | daisyui.com | UI / UX | Repo | No | Low | Redundant CSS components | Reference Only |
| **Primer React** | primer.style/react | UI / UX | Repo | Yes | Medium | Reference for complex enterprise UI patterns | Reference Only |
| **Designers Italia** | designers.italia.it | UI / UX | Standard | Yes | Low | Human-centered design guidelines | Reference Only |
| **Vercel Examples** | vercel.com/templates | UI / UX | Repo | Yes | Medium | Production architecture patterns | Reference Only |
| **Framer Motion** | framer.com/motion | UI / UX | Repo | Yes | Medium | Advanced UI animations | Already Installed |
| **Geist Font** | vercel.com/font | UI / UX | Repo | Yes | High | Primary typography | Already Installed |
| **Utopia** | utopia.fyi | Responsive | Standard | Yes | High | Fluid typography and fluid spacing | Reference |
| **Every Layout** | every-layout.dev | Responsive | Standard | Yes | High | Intrinsic web design & layout principles | Reference |
| **Tailwind Container Queries** | tailwindcss.com | Responsive | Repo | Yes | High | Adaptive components based on parent container size | Already Installed |
| **Tailwind Breakpoints** | tailwindcss.com/docs | Responsive | Skill | Yes | High | Mobile-first layout structural patterns | Reference |
| **react-use** | github.com/streamich/react-use | Responsive | Repo | Yes | Medium | Hooks for ResizeObserver, media queries, viewports | Install |
| **Floating UI** | floating-ui.com | Responsive | Repo | Yes | High | Adaptive positioning for popovers/tooltips on mobile | Install |
| **Sharp** | github.com/lovell/sharp | Responsive | Repo | Yes | High | High-performance responsive image generation | Install |
| **Playwright** | playwright.dev | Testing / QA | Tool | Yes | High | E2E testing & viewport emulation | Already Installed |
| **Lighthouse** | developer.chrome.com | Performance | Tool | Yes | High | Performance, SEO & mobile audits (CI/CD) | Reference (CLI/Browser) |
| **Web Vitals** | web.dev/vitals | Performance | Standard | Yes | High | Core web metrics (CLS, INP, LCP) monitoring | Reference |
| **Vercel Analytics** | vercel.com/analytics | Performance | Tool | Yes | High | Real User Monitoring (RUM) metrics | Already Installed |
| **TanStack Query** | tanstack.com/query | Architecture | Repo | Yes | High | Server-state management & fetching (ERP) | Install |
| **TanStack Router** | tanstack.com/router | Architecture | Repo | No | Low | Redundant (Using Next.js App Router) | Reference Only |
| **Zustand** | zustand.docs.pmnd.rs | Architecture | Repo | Yes | High | Client UI state management | Already Installed |
| **Zod** | zod.dev | Architecture | Repo | Yes | High | Schema validation (Forms, API inputs) | Already Installed |
| **React Hook Form** | react-hook-form.com | Architecture | Repo | Yes | High | Complex form state (ERP UI) | Already Installed |
| **Hookform Resolvers** | github.com/react-hook-form/resolvers | Architecture | Repo | Yes | High | Connects Zod to React Hook Form | Already Installed |
| **TypeScript** | typescriptlang.org | Architecture | Standard | Yes | High | Static typing across the stack | Already Installed |
| **ESLint** | eslint.org | Architecture | Tool | Yes | High | Code quality and linting | Already Installed |
| **Prettier** | prettier.io | Architecture | Tool | Yes | High | Code formatting standard | Install |
| **Husky** | typicode.github.io/husky | Architecture | Tool | Yes | Medium | Git hooks for pre-commit linting | Install |
| **Lint-Staged** | github.com/lint-staged | Architecture | Tool | Yes | Medium | Run linters only on staged files | Install |
| **React Testing Library** | testing-library.com | Testing / QA | Repo | Yes | High | Integration and UI behavior testing | Already Installed |
| **Vitest** | vitest.dev | Testing / QA | Tool | Yes | High | Unit & fast integration testing runner | Already Installed |
| **Cypress** | cypress.io | Testing / QA | Tool | No | Low | Redundant (Using Playwright) | Reference Only |
| **Jest DOM** | github.com/testing-library/jest-dom | Testing / QA | Repo | Yes | High | Custom DOM matchers for testing | Already Installed |
| **axe-core** | github.com/dequelabs/axe-core | Testing / QA | Tool | Yes | High | Automated accessibility testing | Already Installed |
| **W3C WCAG** | w3.org/WAI/standards | Accessibility | Standard | Yes | High | Accessibility compliance guidelines (v2.1+) | Reference |
| **W3C ARIA Practices** | w3c.github.io/aria-practices | Accessibility | Standard | Yes | High | Interaction patterns for responsive accessible UI | Reference |
| **React Aria** | react-spectrum.adobe.com | Accessibility | Repo | No | Medium | Overlaps with Radix Primitives | Reference Only |
| **OWASP Cheat Sheets** | cheatsheetseries.owasp.org | Security | Standard | Yes | High | Security best practices and checklists | Reference |
| **OWASP ASVS** | owasp.org | Security | Standard | Yes | High | Security verification standard | Reference |
| **OWASP Top 10** | owasp.org/Top10 | Security | Standard | Yes | High | Top application security risks awareness | Reference |
| **OWASP NodeGoat** | nodegoat.herokuapp.com | Security | Skill | Yes | Low | Vulnerability training and patterns | Reference Only |
| **Semgrep** | semgrep.dev | Security | Tool | Yes | High | SAST / code security scanning | Install (CI CLI) |
| **Gitleaks** | gitleaks.io | Security | Tool | Yes | High | Prevent secrets from being committed | Install (Hook/CI) |
| **Trivy** | aquasecurity.github.io/trivy | Security | Tool | Yes | Medium | Docker image & dependency scanner | Install (Docker) |
| **Snyk CLI** | snyk.io | Security | Tool | No | Low | Alternative to Trivy / npm audit | Reference Only |
| **NextAuth.js (Auth.js)** | authjs.dev | Security | Repo | Yes | High | Session and authentication management | Already Installed |
| **BcryptJS** | github.com/dcodeIO/bcrypt.js | Security | Repo | Yes | High | Secure password hashing | Already Installed |
| **TanStack Table** | tanstack.com/table | ERP / Data | Repo | Yes | High | Headless data tables (Sorting/Filtering) | Install |
| **TanStack Virtual** | tanstack.com/virtual | ERP / Data | Repo | Yes | High | Headless UI for virtualization of large data lists | Install |
| **Recharts / Chart.js** | recharts.org | ERP / Data | Repo | Yes | Medium | Dashboard data visualizations | Install (When Needed) |
| **React Leaflet** | react-leaflet.js.org | ERP / Data | Repo | Yes | High | Mapping and geolocation displays | Already Installed |
| **Multi Date Picker** | github.com/shahabyazdi/react-multi-date-picker | ERP / Data | Repo | Yes | High | Jalali/Gregorian date selection | Already Installed |
| **Prisma** | prisma.io | Backend | Repo | Yes | High | ORM and DB Schema Management | Already Installed |
| **Docker** | docker.com | Infrastructure | Tool | Yes | High | Containerization for dev/prod | Already Installed |
| **PostHog** | posthog.com | Analytics | Repo | Yes | Medium | Product analytics and feature flags | Already Installed |
| **Nuqs** | nuqs.47ng.com | Architecture | Repo | Yes | Medium | Type-safe URL search params (for ERP tables) | Install |
| **Turbopack / SWC** | turbo.build/pack | Performance | Tool | Yes | High | Next.js compilation engine | Already Installed |
| **React Error Boundary** | github.com/bvaughn | Architecture | Repo | Yes | High | Granular UI error catching | Already Installed |
| **Next-Intl** | next-intl-docs.vercel.app | Architecture | Repo | Yes | High | i18n & Localization support | Already Installed |
| **Sonner** | sonner.emilkowal.ski | UI / UX | Repo | Yes | High | Accessible toast notifications | Already Installed |
| **Date-fns** | date-fns.org | Architecture | Repo | Yes | High | Modern date manipulation utility | Already Installed |
| **Clsx & Tailwind-merge** | github.com/lukeed/clsx | Architecture | Repo | Yes | High | Dynamic Tailwind class merging | Already Installed |
| **GitHub Actions** | github.com/features/actions | Infrastructure | Tool | Yes | High | Primary CI/CD pipelines | Reference |
| **Dependabot** | github.com/dependabot | Security | Tool | Yes | High | Automated dependency updates | Reference |
| **Sentry** | sentry.io | Performance | Tool | Yes | Medium | Production error tracking | Install (If Needed) |
| **CORS / CSP** | developer.mozilla.org | Security | Standard | Yes | High | Network and content security headers | Reference |
| **Redis** | redis.io | Infrastructure | Tool | Yes | Medium | Caching and session/rate-limit store | Reference |
| **PostgreSQL / MySQL** | postgresql.org | Infrastructure | Tool | Yes | High | Primary relational database | Already Installed (Docker) |
| **Drizzle ORM** | orm.drizzle.team | Backend | Repo | No | Low | Redundant (Using Prisma) | Reference Only |
| **Redux Toolkit** | redux-toolkit.js.org | Architecture | Repo | No | Low | Redundant (Using Zustand/Query) | Reference Only |
| **Valibot / Yup** | valibot.dev | Architecture | Repo | No | Low | Redundant (Using Zod) | Reference Only |
| **Chakra UI / MUI** | mui.com | UI / UX | Repo | No | Low | Redundant (Using shadcn + Tailwind) | Reference Only |
| **Sass / Styled Components**| sass-lang.com | UI / UX | Standard | No | Low | Redundant (Using Tailwind) | Reference Only |
| **MSW (Mock Service Worker)**| mswjs.io | Testing / QA | Repo | Yes | Medium | API mocking for unit/integration tests | Install |
| **K6** | k6.io | Performance | Tool | Yes | Medium | API and Load testing | Reference (CLI) |
| **Nginx** | nginx.org | Infrastructure | Tool | Yes | Medium | Reverse proxy & static serving | Reference |
| **SonarLint** | sonarsource.com | Security | Tool | Yes | High | IDE extension for code quality/security | Reference (IDE) |
| **Cloudflare** | cloudflare.com | Infrastructure | Tool | Yes | High | WAF, CDN, and DNS management | Reference |
| **Web Push** | web.dev/notifications | Infrastructure | Repo | Yes | Medium | PWA push notification support | Already Installed |

### Action Items for iTrip
Based on the `package.json` in your repository (`C:\Users\Lenovo\Desktop\firouzo\itrip-platform`):
1. **Already Mastered:** Most of the core stack (Next.js, Tailwind v4, shadcn, Zod, React Hook Form, Zustand, Playwright, Vitest) is **already successfully installed**.
2. **To Be Installed (Dependencies):**
   - `npm install @tanstack/react-query` (Essential for the ERP data tables)
   - `npm install @tanstack/react-table` (For complex ERP data grids)
3. **To Be Configured (Tooling):**
   - Setup `Prettier`, `Husky`, and `lint-staged` for code formatting consistency.
   - Setup `Semgrep` and `Gitleaks` in CI (GitHub Actions or equivalent) to enforce the OWASP security checks you requested.
4. **To Be Used as Standards (No Installation):**
   - Use `Lighthouse` and `axe-core` to run audits against WCAG 2.1+ standards.
   - Reference `OWASP ASVS` and the `Cheat Sheet Series` for code reviews, rather than trying to install them.
