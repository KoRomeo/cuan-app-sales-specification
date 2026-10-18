CREATE TABLE IF NOT EXISTS "financial_accounts" (
  "id" text PRIMARY KEY NOT NULL,
  "business_id" text NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "opening_balance" numeric(14,2) DEFAULT '0' NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "financial_accounts_business_name_idx" ON "financial_accounts" ("business_id", "name");
