ALTER TABLE "purchase_documents"
  ADD COLUMN IF NOT EXISTS "preview_blob_pathname" text,
  ADD COLUMN IF NOT EXISTS "preview_file_size" integer;
