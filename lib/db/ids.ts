import { and, desc, eq, like, sql } from "drizzle-orm"
import { deliveries, deliveryOrders, orders } from "./schema"

/**
 * Generate a readable entity ID while holding a transaction-scoped PostgreSQL
 * advisory lock. Call only from inside the same transaction that inserts the row.
 *
 * Monthly format: PREFIX-YYYYMM-0001
 * Yearly format (customers): PREFIX-YYYY-0001
 */
export async function generateEntityId(
  tx: any,
  table: any,
  businessId: string,
  prefix: string,
  dateValue: string,
  period: "month" | "year" = "month",
): Promise<string> {
  const date = new Date(`${dateValue}T00:00:00.000Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue) || Number.isNaN(date.getTime())) {
    throw new Error("INVALID_ID_DATE")
  }

  const periodKey = period === "year"
    ? dateValue.slice(0, 4)
    : dateValue.slice(0, 7).replace("-", "")
  const lockKey = `cuanapp:id:${prefix}:${periodKey}`

  // Serializes concurrent ID generation for the same business/entity/period.
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`)

  const pattern = `${prefix}-${periodKey}-%`
  // Primary keys are globally unique, so sequence lookup must also be global.
  // Scoping the sequence by business can generate the same ID in two businesses
  // and make the second insert fail with a misleading "already exists" error.
  const [latest] = prefix === "DEL"
    ? await tx
        .select({ id: deliveries.id })
        .from(deliveries)
        .where(like(deliveries.id, pattern))
        .orderBy(desc(deliveries.id))
        .limit(1)
    : await tx
        .select({ id: table.id })
        .from(table)
        .where(like(table.id, pattern))
        .orderBy(desc(table.id))
        .limit(1)

  const latestNumber = latest?.id?.match(/-(\d{4})$/)
  const next = latestNumber ? Number(latestNumber[1]) + 1 : 1
  if (next > 9999) throw new Error("ID_SEQUENCE_EXHAUSTED")
  return `${prefix}-${periodKey}-${String(next).padStart(4, "0")}`
}
