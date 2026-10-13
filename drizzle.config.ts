import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env.development.local" });

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
