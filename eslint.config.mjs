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
  // The Business (technology-tour) vertical must reach core capabilities only
  // through `FiruzoCoreClient`. A direct Prisma or core-domain import would let
  // it read core tables and undo the separation the vertical is built on, so
  // this is an error, not a warn — there is no legacy debt here to ratchet.
  {
    files: ["src/domains/business/**/*.{ts,tsx}"],
    ignores: ["src/domains/business/core/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/prisma", "@prisma/client"],
              message:
                "The business vertical must not touch core data directly. Go through FiruzoCoreClient (src/domains/business/core) so a later physical DB split stays possible.",
            },
            {
              group: [
                "@/domains/inventory/*",
                "@/domains/booking/*",
                "@/domains/ledger/*",
                "@/domains/identity/*",
                "@/domains/payments/*",
                "@/domains/finance/*",
              ],
              message:
                "Core capabilities are reached via FiruzoCoreClient, not by importing core domain modules. Add a method to the client interface instead.",
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
