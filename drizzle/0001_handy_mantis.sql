ALTER TABLE "customers" ALTER COLUMN "location" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "address" text;