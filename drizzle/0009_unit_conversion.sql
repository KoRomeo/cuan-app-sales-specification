ALTER TYPE "public"."movement_type" ADD VALUE IF NOT EXISTS 'unit';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "unit_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"big_product_id" text NOT NULL,
	"small_product_id" text NOT NULL,
	"ratio" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"note" text,
	"date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unit_rules_ratio_positive" CHECK ("ratio" > 0),
	CONSTRAINT "unit_rules_products_differ" CHECK ("big_product_id" <> "small_product_id")
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "unit_operations" (
	"id" text PRIMARY KEY NOT NULL,
	"business_id" text NOT NULL,
	"rule_id" text NOT NULL,
	"type" text NOT NULL,
	"source_product_id" text NOT NULL,
	"target_product_id" text NOT NULL,
	"qty_out" integer NOT NULL,
	"qty_in" integer NOT NULL,
	"value_moved" numeric(14, 2) NOT NULL,
	"note" text,
	"date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unit_operations_type_valid" CHECK ("type" IN ('split','combine')),
	CONSTRAINT "unit_operations_qty_out_positive" CHECK ("qty_out" > 0),
	CONSTRAINT "unit_operations_qty_in_positive" CHECK ("qty_in" > 0)
);--> statement-breakpoint
ALTER TABLE "unit_rules" ADD CONSTRAINT "unit_rules_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_rules" ADD CONSTRAINT "unit_rules_big_product_id_products_id_fk" FOREIGN KEY ("big_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_rules" ADD CONSTRAINT "unit_rules_small_product_id_products_id_fk" FOREIGN KEY ("small_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_operations" ADD CONSTRAINT "unit_operations_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_operations" ADD CONSTRAINT "unit_operations_rule_id_unit_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."unit_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_operations" ADD CONSTRAINT "unit_operations_source_product_id_products_id_fk" FOREIGN KEY ("source_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_operations" ADD CONSTRAINT "unit_operations_target_product_id_products_id_fk" FOREIGN KEY ("target_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "unit_rules_business_idx" ON "unit_rules" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "unit_operations_rule_idx" ON "unit_operations" USING btree ("rule_id");
