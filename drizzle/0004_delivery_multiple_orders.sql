ALTER TABLE "deliveries" ALTER COLUMN "order_id" DROP NOT NULL;
--> statement-breakpoint
CREATE TABLE "delivery_orders" (
  "delivery_id" text NOT NULL,
  "order_id" text NOT NULL,
  CONSTRAINT "delivery_orders_delivery_id_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "delivery_orders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_orders_delivery_order_idx" ON "delivery_orders" USING btree ("delivery_id","order_id");
--> statement-breakpoint
INSERT INTO "delivery_orders" ("delivery_id", "order_id")
SELECT "id", "order_id" FROM "deliveries" WHERE "order_id" IS NOT NULL
ON CONFLICT DO NOTHING;
