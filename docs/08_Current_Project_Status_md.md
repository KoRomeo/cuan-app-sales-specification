# CuanApp — Current Project Status

> **Status snapshot date:** 2026-10-27  
> **Confidence:** Partial. The latest security-related commits and Vercel status were checked on GitHub; a complete route-by-route security audit and runtime penetration tests have not been completed.

## Project

- Product: CuanApp; first module: CuanApp Sales.
- Repository: `KoRomeo/cuan-app-sales-specification`.
- Active branch for this work: `v0/finished-backend-frontend`.
- Local path: `D:\Downloads\cuan-app-sales-specification`.
- Stack last known: Next.js 16.3.3, React 19, TypeScript, Drizzle ORM, Neon PostgreSQL, Better Auth, Vercel deployment.
- Verify repository, branch, HEAD, and working tree at the start of each local coding session.

## Security work — 2026-10-27

### Changes pushed to `v0/finished-backend-frontend`

| Area | Change | Status |
|---|---|---|
| Internal app pages | `app/(app)/layout.tsx` checks the Better Auth session server-side and redirects unauthenticated users to `/login`. Commit `edd0192`. | IMPLEMENTED; route coverage still needs verification |
| Suppliers API | `app/api/suppliers/route.ts` adds session/business-membership checks, basic input validation, transaction use for creation, and generic server errors. Commit `ed3a657`. | IMPLEMENTED; test authorization and linked-resource boundaries |
| Invoice processing | Processing errors no longer return raw AI/provider errors to the client. Commit `a50c326`. | IMPLEMENTED |
| Response headers | `next.config.mjs` adds `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and private/no-store cache headers for API routes. Commit `ceb0b14`. | IMPLEMENTED; verify behavior in deployed responses |
| Invoice upload | Unexpected upload/finalization errors are returned as generic messages instead of exposing private Blob internals. Commit `7520d41`. | IMPLEMENTED; deployment status rechecked after this commit |

The latest checked Vercel status for commit `7520d4116e097cd12c6ca7b7e86e2698c6c595c5` was **Success**. This confirms a deployment check passed, not that all security controls or business flows have been independently tested.

## Security status: not complete yet

The work above is a first hardening pass, not a security certification. The following remain open:

- [ ] Enumerate all pages, API routes, route handlers, server actions, and file-serving endpoints.
- [ ] Confirm every private page is protected by server-side authentication; test direct URL entry while signed out.
- [ ] Confirm every business-owned read/write is scoped to the authenticated user's authorized business.
- [ ] Test IDOR scenarios by changing customer, supplier, product, order, purchase, delivery, return, payment, financial-account, and document IDs.
- [ ] Confirm linked records in a mutation all belong to the same authorized business.
- [ ] Test private invoice Blob access and upload/finalization against cross-business IDs and tampered metadata.
- [ ] Review rate limiting, brute-force protections, CSRF/origin assumptions, validation, and sensitive actions.
- [ ] Run type-check, tests, and production build; record actual output.
- [ ] Verify production response headers and signed-out/cross-business behavior in the deployed app.

Do not mark security as complete until these checks have evidence.

## Latest known product requirements

- Real persistence; no demo data or mock success states.
- Business-owned operations require an authenticated session and authorized business membership.
- Linked customers, suppliers, products, orders, and financial accounts must belong to the same authorized business.
- Multi-record operations should be atomic.
- Changes must update affected inventory, payment, debt, accounting, reporting, dashboard, and history records.
- English and Indonesian localization must be maintained.
- Moving-average inventory costing is the agreed costing method.
- Audit history should be append-only for normal user workflows.

## Earlier reported issues — re-test before fixing

Historical reports; current status unknown unless verified:

- Order detail API returned HTTP 500 for `ORD-202610-0019` due to `ReferenceError: inArray is not defined` in `app/api/orders/[id]/route.ts`.
- `purchasePaid is not a function` in `components/views/purchasing-views.tsx`.
- Expenses page parse error in `finance-views.tsx`.
- Delivery recording/loading errors.
- Financial Accounts query failure despite HTTP 200.
- Units feature migration `0009_unit_conversion` had not been applied to the app database in the prior report; verify current database before using the feature.
- Purchase receipt logic previously had a duplicate stock movement reference between purchase creation and receipt.

These are leads, not a claim that the defects still exist.

## Next-session checklist

1. Verify active repo, branch, HEAD, and working tree.
2. Continue the security audit from API/server-action inventory; do not assume the layout guard secures APIs.
3. Test direct URL access while signed out.
4. Test cross-business ID access on reads, updates, deletes, file downloads, and multi-record mutations.
5. Run checks available in `package.json` and record exact results.
6. Fix findings and add regression tests where feasible.
7. Update this document and `10_Progress_Log_md.md` with evidence.

## Status notation

Use only:

- `DONE + verified` — implemented and verification evidence exists.
- `IMPLEMENTED, unverified` — code appears present but checks are incomplete.
- `IN PROGRESS`
- `BLOCKED`
- `NOT STARTED`
- `UNKNOWN / needs re-check`

Never use a percentage-complete estimate without defined criteria and evidence.

## Update 2026-10-21 — Unit split/combine (historical snapshot)

- Backend: reported committed and pushed on `v0/finished-backend-frontend` (`ceb414a`, `307df82`). Routes in `app/api/units/`, logic in `lib/units/`, tables `unit_rules` and `unit_operations`.
- Migration `0009_unit_conversion`: previously verified on in-memory PGlite, but not confirmed applied to the app database.
- UI was reported written and type-checked but not browser-tested at that time.
- Known issue at that time: `/api/units` returned 500 until migration 0009 was applied.
- Known purchase receive/stock-movement duplicate reference issue was not confirmed fixed.
