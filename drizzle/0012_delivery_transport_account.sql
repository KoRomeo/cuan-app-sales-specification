ALTER TABLE "deliveries" ADD COLUMN IF NOT EXISTS "transport_account" text NOT NULL DEFAULT 'Cash';
