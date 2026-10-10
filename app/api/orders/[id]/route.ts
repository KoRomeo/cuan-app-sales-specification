import { and, eq, sql } from "drizzle-orm"
import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { businessMembers, customers, deliveries, orderItems, orders, payments, products, replacements, stockMovements } from "@/lib/db/schema"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1)
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })
  const [member] = await db.select({ role: businessMembers.role }).from(businessMembers).where(and(eq(businessMembers.businessId, order.businessId), eq(businessMembers.userId, session.user.id))).limit(1)
  if (!member) return NextResponse.json({ error: "Order not found" }, { status: 404 })

  const [[customer], itemRows, paymentRows, [delivery], replacementRows] = await Promise.all([
    db.select({ id: customers.id, name: customers.name, phone: customers.phone, address: customers.address }).from(customers).where(and(eq(customers.id, order.customerId), eq(customers.businessId, order.businessId))).limit(1),
    db.select({ id: orderItems.id, productId: orderItems.productId, qty: orderItems.qty, price: orderItems.price, discount: orderItems.discount, unitCost: orderItems.unitCost }).from(orderItems).where(eq(orderItems.orderId, id)),
    db.select({ id: payments.id, date: payments.date, amount: payments.amount, account: payments.account }).from(payments).where(and(eq(payments.orderId, id), eq(payments.businessId, order.businessId))),
    db.select({ id: deliveries.id, date: deliveries.date, method: deliveries.method, recipient: deliveries.recipient, address: deliveries.address, transportCost: deliveries.transportCost }).from(deliveries).where(eq(deliveries.orderId, id)).limit(1),
    db.select({ id: replacements.id, date: replacements.date, productId: replacements.productId, qty: replacements.qty, reason: replacements.reason, delivered: replacements.delivered }).from(replacements).where(and(eq(replacements.orderId, id), eq(replacements.businessId, order.businessId))),
  ])
  const productRows = itemRows.length ? await db.select({ id: products.id, name: products.name, averageCost: products.averageCost, stock: sql<number>`coalesce(sum(${stockMovements.qty}), 0)` }).from(products).leftJoin(stockMovements, and(eq(stockMovements.productId, products.id), eq(stockMovements.businessId, order.businessId))).where(eq(products.businessId, order.businessId)).groupBy(products.id) : []
  return NextResponse.json({ ...order, customer: customer ?? null, items: itemRows, products: productRows, payments: paymentRows, delivery: delivery ?? null, replacements: replacementRows })
}
