# Technical Architecture — Current Implementation (Repository-Verified)

> **Purpose:** This document supersedes the historical stack proposal in the original specification. It describes the architecture found by inspecting GitHub repository `KoRomeo/cuan-app-sales-specification`, branch `v0/finish-frontend-backend`, on 17 October 2026. This was a static repository inspection; no build, test suite, live database, or deployed environment was run as part of this documentation update.
> 
> **Source of truth:** The branch's source code and migrations define what is implemented. Product requirements in the other knowledge-base files describe intended behavior and must not be treated as proof that every feature is complete.

## 1. Current stack

|Layer|Current implementation observed|Notes|
|---|---|---|
|Framework|Next.js 16.3.3, App Router|Route handlers live under `app/api/**/route.ts`.|
|UI|React 19, TypeScript|Existing UI should be preserved; make targeted changes rather than rebuilding.|
|Styling/components|Tailwind CSS 4, shadcn-related configuration, Base UI, Lucide React|Exact UI component usage varies by page.|
|Database|Neon PostgreSQL|Connected through `pg`'s `Pool` and Drizzle ORM.|
|ORM/schema|Drizzle ORM; `lib/db/schema.ts`; SQL migrations under `drizzle/`|The schema and migrations are the current application data model. Do not use the original MySQL ERD as a direct migration script.|
|Authentication|Better Auth, email/password enabled|Configured in `lib/auth.ts`; Drizzle adapter uses the shared schema.|
|Authorization|Session checks plus `business_members` membership checks|Business-owned API operations should validate the signed-in user and selected business.|
|Hosting/deployment|Vercel-oriented configuration and environment variables|Deployment success is not asserted by this document.|
|Package manager|`package.json` declares `pnpm@12.3.4`; both `pnpm-lock.yaml` and `package-lock.json` exist|Avoid casually regenerating or switching lockfiles. The developer has previously reported that `pnpm` was not recognized in their local PowerShell.|

## 2. High-level architecture

```
Browser / React UI
        |
        | fetch / HTTP requests
        v
Next.js App Router API handlers (app/api/**/route.ts)
        |
        +--> Better Auth session validation
        +--> business_members membership / tenant authorization
        +--> input validation and business rules
        |
        v
Drizzle ORM (lib/db/schema.ts)
        |
        v
pg Pool (lib/db/index.ts)
        |
        v
Neon PostgreSQL
```

- `lib/db/index.ts` creates a `pg` Pool from `DATABASE_URL` (maximum pool size observed: 5) and passes it to Drizzle.
- `lib/auth.ts` configures Better Auth with the Drizzle adapter and email/password authentication.
- `lib/api-auth.ts` contains a reusable `requireBusinessAccess` helper. Some handlers, including the order route, implement their own local access helper; do not assume all routes use one identical helper without checking each route.
- Database transactions are used in operational write paths where multiple records must change together. Keep stock movements, operational records, payment records, and journal postings consistent within a transaction where appropriate.

## 3. Repository evidence inspected

The following files were inspected on `v0/finish-frontend-backend`:

- `package.json`
- `lib/auth.ts`
- `lib/api-auth.ts`
- `lib/db/index.ts`
- `lib/db/schema.ts`
- `lib/accounting.ts`
- `app/api/orders/route.ts`
- API directory listings for orders, purchases, payments, accounting, products, stock, stock movements, customers, suppliers, deliveries, and businesses
- SQL migration files under `drizzle/`

Useful links:

- [Repository](https://github.com/KoRomeo/cuan-app-sales-specification)
- [Current working branch](https://github.com/KoRomeo/cuan-app-sales-specification/tree/v0/finish-frontend-backend)
- [Database schema](https://github.com/KoRomeo/cuan-app-sales-specification/blob/v0/finish-frontend-backend/lib/db/schema.ts)
- [Order API](https://github.com/KoRomeo/cuan-app-sales-specification/blob/v0/finish-frontend-backend/app/api/orders/route.ts)
- [Auth configuration](https://github.com/KoRomeo/cuan-app-sales-specification/blob/v0/finish-frontend-backend/lib/auth.ts)
- [Accounting module](https://github.com/KoRomeo/cuan-app-sales-specification/blob/v0/finish-frontend-backend/lib/accounting.ts)

## 4. Authentication and multi-business authorization

### Observed implementation

- Better Auth is configured for email/password authentication.
- The Drizzle schema includes Better Auth tables: `user`, `session`, `account`, and `verification`.
- A `businesses` table stores business context.
- A `business_members` table links users to businesses and records a role (default `owner`).
- `lib/api-auth.ts` verifies the current session and checks membership for the requested business.
- The order API also checks session and membership before returning or mutating business data.

### Rules for future changes

1. Never trust a `businessId` supplied by the browser without checking membership.
2. Scope reads and writes to the authorized business; validate that linked customers and products belong to that same business.
3. Return appropriate `401` for no session, `403` for a signed-in user without membership, and `400` for invalid request input where applicable.
4. Do not expose secrets, environment variables, or session tokens in logs or UI.
5. Inspect the specific route before assuming authorization is consistently applied everywhere.

## 5. Current database model observed in Drizzle schema

The checked-in `lib/db/schema.ts` defines these application tables:

- **Business and tenancy:** `businesses`, `business_members`
- **Sales:** `customers`, `orders`, `order_items`, `deliveries`
- **Purchasing:** `suppliers`, `purchases`, `purchase_items`
- **Inventory:** `products`, `stock_movements`
- **Payments and expenses:** `payments`, `expenses`
- **Replacement workflow:** `replacements`
- **Accounting foundation:** `journal_entries`, `journal_entry_lines`
- **Audit history:** `audit_logs`, `audit_log_changes`
- **Authentication:** `user`, `session`, `account`, `verification`

Important implementation distinctions from the original proposed ERD:

- The live schema uses text IDs and PostgreSQL types, not the original proposal's generic BIGINT-based fields.
- `orders` uses the status enum `requested`, `ready`, `delivered`, `cancelled`.
- `payments` can reference an order or purchase and stores date, amount, and account.
- `stock_movements` stores a movement type (`opening`, `purchase`, `sale`, `replacement`, `adjustment`, `reversal`), quantity, date, product, and reference.
- `replacements` currently has date, order, product, quantity, reason, and a `delivered` flag. The original separate replacement header/items model is not what the checked-in schema currently defines.
- `journal_entries` currently uses `kind`, `reference`, and `description`; `journal_entry_lines` stores account name/code as text plus debit and credit. The original `chart_of_accounts` table with account IDs is not present in this inspected schema.
- `audit_logs` and `audit_log_changes` are separate tables, but the current schema shape is simpler than the original proposal's JSON before/after snapshots.
- No `invoices`, `delivery_items`, or dedicated `chart_of_accounts` table appeared in the inspected schema. Do not claim those are implemented as persistent tables without further evidence.

Always inspect the current schema and migrations before adding fields or writing migration SQL. A conceptual ERD may intentionally contain future-state tables not yet implemented.

## 6. API surface observed

API route directories were present for:

- `/api/auth/**`
- `/api/businesses/**`
- `/api/customers/**`
- `/api/suppliers/**`
- `/api/products/**`
- `/api/stock/**`
- `/api/stock-movements/**`
- `/api/orders/**`
- `/api/purchases/**`
- `/api/deliveries/**`
- `/api/payments/**`
- `/api/accounting/**`

This confirms the presence of route files/directories, not that every endpoint or UI flow is fully implemented, complete, or currently error-free. Check route handlers and their clients before making completion claims.

## 7. Order creation and ID generation

The inspected `app/api/orders/route.ts` shows that:

- Order creation is handled by a server-side API route.
- The route validates dates, statuses, line items, quantities, prices/discounts/costs, and payment inputs.
- It verifies the customer and products belong to the selected business.
- It allocates IDs in the format `ORD-YYYYMM-####` using a PostgreSQL advisory transaction lock and the latest ID for that monthly prefix.
- It stores transaction-time unit cost and price data on order items.
- It has explicit conflict/error handling for invalid status transitions, duplicate payment IDs, already-processed delivery stock deductions, and delivered-order immutability.

The source currently permits initial order statuses `requested` or `ready`; delivery and cancellation behavior must be read from the rest of the route and related endpoints before modifying it. The requested customer ID format `CUS-YYYY-####` is a product requirement, but this architecture review did not verify the current customer ID generator; inspect the customer API before claiming that format is implemented.

## 8. Inventory and transaction integrity

The intended business rules to preserve are documented in `02_PRD_Product_and_Business_Rules.md` and `08_Current_Project_Status.md`. Current code should be checked against these rules when working on inventory:

- Orders may be created before stock is purchased; negative stock is a supported business scenario when enabled.
- Stock below zero is highlighted; stock exactly zero is not a negative-stock warning.
- Receiving a purchase and recording a delivery must not double-apply stock movements on retries.
- Duplicate delivery/receive requests should be rejected or safely idempotent.
- Delivered orders must not be casually edited or cancelled; preserve history and use controlled reversal behavior where supported.
- Replacement delivery has a separate stock impact. Damaged items do not automatically become usable stock again.
- Average-cost/COGS behavior must be checked carefully, especially when stock has gone negative.

These are business invariants to test, not blanket claims that every edge case has already been verified on the current branch.

## 9. Accounting: persistent foundation versus fixture-backed calculations

### Persistent foundation observed

- `journal_entries` and `journal_entry_lines` exist in the Drizzle schema.
- `app/api/payments/route.ts` and `app/api/accounting/route.ts` exist.
- Earlier recorded integration work reported transactional payment posting and balanced debit/credit constraints. Re-run tests against the current branch before relying on that earlier verification as current proof.

### Important caveat from current source inspection

`lib/accounting.ts` imports business records and calculations from `@/lib/data` and builds `journalEntries` as an in-memory array from those data collections. Its P&L, balance sheet, cash flow, and general-ledger helpers therefore include fixture/in-memory-derived calculations in the inspected source. The existence of persistent journal tables and API routes does **not** by itself prove that every financial report is fully driven by persisted journal data.

Treat the following as audit items until verified end-to-end:

1. Payment posting writes operational payment and journal data atomically.
2. Journal entries remain balanced and duplicate posting is prevented.
3. Reports query persistent journal entries rather than fixture data.
4. Balance sheet, cash flow, P&L, and general ledger reconcile to the same persisted ledger.
5. Order cancellation/reversal and replacements create correct financial effects.
6. Rollback behavior is tested when any part of a transaction fails.

Do not represent accounting reports as production-complete until these checks pass.

## 10. Frontend and localization

- UI is built with React in the Next.js application.
- `lib/i18n.ts` exists and contains localization strings for English and Indonesian.
- Keep the app bilingual (English and Indonesian) as a requirement.
- Avoid redesigning existing screens unless explicitly requested. Prefer targeted changes and maintain the current component and navigation patterns.
- Verify whether a page is using a live API or fixture/mock data before wiring new behavior into it.

## 11. Current status summary

|Area|Evidence/status|What remains to verify|
|---|---|---|
|Framework/database/auth|Source files and dependencies observed|Runtime environment, deployed auth behavior, and migrations against the current Neon database|
|Business membership|`business_members` schema and membership checks observed|Audit every API route for tenant isolation|
|Products/stock|API route directories and schema observed; prior integration verification recorded|Re-run current tests; inspect every UI for mock data; verify negative stock and average-cost edge cases|
|Orders/purchases/deliveries|API route files exist; order handler has validation, membership checks, and ID generation|Full end-to-end lifecycle and rollback tests on current branch|
|Payments/accounting|Persistent journal tables and API files exist|Confirm reports use persistent ledger; reconcile all statements; test duplicate posting and rollback|
|Audit history|Audit tables exist in schema|Verify all critical create/edit/status/payment operations emit complete before/after history and history cannot be hard-deleted|
|IDs|Order ID format is visible in current order API|Verify customer ID generator and sequence scoping|
|UI data source|API and UI infrastructure exist|Audit screen-by-screen for fixture/demo-only data and loading/error states|

## 12. Required engineering workflow for Hermes

When asked to change CuanApp, Hermes should:

1. Read this file and `08_Current_Project_Status.md` first.
2. Confirm the active branch and inspect the exact current files before editing. Preferred branch recorded by the user: `v0/finish-frontend-backend`.
3. Identify whether the task is a product requirement, existing bug, or architectural migration. Do not silently convert one into another.
4. Trace UI → API route → auth/authorization → service/database transaction → schema/migration before changing behavior.
5. Make the smallest complete change that preserves current UI and existing business rules.
6. Never change database schema without a migration plan; never change dependencies/lockfiles casually.
7. Run the most relevant checks available, such as TypeScript, build, focused integration tests, duplicate/retry tests, cross-business authorization tests, and accounting reconciliation tests.
8. Report exactly which files changed, which commands/tests ran, their actual results, and what remains unverified. Never claim tests passed if they were not run.
9. Do not expose `.env`, database URLs, API keys, tokens, or private customer data.

## 13. Historical architecture proposal (not current)

The original blueprint proposed Framer/v0 → React → Inertia.js → Laravel → MySQL. That plan is retained as historical context only. The repository inspected for this document uses Next.js + React + TypeScript + Drizzle + Neon PostgreSQL + Better Auth. Do not migrate back to Laravel/MySQL unless the user explicitly decides to plan a migration.

## 14. Revision record

- **2026-10-17:** Updated from original proposal to reflect static inspection of `v0/finish-frontend-backend`. Documented current dependencies, auth/tenant checks, schema, API route surface, order ID generation, and fixture-backed accounting caveat. No source code was changed by this documentation update, and no build/test was run.