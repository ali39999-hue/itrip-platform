# Firuzo / iTRIP — UX Experience Transformation Pack

**Status:** Phase 0–2 docs done · Phase 3 navigation on branch `feat/ux-ia-nav`  
**Owner session:** UX transformation  
**Isolation rule:** do not edit `docs/baseline/*` or other sessions’ worktrees. Product UI for Phase 3 lives on `feat/ux-ia-nav` only.

## Why this folder exists

The product already has working commerce, i18n, design tokens, and quality gates. The transformation target is **one travel operating system**, not prettier isolated pages.

Older docs (`docs/firuzo-route-audit.md`, `HANDOFF.md`) mix aspirational scores with current code. This pack is the new source of truth for the UX program and is grounded in the repository as of 2026-09-21.

## Documents

| File | Purpose |
|---|---|
| [UX-AUDIT.md](./UX-AUDIT.md) | Phase 0 baseline: what exists, what is coherent, what is broken as a *system* |
| [UX-ROUTE-MATRIX.md](./UX-ROUTE-MATRIX.md) | Every traveler-facing route mapped to purpose, CTA, states, and IA bucket |
| [UX-ISSUE-BACKLOG.md](./UX-ISSUE-BACKLOG.md) | P0–P3 issues with evidence, root cause, and systemic (not page-local) fixes |
| [UX-ARCHITECTURE.md](./UX-ARCHITECTURE.md) | Phase 1 experience architecture, IA, navigation, journeys, deep links |
| [UX-ROADMAP.md](./UX-ROADMAP.md) | Ordered execution; later phases must not start until earlier gates pass |
| [UX-DECISION-LOG.md](./UX-DECISION-LOG.md) | Decisions, what is preserved, session isolation |
| [DESIGN-SYSTEM-GUIDE.md](./DESIGN-SYSTEM-GUIDE.md) | Phase 2: existing tokens/primitives — complete, don’t replace |

## Non-negotiable loop

```
AUDIT → IDENTIFY ROOT CAUSE → PRIORITIZE → DESIGN → IMPLEMENT → TEST → VERIFY → RE-AUDIT
```

Never: audit → change everything → hope it works.  
Never: isolated redesign of a single page while Search → Checkout → My Trips stay disconnected.

## Session isolation

- Other sessions currently touch `docs/baseline/a11y-baseline.json` and `docs/baseline/quality-report.json` on `main`.
- Claude worktrees exist under `.claude/worktrees/*` (flight-card mobile work). Do not merge or overwrite them.
- Docs stay under `docs/ux-transformation/`. Phase 3 code is on `feat/ux-ia-nav` (nav + Explore hub only).
