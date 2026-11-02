# CuanApp — Start Here

> Purpose: give any AI the smallest reliable entry point into this project. This file is the routing/index document, not a duplicate of the full specification.

## Read order

1. `00_README_START_HERE.md` — rules and source-of-truth map.
2. `08_Current_Project_Status.md` — what is known, broken, unverified, and next.
3. `11_Decision_Log.md` — binding product/business decisions.
4. `10_Progress_Log.md` — short chronological record of work.
5. Read only the relevant specification below for the task:
    - `01_Master_Specification.md` — broad product blueprint/archive.
    - `02_PRD_Product_and_Business_Rules.md` — product behavior and business rules.
    - `03_Information_Architecture_and_User_Flows.md` — navigation and user journeys.
    - `04_ERD_and_Database_Schema.md` — conceptual/archive schema; verify against actual code.
    - `05_Screen_and_Component_Specifications.md` — screen-level UI requirements.
    - `06_Design_System_and_UI_Direction.md` — visual and interaction direction.
    - `07_Technical_Architecture_Current.md` — current implementation architecture, last inspected 2026-10-17.
    - `07_Technical_Architecture_Original_Plan.md` — historical proposal only.
    - `09_Recovery_Notes.md` — use only when recovering from a known failure.

## Mandatory working protocol

Before changing code:

1. Confirm repository, active branch, working tree, latest commit, and relevant files. Do not assume old branch names or commit hashes are current.
2. Classify the task as a requirement change, bug fix, or technical migration.
3. Trace the real flow: UI → API → validation/authorization → database transaction → derived effects → reports/history.
4. Compare requirements with implementation. A requirement document is not proof that code exists or works.
5. Make the smallest safe change; preserve working behavior.

Before calling a task complete:

- Verify persistence, business rules, affected modules, error states, and edge cases.
- Run relevant tests, TypeScript checks, schema/migration checks, and production build where feasible.
- State exactly what was changed and what was actually verified. Never claim a test, commit, push, or deployment succeeded unless confirmed.

## Source-of-truth hierarchy

For **what the product should do**:

1. Latest explicit user decision recorded in `11_Decision_Log.md`.
2. `02_PRD_Product_and_Business_Rules.md`.
3. Other product specification files.
4. Ask one focused question only if a material ambiguity remains.

For **what the code currently does**:

1. Actual checked-out source code, schema, migrations, tests, and runtime evidence.
2. `07_Technical_Architecture_Current.md` (snapshot, not live truth).
3. `08_Current_Project_Status.md` (status notes may become stale).
4. Never use the original architecture plan as proof of current implementation.

If sources conflict, do not silently choose. Report the conflict and update the relevant decision/status file after resolution.

## Core implementation principles

- End-to-end: real database persistence, not UI-only behavior or mock data.
- Integrated: update every affected module consistently.
- Correct: validate calculations, state transitions, and edge cases.
- Bilingual: English and Indonesian across all user-facing UI.
- Complete: inspect dependencies and verify; do not stop when a page merely looks finished.
- Safe: validate session, business membership, and business ownership of linked records.
- Atomic: use database transactions when one operation changes multiple related records.
- No fake success: clearly distinguish implemented, tested, committed, pushed, and deployed.

## Task handoff template

When starting a task, summarize in 3–5 lines:

- Goal:
- Relevant files/modules:
- Current observed behavior:
- Intended behavior / governing decision:
- Verification plan:

After work, update `08_Current_Project_Status.md` if status/blockers changed, append a concise entry to `10_Progress_Log.md`, and add to `11_Decision_Log.md` only if a new decision was explicitly made.

## Keep context efficient

Do not paste every document into every prompt. Give the AI this file first, then the current status and decision log; ask it to open only the relevant specification/code. Keep progress as dated bullets and decisions as short, numbered records. Do not copy the full master specification into status or progress notes.