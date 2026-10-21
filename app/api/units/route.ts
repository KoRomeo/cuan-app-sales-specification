import { NextResponse } from "next/server"
import { and, asc, eq, inArray, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { products, stockMovements } from "@/lib/db/schema"
import { unitRules, unitOperations } from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"
import { generateEntityId } from "@/lib/db/ids"
import { writeAudit } from "@/lib/audit"
import { validateRuleInput, UnitConversionError, type UnitRuleInput } from "@/lib/units/logic"
import { stockByProduct, unitFailure } from "@/lib/units/server"

const isDate = (v: unknown): v is string =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`))

export async function GET(request: Request) {
  try {
    const businessId = new URL(request.url).searchParams.get("businessId")
    if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const rules = await db.select().from(unitRules).where(eq(unitRules.businessId, businessId)).orderBy(asc(unitRules.id))
    const productIds = [...new Set(rules.flatMap((r) => [r.bigProductId, r.smallProductId]))]
    const productRows = productIds.length
      ? await db.select({ id: products.id, name: products.name }).from(products)
          .where(and(eq(products.businessId, businessId), inArray(products.id, productIds)))
      : []
    const names = new Map(productRows.map((p) => [p.id, p.name]))
    const stock = await stockByProduct(db, businessId, productIds)
    const opCounts = await db.select({ ruleId: unitOperations.ruleId, count: sql<number>`count(*)` })
      .from(unitOperations).where(eq(unitOperations.businessId, businessId)).groupBy(unitOperations.ruleId)
    const counts = new Map(opCounts.map((c) => [c.ruleId, Number(c.count)]))
    const month = new Date().toISOString().slice(0, 7)
    const opsThisMonth = await db.select({ count: sql<number>`count(*)` }).from(unitOperations)
      .where(and(eq(unitOperations.businessId, businessId), sql`to_char(${unitOperations.date}, 'YYYY-MM') = ${month}`))

    return NextResponse.json({
      rules: rules.map((r) => ({
        id: r.id,
        bigProductId: r.bigProductId,
        bigProductName: names.get(r.bigProductId) ?? r.bigProductId,
        smallProductId: r.smallProductId,
        smallProductName: names.get(r.smallProductId) ?? r.smallProductId,
        ratio: r.ratio,
        status: r.status,
        note: r.note,
        date: r.date,
        bigStock: stock.get(r.bigProductId) ?? 0,
        smallStock: stock.get(r.smallProductId) ?? 0,
        operationCount: counts.get(r.id) ?? 0,
      })),
      summary: {
        totalRules: rules.length,
        activeRules: rules.filter((r) => r.status === "active").length,
        operationsThisMonth: Number(opsThisMonth[0]?.count ?? 0),
        productsInvolved: productIds.length,
      },
    })
  } catch (error) {
    console.error("Failed to fetch units", error)
    return NextResponse.json({ error: "Failed to fetch units" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { businessId, bigProductId, smallProductId, ratio, note = "", date = new Date().toISOString().slice(0, 10) } = body ?? {}
    if (typeof businessId !== "string" || !businessId.trim()) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    if (!isDate(date)) return NextResponse.json({ error: "date must use YYYY-MM-DD format" }, { status: 400 })
    const input: UnitRuleInput = { bigProductId, smallProductId, ratio }
    try { validateRuleInput(input) } catch (e) { return unitFailure(e) }

    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const created = await db.transaction(async (tx) => {
      const found = await tx.select({ id: products.id }).from(products)
        .where(and(eq(products.businessId, businessId), inArray(products.id, [bigProductId, smallProductId])))
      if (found.length !== 2) throw new UnitConversionError("PRODUCT_NOT_FOUND", "One or more products were not found for this business.")

      // One rule per product pair (either direction) so conversions never conflict.
      const existing = await tx.select({ id: unitRules.id }).from(unitRules).where(and(
        eq(unitRules.businessId, businessId),
        inArray(unitRules.bigProductId, [bigProductId, smallProductId]),
        inArray(unitRules.smallProductId, [bigProductId, smallProductId]),
      )).limit(1)
      if (existing.length) throw new UnitConversionError("RULE_EXISTS", "A unit rule for these two products already exists.")

      const id = await generateEntityId(tx, unitRules, businessId, "UNT", date)
      const [row] = await tx.insert(unitRules).values({
        id, businessId, bigProductId, smallProductId, ratio, status: "active", note: String(note).trim() || null, date,
      }).returning()
      return row
    })

    await writeAudit({ businessId, page: "Units", action: "Created unit rule", reference: created.id })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return unitFailure(error)
  }
}
