import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { products, stockMovements, journalEntries, journalEntryLines } from "@/lib/db/schema"
import { unitRules, unitOperations } from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"
import { generateEntityId } from "@/lib/db/ids"
import { writeAudit } from "@/lib/audit"
import { planUnitOperation, UnitConversionError, type UnitOperationType } from "@/lib/units/logic"
import { stockByProduct, unitFailure } from "@/lib/units/server"

type Context = { params: Promise<{ id: string }> }

const isDate = (v: unknown): v is string =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`))

// Append-only: operations are never edited or deleted. Corrections are new operations.
export async function POST(request: Request, { params }: Context) {
  try {
    const { id: ruleId } = await params
    const body = await request.json()
    const { businessId, type, quantity, note = "", date = new Date().toISOString().slice(0, 10) } = body ?? {}
    if (typeof businessId !== "string" || !businessId.trim()) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    if (type !== "split" && type !== "combine") return NextResponse.json({ error: "type must be split or combine" }, { status: 400 })
    if (!isDate(date)) return NextResponse.json({ error: "date must use YYYY-MM-DD format" }, { status: 400 })
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const result = await db.transaction(async (tx) => {
      const [rule] = await tx.select().from(unitRules)
        .where(and(eq(unitRules.id, ruleId), eq(unitRules.businessId, businessId))).limit(1)
      if (!rule) throw new UnitConversionError("RULE_NOT_FOUND", "Unit rule not found.")

      // Lock both product rows in a stable order (avoids deadlocks between concurrent operations).
      const lockOrder = [rule.bigProductId, rule.smallProductId].sort()
      for (const pid of lockOrder) {
        await tx.select({ id: products.id }).from(products)
          .where(and(eq(products.id, pid), eq(products.businessId, businessId))).for("update").limit(1)
      }
      const productRows = await tx.select({ id: products.id, averageCost: products.averageCost }).from(products)
        .where(and(eq(products.businessId, businessId)))
      const avg = (pid: string) => Number(productRows.find((p) => p.id === pid)?.averageCost ?? 0)
      const stock = await stockByProduct(tx, businessId, [rule.bigProductId, rule.smallProductId])

      const plan = planUnitOperation(
        rule,
        { productId: rule.bigProductId, stockQty: stock.get(rule.bigProductId) ?? 0, avgCost: avg(rule.bigProductId) },
        { productId: rule.smallProductId, stockQty: stock.get(rule.smallProductId) ?? 0, avgCost: avg(rule.smallProductId) },
        type as UnitOperationType,
        quantity,
      )

      const opId = await generateEntityId(tx, unitOperations, businessId, "UOP", date)
      const reference = `unit:${rule.id}:${opId}`
      const cleanNote = String(note).trim() || null

      // 1) Stock movements (stock is derived from these, so no separate stock column is touched).
      await tx.insert(stockMovements).values([
        { id: `SM-${opId}-OUT`, businessId, date, productId: plan.sourceProductId, type: "unit", qty: -plan.qtyOut, reference },
        { id: `SM-${opId}-IN`, businessId, date, productId: plan.targetProductId, type: "unit", qty: plan.qtyIn, reference },
      ])

      // 2) Moving average on the target only. Source average is unchanged by issuing stock.
      await tx.update(products)
        .set({ averageCost: plan.targetNewAvgCost.toFixed(2) })
        .where(and(eq(products.id, plan.targetProductId), eq(products.businessId, businessId)))

      // 3) Balanced journal: Dr Inventory (target), Cr Inventory (source). No revenue/COGS/cash.
      const jeId = `JE-UNIT-${opId}`
      await tx.insert(journalEntries).values({
        id: jeId, businessId, entryDate: date, kind: "unit", reference: opId,
        description: `Unit ${type} ${rule.id}`,
      })
      await tx.insert(journalEntryLines).values([
        { id: `${jeId}-in`, journalEntryId: jeId, account: "Inventory", debit: plan.valueMoved.toFixed(2), credit: "0" },
        { id: `${jeId}-out`, journalEntryId: jeId, account: "Inventory", debit: "0", credit: plan.valueMoved.toFixed(2) },
      ])

      // 4) Operation record (history).
      const [op] = await tx.insert(unitOperations).values({
        id: opId, businessId, ruleId: rule.id, type, sourceProductId: plan.sourceProductId,
        targetProductId: plan.targetProductId, qtyOut: plan.qtyOut, qtyIn: plan.qtyIn,
        valueMoved: plan.valueMoved.toFixed(2), note: cleanNote, date,
      }).returning()
      return op
    })

    await writeAudit({ businessId, page: "Units", action: `Unit ${type}`, reference: result.id })
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return unitFailure(error)
  }
}
