ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'active';
