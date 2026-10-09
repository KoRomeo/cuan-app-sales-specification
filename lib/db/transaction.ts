import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

const globalForPool = globalThis as unknown as {
pool?: Pool;
};

const pool =
globalForPool.pool ??
new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
});

if (process.env.NODE_ENV !== "production") {
globalForPool.pool = pool;
}

export const transactionDb = drizzle(pool);