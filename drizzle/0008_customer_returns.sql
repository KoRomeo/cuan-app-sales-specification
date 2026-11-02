CREATE TABLE IF NOT EXISTS "returns" (
  "id" text PRIMARY KEY NOT NULL,
  "business_id" text NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "order_id" text NOT NULL REFERENCES "orders"("id"),
  "date" date NOT NULL,
  "stock_returned" boolean DEFAULT false NOT NULL,
  "refund_amount" numeric(14,2) DEFAULT '0' NOT NULL,
  "notes" text,
  "total" numeric(14,2) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "return_items" (
  "id" text PRIMARY KEY NOT NULL,
  "return_id" text NOT NULL REFERENCES "returns"("id") ON DELETE CASCADE,
  "product_id" text NOT NULL REFERENCES "products"("id"),
  "qty" integer NOT NULL,
  "price" numeric(14,2) NOT NULL
);
