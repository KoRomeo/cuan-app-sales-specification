# CuanApp — Progress Log

> Keep this as a short timeline of meaningful work, not a second specification. Append new entries; do not rewrite history to make old work look current.

## 2026-10-22 — Context handoff preparation

- Consolidating AI entry instructions, current status, progress, and decision records to reduce repeated context.
- No repository inspection or code change was performed as part of this entry.
- Verification status: documentation structure only; implementation status remains subject to repository re-check.

## 2026-10-17 — Architecture/status documentation snapshot

- Recorded current architecture based on a static inspection of `KoRomeo/cuan-app-sales-specification`, branch `v0/finish-frontend-backend`.
- Stack recorded: Next.js 16.3.3, React 19, TypeScript, Drizzle ORM, Neon PostgreSQL, Better Auth.
- The architecture document explicitly noted that build, tests, live database, and deployment were not run during that documentation update.
- Return workflow discussion introduced refund and no-refund modes.
- Reported order-detail API failure: `inArray is not defined`; other reported issues are listed in `08_Current_Project_Status.md`.
- Verification: do not assume any issue or fix is current without re-checking.

## Earlier milestones — historical, not current verification

- Database migrations and business membership/authentication work.
- Product/inventory APIs.
- Orders and purchasing APIs.
- Finance journal foundation and payment forms.
- Historical commit references included `841098e`, `4512bbe`, `32cd2fa`, `2d45690`, `11d621c`, `cfa4426`, and `526ce5b`; confirm Git history before relying on them.

### 2026-10-21 — Unit split/combine feature (backend + UI draft)

- Goal: split a bigger unit into smaller units (e.g. 1 dus = 60 pcs) and combine back, with stock, cost, journal, and history.
- Changed (pushed, branch `v0/finished-backend-frontend`): `lib/units/logic.ts`, `lib/units/server.ts`, `app/api/units/route.ts`, `app/api/units/[id]/route.ts`, `app/api/units/[id]/operations/route.ts`, `lib/db/schema.ts` (enum `unit`, tables `unitRules`, `unitOperations`), `drizzle/0009_unit_conversion.sql`, `drizzle/meta/0009_snapshot.json`, `drizzle/meta/_journal.json`.
- Changed (not yet in repo): `app/(app)/units/page.tsx`, `components/views/unit-views.tsx`, `lib/navigation.ts`, `lib/i18n.ts`.
- Affected modules: inventory (stock movements), accounting (journal, Inventory account), product average cost, audit history, sidebar navigation.
- Verification: `pnpm exec tsc --noEmit` exit 0 (backend and UI). Logic tests 10/10. Migrations 0000–0009 applied in order on PGlite. Local dev login works. `/units` page loads (200). `/api/units` 500 because migration 0009 is not applied to the dev database. Production build of UI NOT verified (sandbox could not fetch Google Fonts).
- Remaining issues: migration not applied to app database; UI not applied or browser-tested; purchase receive bug (see 08).
- Commit/branch: `ceb414a`, `307df82` on `v0/finished-backend-frontend`. No UI commit yet.

## Entry template

### YYYY-MM-DD — Short task title

- Goal:
- Changed:
- Affected modules:
- Verification: (commands/results, or “not run”)
- Remaining issue/blocker:
- Commit/branch: (only if verified)