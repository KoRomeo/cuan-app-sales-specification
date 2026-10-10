import { NextResponse } from "next/server"
import { and, eq, inArray, sql, desc } from "drizzle-orm"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { businessMembers, deliveries, orderItems, orders, products, stockMovements } from "@/lib/db/schema"
import { headers } from "next/headers"

async function access(businessId: string) { const session = await auth.api.getSession({ headers: await headers() }); if (!session?.user) return { ok: false as const, status: 401, error: "Authentication required" }; const [member] = await db.select({ role: businessMembers.role }).from(businessMembers).where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, session.user.id))).limit(1); return member ? { ok: true as const } : { ok: false as const, status: 403, error: "You do not have access to this business" } }
function validDate(value: unknown) { return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) }
export async function GET(request: Request) { try { const businessId = new URL(request.url).searchParams.get("businessId"); if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 }); const allowed = await access(businessId); if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status }); const rows = await db.select({ id: deliveries.id, orderId: deliveries.orderId, date: deliveries.date, method: deliveries.method, recipient: deliveries.recipient, address: deliveries.address, transportCost: deliveries.transportCost }).from(deliveries).innerJoin(orders, eq(deliveries.orderId, orders.id)).where(eq(orders.businessId, businessId)).orderBy(desc(deliveries.date)); return NextResponse.json(rows) } catch (error) { console.error("GET /api/deliveries", error); return NextResponse.json({ error: "Failed to fetch deliveries" }, { status: 500 }) } }
export async function POST(request: Request) {
  try {
    const body = await request.json(); const { id, businessId, orderId, date, method, recipient = "", address = "", transportCost = 0 } = body
    if (![id, businessId, orderId, method].every((v) => typeof v === "string" && v.trim()) || !validDate(date) || !["own", "expedition", "pickup"].includes(method) || !Number.isFinite(Number(transportCost)) || Number(transportCost) < 0) return NextResponse.json({ error: "Invalid delivery fields" }, { status: 400 })
    const allowed = await access(businessId); if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status })
    await db.transaction(async (tx) => {
      const [delivery] = await tx.select({ id: deliveries.id }).from(deliveries).where(eq(deliveries.id, id)).limit(1); if (delivery) throw new Error("DELIVERY_EXISTS")
      const [order] = await tx.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.businessId, businessId))).for("update").limit(1); if (!order) throw new Error("ORDER_NOT_FOUND"); if (order.status === "cancelled" || order.status === "delivered") throw new Error("ORDER_STATE")
      const lines = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId)); const reference = `order:${orderId}:sale`; const existing = await tx.select({ id: stockMovements.id }).from(stockMovements).where(and(eq(stockMovements.businessId, businessId), eq(stockMovements.reference, reference))).limit(1); if (existing[0]) throw new Error("ALREADY_DEDUCTED")
      const ids = [...new Set(lines.map((line) => line.productId))]; const stock = await tx.select({ productId: products.id, available: sql<number>`coalesce(sum(${stockMovements.qty}), 0)` }).from(products).leftJoin(stockMovements, and(eq(stockMovements.productId, products.id), eq(stockMovements.businessId, businessId))).where(and(eq(products.businessId, businessId), inArray(products.id, ids))).groupBy(products.id); const needed = new Map(lines.map((line) => [line.productId, line.qty])); if (stock.some((row) => Number(row.available) - (needed.get(row.productId) ?? 0) < 0)) throw new Error("NEGATIVE_STOCK")
      await tx.insert(stockMovements).values(lines.map((line) => ({ id: `SM-SALE-${line.id}`, businessId, date, productId: line.productId, type: "sale" as const, qty: -line.qty, reference })))
      await tx.update(orders).set({ status: "delivered" }).where(and(eq(orders.id, orderId), eq(orders.businessId, businessId)))
      await tx.insert(deliveries).values({ id, orderId, date, method, recipient: String(recipient), address: String(address), transportCost: Number(transportCost).toFixed(2) })
    })
    return NextResponse.json({ message: "Delivery recorded successfully", id }, { status: 201 })
  } catch (error) { const message = error instanceof Error ? error.message : ""; const map: Record<string, [string, number]> = { DELIVERY_EXISTS: ["Delivery ID already exists", 409], ORDER_NOT_FOUND: ["Order not found", 404], ORDER_STATE: ["Order cannot be delivered in its current state", 409], ALREADY_DEDUCTED: ["Stock deduction already recorded", 409], NEGATIVE_STOCK: ["Delivery would create negative stock", 409] }; if (map[message]) return NextResponse.json({ error: map[message][0] }, { status: map[message][1] }); console.error("POST /api/deliveries", error); return NextResponse.json({ error: "Failed to record delivery" }, { status: 500 }) }
}
