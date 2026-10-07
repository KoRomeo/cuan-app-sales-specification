import { neon } from "@neondatabase/serverless";

async function main() {
const sql = neon(process.env.DATABASE_URL!);

const result = await sql`SELECT 1 AS connected`;

console.log("Neon connection successful:", result);
}

main().catch((error) => {
console.error("Neon connection failed:", error);
process.exit(1);
});