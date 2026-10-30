import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { orderItems, products, purchaseItems, stockMovements, replacements, returnItems, unitRules, unitOperations } from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"
import { eq, or } from "drizzle-orm"

async function getOwnedProduct(id: string) {
  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1)
  return product
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const product = await getOwnedProduct((await params).id)
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 })
    const access = await requireBusinessAccess(product.businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    return NextResponse.json(product)
  } catch (error) {
    console.error("Failed to fetch product", error)
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id
    const existing = await getOwnedProduct(id)
    if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 })
    const access = await requireBusinessAccess(existing.businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const body = await request.json()
    if (body.averageCost !== undefined) {
      return NextResponse.json({ error: "averageCost is calculated from inventory movements and cannot be edited directly" }, { status: 400 })
    }
    const updates: Partial<typeof products.$inferInsert> = {}
    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) return NextResponse.json({ error: "name must be a non-empty string" }, { status: 400 })
      updates.name = body.name.trim()
    }
    for (const field of ["sellingPrice", "costReference"] as const) {
      if (body[field] !== undefined) {
        if (typeof body[field] !== "number" || !Number.isFinite(body[field]) || body[field] < 0) return NextResponse.json({ error: `${field} must be a non-negative number` }, { status: 400 })
        updates[field] = String(body[field])
      }
    }
    if (body.minimumStock !== undefined) {
      if (!Number.isInteger(body.minimumStock) || body.minimumStock < 0) return NextResponse.json({ error: "minimumStock must be a non-negative integer" }, { status: 400 })
      updates.minimumStock = body.minimumStock
    }
    const [product] = await db.update(products).set(updates).where(eq(products.id, id)).returning()
    return NextResponse.json(product)
  } catch (error) {
    console.error("Failed to update product", error)
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const existing = await getOwnedProduct((await params).id)
    if (!existing) return NextResponse.json({ error: "Product not found" }, { status: 404 })
    const access = await requireBusinessAccess(existing.businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const deleted = await db.transaction(async (tx) => {
      const [orderReference] = await tx.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.productId, existing.id)).limit(1)
      const [purchaseReference] = await tx.select({ id: purchaseItems.id }).from(purchaseItems).where(eq(purchaseItems.productId, existing.id)).limit(1)
      const [replacementReference] = await tx.select({ id: replacements.id }).from(replacements).where(eq(replacements.productId, existing.id)).limit(1)
      const [returnReference] = await tx.select({ id: returnItems.id }).from(returnItems).where(eq(returnItems.productId, existing.id)).limit(1)
      const [unitRuleReference] = await tx.select({ id: unitRules.id }).from(unitRules)
        .where(or(eq(unitRules.bigProductId, existing.id), eq(unitRules.smallProductId, existing.id))).limit(1)
      const [unitOperationReference] = await tx.select({ id: unitOperations.id }).from(unitOperations)
        .where(or(eq(unitOperations.sourceProductId, existing.id), eq(unitOperations.targetProductId, existing.id))).limit(1)
      const movements = await tx.select({
        id: stockMovements.id,
        type: stockMovements.type,
        reference: stockMovements.reference,
      }).from(stockMovements).where(eq(stockMovements.productId, existing.id))

      const hasBusinessHistory = Boolean(
        orderReference || purchaseReference || replacementReference || returnReference ||
        unitRuleReference || unitOperationReference
      )
      const setupOnlyMovements = movements.every(
        (movement) => movement.type === "opening" && movement.reference === `opening:${existing.id}`
      )

      if (hasBusinessHistory || !setupOnlyMovements) return false

      // An opening movement is part of initial product setup, not a completed
      // purchase/order. It may be removed together with an otherwise unused product.
      if (movements.length > 0) {
        await tx.delete(stockMovements).where(eq(stockMovements.productId, existing.id))
      }
      await tx.delete(products).where(eq(products.id, existing.id))
      return true
    })

    if (!deleted) {
      return NextResponse.json({
        error: "This product has transaction or stock history and cannot be deleted. Deactivate it to preserve its records.",
      }, { status: 409 })
    }
    return NextResponse.json({ message: "Product deleted successfully", product: existing })
  } catch (error) {
    console.error("Failed to delete product", error)
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 })
  }
}
