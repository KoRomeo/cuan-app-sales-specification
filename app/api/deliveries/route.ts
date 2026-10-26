import { NextResponse } from "next/server"
import { and, desc, eq, inArray } from "drizzle-orm"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { businessMembers, customers, deliveries, orders, financialAccounts, journalEntries, journalEntryLines } from "@/lib/db/schema"
import { generateEntityId } from "@/lib/db/ids"
import { writeAudit } from "@/lib/audit"

async function access(businessId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { ok: false as const, status: 401, error: "Authentication required" }
  const [member] = await db.select({ role: businessMembers.role }).from(businessMembers)
    .where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, session.user.id))).limit(1)
  return member ? { ok: true as const } : { ok: false as const, status: 403, error: "You do not have access to this business" }
}
function validDate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

export async function GET(request: Request) {
  try {
    const businessId = new URL(request.url).searchParams.get("businessId")
    if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    const allowed = await access(businessId)
    if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status })

    // Use deliveries.orderId, which is the persisted relationship supported by the current database schema.
    const rows = await db.select({
      id: deliveries.id, date: deliveries.date, method: deliveries.method,
      recipient: deliveries.recipient, driverName: deliveries.driverName, address: deliveries.address, transportCost: deliveries.transportCost, transportAccount: deliveries.transportAccount,
      orderId: orders.id, customerId: orders.customerId, customerName: customers.name,
    }).from(deliveries)
      .innerJoin(orders, and(eq(orders.id, deliveries.orderId), eq(orders.businessId, businessId)))
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .where(eq(orders.businessId, businessId)).orderBy(desc(deliveries.date))

    const grouped = new Map<string, { id: string; date: string; method: string; recipient: string; driverName: string; address: string; transportCost: string; transportAccount: string; orders: Array<{ id: string; customerId: string; customerName: string }> }>()
    for (const row of rows) {
      let delivery = grouped.get(row.id)
      if (!delivery) {
        delivery = { id: row.id, date: row.date, method: row.method, recipient: row.recipient, driverName: row.driverName, address: row.address, transportCost: row.transportCost, transportAccount: row.transportAccount, orders: [] }
        grouped.set(row.id, delivery)
      }
      delivery.orders.push({ id: row.orderId, customerId: row.customerId, customerName: row.customerName })
    }
    return NextResponse.json([...grouped.values()])
  } catch (error) {
    console.error("GET /api/deliveries", error)
    return NextResponse.json({ error: "Failed to fetch deliveries" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { businessId, date, method, recipient = "", driverName = "", address = "", transportCost = 0, transportAccount = "" } = body
    const rawOrderIds = Array.isArray(body.orderIds) ? body.orderIds : typeof body.orderId === "string" ? [body.orderId] : []
    const orderIds: string[] = Array.from(new Set<string>(rawOrderIds.filter((id: unknown): id is string => typeof id === "string" && !!id.trim()).map((id: string) => id.trim())))
    if (typeof businessId !== "string" || !businessId.trim() || orderIds.length === 0 ||
      !validDate(date) || typeof method !== "string" || !["own", "expedition", "pickup"].includes(method) || typeof driverName !== "string" || !driverName.trim() ||
      !Number.isFinite(Number(transportCost)) || Number(transportCost) < 0) {
      return NextResponse.json({ error: "Provide businessId, orderIds, a valid date, method, driver name, and non-negative transport cost" }, { status: 400 })
    }
    const allowed = await access(businessId)
    if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status })

    const deliveryIds = await db.transaction(async (tx) => {
      let resolvedTransportAccount = "Cash"
      if (Number(transportCost) > 0) {
        const [account] = await tx.select({ name: financialAccounts.name }).from(financialAccounts).where(and(eq(financialAccounts.businessId, businessId), eq(financialAccounts.name, String(transportAccount).trim()), eq(financialAccounts.active, true))).limit(1)
        if (!account) throw new Error("TRANSPORT_ACCOUNT_NOT_FOUND")
        resolvedTransportAccount = account.name
      }
      const foundOrders = await tx.select().from(orders)
        .where(and(eq(orders.businessId, businessId), inArray(orders.id, orderIds))).for("update")
      if (foundOrders.length !== orderIds.length) throw new Error("ORDER_NOT_FOUND")
      if (foundOrders.some((order) => order.status === "cancelled" || order.status === "delivered")) throw new Error("ORDER_STATE")
      const existingDeliveries = await tx.select({ orderId: deliveries.orderId }).from(deliveries)
        .where(inArray(deliveries.orderId, orderIds))
      if (existingDeliveries.some((row) => row.orderId !== null)) throw new Error("ORDER_ALREADY_ASSIGNED")

      // Persist one delivery row per order. This uses the legacy deliveries.order_id column
      // directly, so delivery creation does not depend on the optional delivery_orders table.
      const deliveryIds: string[] = []
      for (const orderId of orderIds) {
        const deliveryId = await generateEntityId(tx, deliveries, businessId, "DEL", date)
        await tx.insert(deliveries).values({
          id: deliveryId,
          orderId,
          date, method: method as "own" | "expedition" | "pickup", recipient: String(recipient), driverName: String(driverName).trim(), address: String(address),
          transportCost: (Number(transportCost) / orderIds.length).toFixed(2),
          transportAccount: resolvedTransportAccount,
        })
        deliveryIds.push(deliveryId)
        const cost = Number((Number(transportCost) / orderIds.length).toFixed(2))
        if (cost > 0) {
          const journalId = "JE-DEL-TRANSPORT-" + deliveryId
          await tx.insert(journalEntries).values({ id: journalId, businessId, entryDate: date, kind: "transport", reference: deliveryId, description: "Delivery transport cost " + deliveryId })
          await tx.insert(journalEntryLines).values([
            { id: journalId + "-expense", journalEntryId: journalId, account: "Transport Expense", debit: cost.toFixed(2), credit: "0" },
            { id: journalId + "-cash", journalEntryId: journalId, account: resolvedTransportAccount, debit: "0", credit: cost.toFixed(2) },
          ])
        }
      }
      // Stock and COGS are recorded when the Order is created. Delivery only updates per-Order delivery status.
      await tx.update(orders).set({ status: "delivered" })
        .where(and(eq(orders.businessId, businessId), inArray(orders.id, orderIds)))
      return deliveryIds
    })
    await writeAudit({ businessId, page: "Deliveries", action: "Created delivery", reference: deliveryIds.join(", ") })
    return NextResponse.json({ message: "Delivery recorded successfully", ids: deliveryIds, orderIds }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    const map: Record<string, [string, number]> = {
      ORDER_NOT_FOUND: ["One or more orders were not found for this business", 404],
      ORDER_STATE: ["Cancelled or already delivered orders cannot be added to a new delivery", 409],
      ORDER_ALREADY_ASSIGNED: ["Each order can be assigned to only one delivery", 409],
      TRANSPORT_ACCOUNT_NOT_FOUND: ["Select an active cash or bank account for delivery costs", 400],
    }
    if (map[message]) return NextResponse.json({ error: map[message][0] }, { status: map[message][1] })
    console.error("POST /api/deliveries", error)
    return NextResponse.json({ error: "Failed to record delivery" }, { status: 500 })
  }
}
