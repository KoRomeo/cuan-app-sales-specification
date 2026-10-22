# CuanApp — Recovery Notes

> Use only when recovering from a known failure. Add new entries at the end.

## Drizzle migration snapshot chain is incomplete (2026-10-21)

- Symptom: `drizzle-kit generate` emits CREATE TABLE for tables that already exist (`financial_accounts`, `returns`, `delivery_orders`).
- Cause: `drizzle/meta` has snapshots only through `0003` (plus `0009`). Migrations `0005` and `0008` use `IF NOT EXISTS`.
- Workaround: write migration SQL by hand, limited to the change. Before running on the app database, apply all migrations to a fresh database and confirm they pass.

## DATABASE_URL in the terminal overrides .env (2026-10-21)

- Symptom: `getaddrinfo ENOTFOUND base`, or `password authentication failed` after a password reset.
- Cause: a `$env:DATABASE_URL` set earlier in the same PowerShell session takes precedence over `.env.development.local`.
- Fix: `Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue`, then restart `pnpm dev`.

## Credentials exposed in chat (2026-10-21)

- A full Neon connection string with password was pasted in chat. The password was rotated.
- Rule: never paste connection strings or tokens in chat. Share only host and database name.
