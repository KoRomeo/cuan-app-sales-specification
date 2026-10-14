import { NextResponse } from "next/server"
import { and, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { orders, products, replacements } from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"
import { generateEntityId } from "@/lib/db/ids"

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

export async function GET(request: Request) {
  try {
    const businessId = new URL(request.url).searchParams.get("businessId")
    if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const rows = await db.select().from(replacements).where(eq(replacements.businessId, businessId)).orderBy(desc(replacements.date))
    return NextResponse.json(rows)
  } catch (error) {
    console.error("GET /api/replacements", error)
    return NextResponse.json({ error: "Failed to fetch replacements" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { businessId, date, orderId, productId, qty, reason } = body ?? {}
    if (typeof businessId !== "string" || !businessId.trim() || !validDate(date) ||
        typeof orderId !== "string" || !orderId.trim() ||
        typeof productId !== "string" || !productId.trim() ||
        !Number.isSafeInteger(qty) || qty <= 0 ||
        typeof reason !== "string" || !reason.trim()) {
      return NextResponse.json({ error: "Valid business, date, order, product, quantity and reason are required" }, { status: 400 })
    }
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const replacement = await db.transaction(async (tx) => {
      const [order] = await tx.select({ id: orders.id }).from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.businessId, businessId))).limit(1)
      if (!order) throw new Error("ORDER_NOT_FOUND")
      const [product] = await tx.select({ id: products.id }).from(products)
        .where(and(eq(products.id, productId), eq(products.businessId, businessId))).limit(1)
      if (!product) throw new Error("PRODUCT_NOT_FOUND")
      const id = await generateEntityId(tx, replacements, businessId, "RPL", date)
      const [created] = await tx.insert(replacements).values({
        id, businessId, date, orderId, productId, qty, reason: reason.trim(), delivered: false,
      }).returning()
      return created
    })
    return NextResponse.json(replacement, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    if (message === "ORDER_NOT_FOUND") return NextResponse.json({ error: "Order not found for this business" }, { status: 404 })
    if (message === "PRODUCT_NOT_FOUND") return NextResponse.json({ error: "Product not found for this business" }, { status: 404 })
    console.error("POST /api/replacements", error)
    return NextResponse.json({ error: "Failed to create replacement" }, { status: 500 })
  }
}
