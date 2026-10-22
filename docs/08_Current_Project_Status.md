# CuanApp — Current Project Status

> **Status snapshot date:** 2026-10-22  
> **Confidence:** Partial. The repository was not inspected during this status-file preparation. Treat technical details below as the latest known reports, not as verified live state.

## Project

- Product: CuanApp; first module: CuanApp Sales.
- Repository historically used: `KoRomeo/cuan-app-sales-specification`.
- Preferred branch historically used: `v0/finish-frontend-backend`.
- Local path historically used: `D:\Downloads\cuan-app-sales-specification`.
- Stack last inspected on 2026-10-17: Next.js 16.3.3, React 19, TypeScript, Drizzle ORM, Neon PostgreSQL, Better Auth, Vercel-oriented deployment.
- **First action in a coding session:** verify repo, branch, commit, working tree, and current code. A prior branch spelling `v0/finished-backend-frontend` also appeared in conversation; do not assume it exists.

## Latest known product work

The most recent explicit feature design discussion was the Returns page:
- Two modes: return without refund, and return with monetary refund.
- No-refund mode must not create a cash refund.
- Refund mode must record the refund and correctly affect the relevant financial account, order/customer balances, accounting journals, and reports.
- Inventory effects must follow the agreed return/replacement rules; do not infer the exact stock adjustment for every case without checking the established rule and current implementation.

## Known reported issues — re-test before fixing

Last reported in earlier implementation conversations; current status unknown:
- Order detail API returned HTTP 500 for `ORD-202610-0019` due to `ReferenceError: inArray is not defined` in `app/api/orders/[id]/route.ts` after return integration.
- Order detail UI showed JSON parsing errors / “Unable to load order details.”
- `purchasePaid is not a function` in `components/views/purchasing-views.tsx`.
- Expenses page parse error in `finance-views.tsx`.
- Delivery loading/recording errors.
- Financial Accounts page loaded with HTTP 200 but still showed a database-query failure.
- Returns integration and related finance/dashboard updates needed verification.
- Earlier reports mentioned possible duplicate declarations in Stock Movements and API response-shape issues in Deliveries.

These are leads, not a claim that the defects still exist.

## Important implementation requirements

- Real persistence; no demo data or mock success states.
- Validate authenticated session and selected-business membership for business-owned API operations.
- Validate that linked customers, suppliers, products, orders, and financial accounts belong to the same authorized business.
- Multi-record operations should be atomic.
- Changes must update all affected inventory, payment, debt, accounting, reporting, dashboard, and history records.
- English and Indonesian localization must be maintained.
- Moving-average inventory costing is the agreed costing method.
- Audit history should be append-only for normal user workflows.

## Next-session checklist

- [ ] Confirm active repository, branch, HEAD commit, and uncommitted changes.
- [ ] Inspect Returns page/API, order detail API, schema, stock movement logic, payment logic, and accounting posting.
- [ ] Reproduce the first relevant current bug instead of assuming old reports remain valid.
- [ ] Trace each affected operation end-to-end.
- [ ] Add/update tests for both return modes and relevant edge cases.
- [ ] Run type-check, tests, migration/schema checks, and production build where available.
- [ ] Update this file with verified outcomes and exact unresolved blockers.

## Status notation

Use only:
- `DONE + verified` — implemented and verification evidence exists.
- `IMPLEMENTED, unverified` — code appears present but checks are incomplete.
- `IN PROGRESS`
- `BLOCKED`
- `NOT STARTED`
- `UNKNOWN / needs re-check`

Never use a percentage-complete estimate without defined criteria and evidence.
