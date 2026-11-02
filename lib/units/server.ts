import { NextResponse } from "next/server"
import { and, eq, inArray, sql } from "drizzle-orm"
import type { db as Db } from "@/lib/db"
import { stockMovements } from "@/lib/db/schema"
import { UnitConversionError } from "@/lib/units/logic"

export async function stockByProduct(executor: Pick<typeof Db, "select">, businessId: string, productIds: string[]) {
  const map = new Map<string, number>()
  if (!productIds.length) return map
  const rows = await executor
    .select({ productId: stockMovements.productId, stock: sql<number>`coalesce(sum(${stockMovements.qty}), 0)` })
    .from(stockMovements)
    .where(and(eq(stockMovements.businessId, businessId), inArray(stockMovements.productId, productIds)))
    .groupBy(stockMovements.productId)
  for (const row of rows) map.set(row.productId, Number(row.stock))
  return map
}

export function unitFailure(error: unknown) {
  if (error instanceof UnitConversionError) {
    const status = error.code === "RULE_NOT_FOUND" ? 404 : error.code === "INSUFFICIENT_STOCK" || error.code === "RULE_INACTIVE" ? 409 : 400
    return NextResponse.json({ error: error.message, code: error.code }, { status })
  }
  console.error("Unit operation failed", error)
  return NextResponse.json({ error: "Unit operation failed" }, { status: 500 })
}

