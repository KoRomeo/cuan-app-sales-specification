import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { businessMembers, customers, journalEntries, journalEntryLines, orderItems, orders, products, returnItems, returns } from "@/lib/db/schema"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    const [record] = await db.select().from(returns).where(eq(returns.id, id)).limit(1)
    if (!record) return NextResponse.json({ error: "Return not found" }, { status: 404 })
    const [member] = await db.select({ role: businessMembers.role }).from(businessMembers)
      .where(and(eq(businessMembers.businessId, record.businessId), eq(businessMembers.userId, session.user.id))).limit(1)
    if (!member) return NextResponse.json({ error: "Return not found" }, { status: 404 })
    const [[order], [customer], items, productRows, journal] = await Promise.all([
      db.select().from(orders).where(and(eq(orders.id, record.orderId), eq(orders.businessId, record.businessId))).limit(1),
      db.select({ id: customers.id, name: customers.name, phone: customers.phone, address: customers.address }).from(customers)
        .innerJoin(orders, and(eq(orders.customerId, customers.id), eq(orders.businessId, record.businessId)))
        .where(eq(orders.id, record.orderId)).limit(1),
      db.select().from(returnItems).where(eq(returnItems.returnId, record.id)),
      db.select({ id: products.id, name: products.name }).from(products).where(eq(products.businessId, record.businessId)),
      db.select({ account: journalEntryLines.account, debit: journalEntryLines.debit, credit: journalEntryLines.credit }).from(journalEntryLines)
        .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
        .where(and(eq(journalEntries.reference, record.id), eq(journalEntries.businessId, record.businessId))),
    ])
    const soldItems = await db.select().from(orderItems).where(eq(orderItems.orderId, record.orderId))
    return NextResponse.json({
      ...record,
      order: order ?? null,
      customer: customer ?? null,
      items: items.map((item) => {
        const sold = soldItems.find((line) => line.productId === item.productId)
        const qty = Number(item.qty)
        const soldQty = Number(sold?.qty ?? qty)
        const subtotal = Math.max(0, Number(sold?.price ?? item.price) * qty - Number(sold?.discount ?? 0) * qty / Math.max(1, soldQty))
        return { ...item, subtotal, productName: productRows.find((product) => product.id === item.productId)?.name ?? item.productId }
      }),
      refundAccount: journal.find((line) => Number(record.refundAmount) > 0 && line.account !== "Sales Returns" && line.account !== "Inventory" && line.account !== "Cost of Goods Sold" && line.account !== "Replacement Cost")?.account ?? null,
      replacementCost: journal.filter((line) => line.account === "Replacement Cost").reduce((sum, line) => sum + Number(line.debit) - Number(line.credit), 0),
    })
  } catch (error) {
    console.error("GET /api/returns/[id]", error)
    return NextResponse.json({ error: "Failed to load return details" }, { status: 500 })
  }
}
