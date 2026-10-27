import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import * as schema from "./schema"

// pg v8 (pg-connection-string) treats sslmode=require/prefer/verify-ca as
// verify-full today but warns about it; in v9 they adopt weaker libpq semantics.
// We pin the connection to verify-full explicitly to keep the current
// (strongest) behavior and silence the deprecation warning.
function withExplicitSslMode(url: string | undefined): string | undefined {
  if (!url) return url
  try {
    const parsed = new URL(url)
    const mode = parsed.searchParams.get("sslmode")
    if (!mode || ["prefer", "require", "verify-ca"].includes(mode)) {
      parsed.searchParams.set("sslmode", "verify-full")
    }
    return parsed.toString()
  } catch {
    return url
  }
}

const globalForDb = globalThis as unknown as { pool?: Pool }
const pool = globalForDb.pool ?? new Pool({ connectionString: withExplicitSslMode(process.env.DATABASE_URL), max: 5 })
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool

export const db = drizzle(pool, { schema })
export { pool }
