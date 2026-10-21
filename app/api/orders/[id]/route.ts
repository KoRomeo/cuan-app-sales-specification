import { and, desc, eq, inArray, sql } from "drizzle-orm"
import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { businessMembers, customers, deliveries, journalEntries, journalEntryLines, orderItems, orders, payments, products, replacements, stockMovements, returns, returnItems } from "@/lib/db/schema"
import { writeAudit } from "@/lib/audit"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
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
    db.select({ id: deliveries.id, date: deliveries.date, method: deliveries.method, recipient: deliveries.recipient, driverName: deliveries.driverName, address: deliveries.address, transportCost: deliveries.transportCost }).from(deliveries).where(eq(deliveries.orderId, id)).limit(1),
    db.select({ id: replacements.id, date: replacements.date, productId: replacements.productId, qty: replacements.qty, reason: replacements.reason, delivered: replacements.delivered }).from(replacements).where(and(eq(replacements.orderId, id), eq(replacements.businessId, order.businessId))),
  ])
  const productRows = itemRows.length ? await db.select({ id: products.id, name: products.name, averageCost: products.averageCost, stock: sql<number>`coalesce(sum(${stockMovements.qty}), 0)` }).from(products).leftJoin(stockMovements, and(eq(stockMovements.productId, products.id), eq(stockMovements.businessId, order.businessId))).where(eq(products.businessId, order.businessId)).groupBy(products.id) : []
  const returnRows = await db.select().from(returns).where(and(eq(returns.orderId, id), eq(returns.businessId, order.businessId))).orderBy(desc(returns.date))
  const returnItemRows = returnRows.length ? await db.select().from(returnItems).where(inArray(returnItems.returnId, returnRows.map((row) => row.id))) : []
  const returnJournalRows = returnRows.length ? await db.select({ reference: journalEntries.reference, account: journalEntryLines.account, debit: journalEntryLines.debit, credit: journalEntryLines.credit }).from(journalEntries).innerJoin(journalEntryLines, eq(journalEntryLines.journalEntryId, journalEntries.id)).where(and(eq(journalEntries.businessId, order.businessId), inArray(journalEntries.reference, returnRows.map((row) => row.id)))) : []
  const replacementJournalIds = replacementRows.map((row) => `JE-REPLACEMENT-${row.id}`)
  const replacementJournalLines = replacementJournalIds.length ? await db.select({ journalEntryId: journalEntryLines.journalEntryId, account: journalEntryLines.account, debit: journalEntryLines.debit, credit: journalEntryLines.credit }).from(journalEntryLines).where(inArray(journalEntryLines.journalEntryId, replacementJournalIds)) : []
  return NextResponse.json({ ...order, customer: customer ?? null, items: itemRows, products: productRows, payments: paymentRows, delivery: delivery ?? null, replacements: replacementRows.map((row) => ({ ...row, cost: replacementJournalLines.filter((line) => line.journalEntryId === `JE-REPLACEMENT-${row.id}` && line.account === "Cost of Goods Sold").reduce((sum, line) => sum + Number(line.debit) - Number(line.credit), 0) })), returns: returnRows.map((row) => ({ ...row, replacementCost: returnJournalRows.filter((line) => line.reference === row.id && line.account === "Replacement Cost").reduce((sum, line) => sum + Number(line.debit) - Number(line.credit), 0), items: returnItemRows.filter((item) => item.returnId === row.id) })) })
  } catch (error) {
    console.error("Order detail request failed", error)
    return NextResponse.json({ error: "Unable to load order details" }, { status: 500 })
  }
}


export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const businessId = request.nextUrl.searchParams.get("businessId")
  if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const [member] = await db.select({ role: businessMembers.role }).from(businessMembers).where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, session.user.id))).limit(1)
  if (!member) return NextResponse.json({ error: "Order not found" }, { status: 404 })
  try {
    await db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(and(eq(orders.id, id), eq(orders.businessId, businessId))).for("update").limit(1)
      if (!order) throw new Error("ORDER_NOT_FOUND")
      if (order.status !== "requested") throw new Error("ORDER_NOT_DELETABLE")
      const [payment] = await tx.select({ id: payments.id }).from(payments).where(and(eq(payments.orderId, id), eq(payments.businessId, businessId))).limit(1)
      const [delivery] = await tx.select({ id: deliveries.id }).from(deliveries).where(eq(deliveries.orderId, id)).limit(1)
      const [replacement] = await tx.select({ id: replacements.id }).from(replacements).where(and(eq(replacements.orderId, id), eq(replacements.businessId, businessId))).limit(1)
      if (payment) throw new Error("ORDER_PAID")
      if (delivery || replacement) throw new Error("ORDER_HAS_HISTORY")
      await tx.delete(stockMovements).where(and(eq(stockMovements.businessId, businessId), eq(stockMovements.reference, `order:${id}:sale`)))
      await tx.delete(journalEntries).where(and(eq(journalEntries.businessId, businessId), eq(journalEntries.reference, id)))
      await tx.delete(orderItems).where(eq(orderItems.orderId, id))
      await tx.delete(orders).where(and(eq(orders.id, id), eq(orders.businessId, businessId)))
    })
    await writeAudit({ businessId, page: "Orders", action: "Deleted unpaid order; outstanding receivable reversed", reference: id })
    return NextResponse.json({ message: "Order deleted successfully", id })
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    if (message === "ORDER_NOT_FOUND") return NextResponse.json({ error: "Order not found" }, { status: 404 })
    if (message === "ORDER_NOT_DELETABLE") return NextResponse.json({ error: "Only requested orders with no related activity can be deleted. Cancel or retain this order instead." }, { status: 409 })
    if (message === "ORDER_PAID") return NextResponse.json({ error: "An order with any partial or full payment cannot be deleted." }, { status: 409 })
    if (message === "ORDER_HAS_HISTORY") return NextResponse.json({ error: "Orders with an existing delivery or replacement cannot be deleted." }, { status: 409 })
    console.error("Order deletion failed", error)
    return NextResponse.json({ error: "Unable to delete order" }, { status: 500 })
  }
}
