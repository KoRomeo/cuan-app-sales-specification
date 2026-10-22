# CuanApp — Decision Log

> Record durable decisions, not every idea. New decisions are appended with a date and status. If a decision changes, mark the old record `SUPERSEDED` and link the replacement; do not silently erase it.

## D-001 — Product purpose
- **Decision:** CuanApp Sales is an owner/sales-focused business management and sales/distribution application, not primarily a cashier/POS workflow.
- **Status:** Accepted.

## D-002 — Flexible operational sequence
- **Decision:** CuanApp records the business's real workflow rather than forcing a rigid order. A purchase may happen before or after an order, and orders can exist while stock is insufficient.
- **Status:** Accepted.

## D-003 — Negative stock
- **Decision:** Negative inventory is permitted under the agreed business rules. Inform users clearly, including stock before/after where relevant, rather than blocking a valid operation solely because stock becomes negative.
- **Status:** Accepted.

## D-004 — Inventory costing
- **Decision:** Use moving-average cost for inventory/COGS.
- **Example:** 10 units at Rp5,000 plus 10 at Rp6,000 gives an average of Rp5,500 per unit.
- **Status:** Accepted. Zero-stock and subsequent-purchase behavior must be handled explicitly.

## D-005 — Returns versus replacements
- **Decision:** Treat returns and replacements as different workflows. Replacement cost must affect COGS appropriately without reducing revenue incorrectly or being counted twice.
- **Status:** Accepted.
- **Implementation note:** Validate stock effects against the exact scenario and existing code before changing logic.

## D-006 — Return modes
- **Decision:** The Returns page should support both (a) return without monetary refund and (b) return with monetary refund.
- **Status:** Accepted as product direction; full end-to-end implementation/verification is unknown.
- **Required effects:** The selected mode must determine refund records, cash/financial-account movement, order/customer balances, inventory treatment, journal entries, reports, and history as applicable.
- **Open implementation check:** Confirm the precise inventory treatment for each return scenario against existing agreed rules; do not guess.

## D-007 — Payments and balances
- **Decision:** Support zero-value initial payments, partial payments, and multiple payments. Payment records must link to the real order or purchase and the appropriate financial account.
- **Status:** Accepted.

## D-008 — Accounting
- **Decision:** Use double-entry accounting foundations and produce financial statements from consistent accounting data. Avoid duplicate posting and double counting.
- **Status:** Accepted as product/architecture direction; statement-level correctness requires testing.

## D-009 — Audit history
- **Decision:** History is intended to be append-only for normal user operations, with date/time, page/module, action, and before/after values. Ordinary users must not be able to erase audit history.
- **Status:** Accepted.

## D-010 — Bilingual UI
- **Decision:** Support English and Indonesian from the start. Every new or revised page must include both languages through the localization system.
- **Status:** Accepted.

## D-011 — Existing project preservation
- **Decision:** Continue the existing codebase; avoid unnecessary rebuilds, broad rewrites, or unrelated redesigns.
- **Status:** Accepted.

## D-012 — Verification standard
- **Decision:** A feature is not complete merely because its UI renders. Verify persistence, authorization, business rules, cross-module effects, error handling, tests, and build as applicable.
- **Status:** Accepted.

## D-013 — Current architecture versus original plan
- **Decision:** `07_Technical_Architecture_Current.md` describes the implementation snapshot; `07_Technical_Architecture_Original_Plan.md` is historical context only.
- **Status:** Accepted.
- **Caution:** The current-architecture file was last recorded as a static inspection on 2026-10-17 and must be checked against the active repository.

## How to add a decision

Use:
- ID:
- Date:
- Decision:
- Reason:
- Status: `PROPOSED` / `ACCEPTED` / `SUPERSEDED`
- Affected docs/modules:
- Supersedes: (if any)

Do not turn an unapproved suggestion into an accepted decision.
