ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "discount_type" text NOT NULL DEFAULT 'amount';
ALTER TABLE "purchase_items" ADD COLUMN IF NOT EXISTS "discount" numeric(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "purchase_items" ADD COLUMN IF NOT EXISTS "discount_type" text NOT NULL DEFAULT 'amount';
