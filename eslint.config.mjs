import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // BASE-006 — Architecture dependency guardrails.
  // Domain services must stay framework- and presentation-independent: they
  // may not reach into UI components, server actions, pages, client stores,
  // or hooks. Domain → lib/domain/infra is allowed; the reverse never is.
  {
    files: ["src/domains/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app", "@/app/**", "@/components", "@/components/**", "@/actions", "@/actions/**", "@/stores", "@/stores/**", "@/hooks", "@/hooks/**"],
              message: "Domain services must not depend on the presentation/application layers (BASE-006). Inject parameters or move the logic into the domain instead.",
            },
            {
              group: ["next/navigation", "next/headers", "next-auth"],
              message: "Domain services must not depend on request/auth plumbing — resolve context in the application layer and pass it in (BASE-006).",
            },
          ],
        },
      ],
    },
  },
  // BASE-006 — Presentation must not touch Prisma directly; data access
  // belongs in application actions / query services / domains. Pages that
  // currently violate this are legacy debt (admin dashboard, travel files,
  // exceptions, ops): they warn so lint stays green while the boundary is
  // ratcheted shut — new violations in components fail lint outright.
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/prisma"],
              message: "UI layers must not import Prisma directly (BASE-006). Read data through server actions or query services.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/app/**/page.tsx"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["@/lib/prisma"],
              message: "Pages must not import Prisma directly (BASE-006). Read data through server actions or query services — ratchet to error once legacy admin pages are migrated.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "work/**",
    "scripts/**",
    ".tmp-i18n-work/**",
    "scratch/**",
    "*.cjs",
  ]),
]);

export default eslintConfig;
