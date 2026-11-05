CREATE TABLE IF NOT EXISTS "notifications" (
  "id" text PRIMARY KEY NOT NULL,
  "business_id" text NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL,
  "fingerprint" text NOT NULL,
  "kind" text NOT NULL,
  "entity_id" text,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "href" text NOT NULL,
  "priority" text DEFAULT 'info' NOT NULL,
  "is_read" boolean DEFAULT false NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "resolved_at" timestamptz
);
CREATE INDEX IF NOT EXISTS "notifications_business_user_created_idx"
  ON "notifications" ("business_id", "user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "notifications_business_user_active_idx"
  ON "notifications" ("business_id", "user_id", "resolved_at");
