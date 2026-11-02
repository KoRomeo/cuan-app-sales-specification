import { NextResponse } from "next/server"
import { and, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { orderItems, orders, products, purchaseItems, purchases } from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"

type Context = { params: Promise<{ productId: string }> }

export async function GET(request: Request, { params }: Context) {
  try {
    const { productId } = await params
    const businessId = new URL(request.url).searchParams.get("businessId")
    if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const [product] = await db.select({ id: products.id, name: products.name }).from(products)
      .where(and(eq(products.id, productId), eq(products.businessId, businessId))).limit(1)
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 })

    const [purchaseRows, orderRows] = await Promise.all([
      db.select({ id: purchases.id, date: purchases.date, createdAt: purchases.createdAt, qty: purchaseItems.qty, unitCost: purchaseItems.unitCost, discount: purchaseItems.discount, discountType: purchaseItems.discountType, status: purchases.status })
        .from(purchaseItems).innerJoin(purchases, eq(purchases.id, purchaseItems.purchaseId))
        .where(and(eq(purchaseItems.productId, productId), eq(purchases.businessId, businessId)))
        .orderBy(desc(purchases.date)),
      db.select({ id: orders.id, date: orders.date, createdAt: orders.createdAt, qty: orderItems.qty, price: orderItems.price, discount: orderItems.discount, discountType: orderItems.discountType, status: orders.status })
        .from(orderItems).innerJoin(orders, eq(orders.id, orderItems.orderId))
        .where(and(eq(orderItems.productId, productId), eq(orders.businessId, businessId)))
        .orderBy(desc(orders.date)),
    ])

    const events = [
      ...purchaseRows.map((row) => {
        const gross = Number(row.qty) * Number(row.unitCost)
        const discount = row.discountType === "percent" ? gross * Number(row.discount) / 100 : Number(row.discount)
        const total = Math.max(0, gross - discount)
        return { type: "purchase" as const, id: row.id, date: row.date, createdAt: row.createdAt, qty: Number(row.qty), unitPrice: Number(row.unitCost), total, status: row.status }
      }),
      ...orderRows.map((row) => {
        const gross = Number(row.qty) * Number(row.price)
        const discount = row.discountType === "percent" ? gross * Number(row.discount) / 100 : Number(row.discount)
        return { type: "order" as const, id: row.id, date: row.date, createdAt: row.createdAt, qty: Number(row.qty), unitPrice: Number(row.price), total: Math.max(0, gross - discount), status: row.status }
      }),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ product, events })
  } catch (error) {
    console.error("Failed to fetch product stock history", error)
    return NextResponse.json({ error: "Failed to fetch product stock history" }, { status: 500 })
  }
}
