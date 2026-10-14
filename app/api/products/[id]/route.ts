import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { orderItems, products, purchaseItems, stockMovements } from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"
import { eq } from "drizzle-orm"

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
    const updates: Partial<typeof products.$inferInsert> = {}
    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) return NextResponse.json({ error: "name must be a non-empty string" }, { status: 400 })
      updates.name = body.name.trim()
    }
    for (const field of ["sellingPrice", "costReference", "averageCost"] as const) {
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
    const [orderReference] = await db.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.productId, existing.id)).limit(1)
    const [purchaseReference] = await db.select({ id: purchaseItems.id }).from(purchaseItems).where(eq(purchaseItems.productId, existing.id)).limit(1)
    const [movementReference] = await db.select({ id: stockMovements.id }).from(stockMovements).where(eq(stockMovements.productId, existing.id)).limit(1)
    if (orderReference || purchaseReference || movementReference) {
      return NextResponse.json({ error: "This product has transaction or stock history and cannot be deleted." }, { status: 409 })
    }
    const [product] = await db.delete(products).where(eq(products.id, existing.id)).returning()
    return NextResponse.json({ message: "Product deleted successfully", product })
  } catch (error) {
    console.error("Failed to delete product", error)
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 })
  }
}
