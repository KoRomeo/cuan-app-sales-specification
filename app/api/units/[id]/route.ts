import { NextResponse } from "next/server"
import { and, desc, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { products } from "@/lib/db/schema"
import { unitRules, unitOperations } from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"
import { UnitConversionError } from "@/lib/units/logic"
import { stockByProduct, unitFailure } from "@/lib/units/server"

type Context = { params: Promise<{ id: string }> }

async function loadRule(businessId: string, id: string) {
  const [rule] = await db.select().from(unitRules)
    .where(and(eq(unitRules.id, id), eq(unitRules.businessId, businessId))).limit(1)
  return rule ?? null
}

async function countOperations(businessId: string, ruleId: string) {
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(unitOperations)
    .where(and(eq(unitOperations.businessId, businessId), eq(unitOperations.ruleId, ruleId)))
  return Number(row?.count ?? 0)
}

export async function GET(request: Request, { params }: Context) {
  try {
    const { id } = await params
    const businessId = new URL(request.url).searchParams.get("businessId")
    if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const rule = await loadRule(businessId, id)
    if (!rule) return NextResponse.json({ error: "Unit rule not found" }, { status: 404 })
    const productRows = await db.select({ id: products.id, name: products.name, averageCost: products.averageCost })
      .from(products).where(and(eq(products.businessId, businessId)))
    const big = productRows.find((p) => p.id === rule.bigProductId)
    const small = productRows.find((p) => p.id === rule.smallProductId)
    const stock = await stockByProduct(db, businessId, [rule.bigProductId, rule.smallProductId])
    const operations = await db.select().from(unitOperations)
      .where(and(eq(unitOperations.businessId, businessId), eq(unitOperations.ruleId, rule.id)))
      .orderBy(desc(unitOperations.createdAt))

    return NextResponse.json({
      ...rule,
      big: { id: rule.bigProductId, name: big?.name ?? rule.bigProductId, stock: stock.get(rule.bigProductId) ?? 0, averageCost: Number(big?.averageCost ?? 0) },
      small: { id: rule.smallProductId, name: small?.name ?? rule.smallProductId, stock: stock.get(rule.smallProductId) ?? 0, averageCost: Number(small?.averageCost ?? 0) },
      operations,
    })
  } catch (error) {
    console.error("Failed to fetch unit rule", error)
    return NextResponse.json({ error: "Failed to fetch unit rule" }, { status: 500 })
  }
}

// Ratio and products are locked once the rule has operations (history must not change meaning).
// Only status and note can change after use.
export async function PATCH(request: Request, { params }: Context) {
  try {
    const { id } = await params
    const body = await request.json()
    const { businessId, status, note, ratio, bigProductId, smallProductId } = body ?? {}
    if (typeof businessId !== "string" || !businessId.trim()) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    if (status !== undefined && !["active", "inactive"].includes(status)) return NextResponse.json({ error: "status must be active or inactive" }, { status: 400 })
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const rule = await loadRule(businessId, id)
    if (!rule) return NextResponse.json({ error: "Unit rule not found" }, { status: 404 })

    const structural = (ratio !== undefined && ratio !== rule.ratio) ||
      (bigProductId !== undefined && bigProductId !== rule.bigProductId) ||
      (smallProductId !== undefined && smallProductId !== rule.smallProductId)
    if (structural && await countOperations(businessId, rule.id) > 0) {
      return unitFailure(new UnitConversionError("RULE_IN_USE", "This rule has been used. Ratio and products cannot be changed; deactivate it instead."))
    }
    if (structural) {
      // Only allowed while unused. Re-validate through the same rules as POST.
      if (ratio !== undefined && (!Number.isInteger(ratio) || ratio <= 0)) return NextResponse.json({ error: "Quantity must be a whole number greater than 0." }, { status: 400 })
    }

    const [updated] = await db.update(unitRules).set({
      ...(status !== undefined ? { status } : {}),
      ...(note !== undefined ? { note: String(note).trim() || null } : {}),
      ...(structural ? { ratio: ratio ?? rule.ratio, bigProductId: bigProductId ?? rule.bigProductId, smallProductId: smallProductId ?? rule.smallProductId } : {}),
    }).where(and(eq(unitRules.id, rule.id), eq(unitRules.businessId, businessId))).returning()

    await writeAudit({ businessId, page: "Units", action: "Updated unit rule", reference: rule.id })
    return NextResponse.json(updated)
  } catch (error) {
    return unitFailure(error)
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const { id } = await params
    const businessId = new URL(request.url).searchParams.get("businessId")
    if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const rule = await loadRule(businessId, id)
    if (!rule) return NextResponse.json({ error: "Unit rule not found" }, { status: 404 })
    if (await countOperations(businessId, rule.id) > 0) {
      return unitFailure(new UnitConversionError("RULE_IN_USE", "This rule has been used and cannot be deleted. Deactivate it instead."))
    }
    await db.delete(unitRules).where(and(eq(unitRules.id, rule.id), eq(unitRules.businessId, businessId)))
    await writeAudit({ businessId, page: "Units", action: "Deleted unit rule", reference: rule.id })
    return NextResponse.json({ message: "Unit rule deleted" })
  } catch (error) {
    return unitFailure(error)
  }
}
