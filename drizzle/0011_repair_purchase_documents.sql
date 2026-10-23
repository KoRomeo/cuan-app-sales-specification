CREATE TABLE IF NOT EXISTS "purchase_documents" (
  "id" text PRIMARY KEY NOT NULL,
  "business_id" text NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "uploaded_by" text NOT NULL,
  "file_name" text NOT NULL,
  "mime_type" text NOT NULL,
  "file_size" integer NOT NULL,
  "blob_pathname" text NOT NULL,
  "status" text DEFAULT 'queued' NOT NULL,
  "target_type" text DEFAULT 'purchase' NOT NULL,
  "extracted_data" jsonb,
  "confidence" integer,
  "review_issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "purchase_id" text REFERENCES "purchases"("id") ON DELETE SET NULL,
  "error_message" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "confirmed_at" timestamp with time zone
);
CREATE INDEX IF NOT EXISTS "purchase_documents_business_created_idx" ON "purchase_documents" ("business_id", "created_at");
CREATE INDEX IF NOT EXISTS "purchase_documents_status_idx" ON "purchase_documents" ("business_id", "status");
