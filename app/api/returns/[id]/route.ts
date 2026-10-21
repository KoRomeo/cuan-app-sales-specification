import { and, eq, inArray } from "drizzle-orm"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { businessMembers, customers, financialAccounts, journalEntries, journalEntryLines, orderItems, orders, payments, products, returnItems, returns, stockMovements } from "@/lib/db/schema"
import { writeAudit } from "@/lib/audit"

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


function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

type ReturnLineInput = { productId: string; qty: number }
function validItems(value: unknown): value is ReturnLineInput[] {
  return Array.isArray(value) && value.length > 0 && value.every((line) =>
    line && typeof line.productId === "string" && line.productId.trim() &&
    Number.isSafeInteger(line.qty) && line.qty > 0 && line.qty <= 999999)
}

async function getAuthorizedReturn(id: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) } as const
  const [record] = await db.select().from(returns).where(eq(returns.id, id)).limit(1)
  if (!record) return { error: NextResponse.json({ error: "Return not found" }, { status: 404 }) } as const
  const [member] = await db.select({ role: businessMembers.role }).from(businessMembers)
    .where(and(eq(businessMembers.businessId, record.businessId), eq(businessMembers.userId, session.user.id))).limit(1)
  if (!member) return { error: NextResponse.json({ error: "Return not found" }, { status: 404 }) } as const
  return { record, businessId: record.businessId } as const
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const authorized = await getAuthorizedReturn(id)
    if ("error" in authorized) return authorized.error
    const { record, businessId } = authorized
    const body = await request.json()
    const { date, stockReturned, refundCustomer, refundAmount, refundAccount, notes, items } = body ?? {}
    const refund = Number(refundAmount ?? 0)
    if (!validDate(date) || typeof stockReturned !== "boolean" || typeof refundCustomer !== "boolean" ||
      !validItems(items) || !Number.isFinite(refund) || refund < 0 ||
      (!refundCustomer && refund !== 0) || typeof notes !== "string" ||
      (refundCustomer && refund <= 0)) {
      return NextResponse.json({ error: "Please provide a valid return date, items, stock decision, and refund settings." }, { status: 400 })
    }

    const updated = await db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders)
        .where(and(eq(orders.id, record.orderId), eq(orders.businessId, businessId))).for("update").limit(1)
      if (!order) throw new Error("ORDER_NOT_FOUND")
      if (order.status === "cancelled") throw new Error("ORDER_CANCELLED")
      const sold = await tx.select().from(orderItems).where(eq(orderItems.orderId, record.orderId))
      const priorReturnItems = await tx.select({ qty: returnItems.qty, productId: returnItems.productId })
        .from(returnItems).innerJoin(returns, eq(returnItems.returnId, returns.id))
        .where(eq(returns.orderId, record.orderId))
      const requestedQty = new Map<string, number>()
      for (const line of items as ReturnLineInput[]) requestedQty.set(line.productId, (requestedQty.get(line.productId) ?? 0) + line.qty)
      const lines: Array<{ productId: string; qty: number; price: number; unitCost: number; replacementUnitCost: number }> = []
      let total = 0
      for (const [productId, qty] of requestedQty) {
        const soldLine = sold.find((line) => line.productId === productId)
        if (!soldLine) throw new Error("PRODUCT_NOT_IN_ORDER")
        const already = priorReturnItems
          .filter((line) => line.productId === productId)
          .reduce((sum, line) => sum + Number(line.qty), 0)
        const oldQty = (await tx.select({ qty: returnItems.qty }).from(returnItems)
          .where(and(eq(returnItems.returnId, id), eq(returnItems.productId, productId))))
          .reduce((sum, line) => sum + Number(line.qty), 0)
        if (already - oldQty + qty > Number(soldLine.qty)) throw new Error("RETURN_QTY_EXCEEDS_SOLD")
        const [product] = await tx.select({ id: products.id, averageCost: products.averageCost }).from(products)
          .where(and(eq(products.id, productId), eq(products.businessId, businessId))).for("update").limit(1)
        if (!product) throw new Error("PRODUCT_NOT_FOUND")
        const price = Number(soldLine.price)
        total += Math.max(0, price * qty - Number(soldLine.discount) * qty / Number(soldLine.qty))
        lines.push({ productId, qty, price, unitCost: Number(soldLine.unitCost), replacementUnitCost: Number(product.averageCost) })
      }

      let resolvedRefundAccount: string | null = null
      if (refund > 0) {
        const activeAccounts = await tx.select({ name: financialAccounts.name }).from(financialAccounts)
          .where(and(eq(financialAccounts.businessId, businessId), eq(financialAccounts.active, true)))
        const requestedAccount = typeof refundAccount === "string" ? refundAccount.trim() : ""
        const chosenAccount = requestedAccount
          ? activeAccounts.find((account) => account.name === requestedAccount)
          : activeAccounts.find((account) => account.name.toLowerCase() === "cash") ?? activeAccounts[0]
        if (!chosenAccount) throw new Error("NO_REFUND_ACCOUNT")
        resolvedRefundAccount = chosenAccount.name
      }
      const paymentRows = await tx.select({ amount: payments.amount }).from(payments)
        .where(and(eq(payments.orderId, record.orderId), eq(payments.businessId, businessId)))
      const paid = paymentRows.reduce((sum, row) => sum + Number(row.amount), 0)
      const allRefundRows = await tx.select({ id: returns.id, amount: returns.refundAmount }).from(returns)
        .where(eq(returns.orderId, record.orderId))
      const refundedElsewhere = allRefundRows.filter((row) => row.id !== id).reduce((sum, row) => sum + Number(row.amount), 0)
      if (refundCustomer && refund > Math.min(total, Math.max(paid - refundedElsewhere, 0))) throw new Error("REFUND_EXCEEDS_PAID")

      // Replace this return's effects atomically so stock, journal, and report totals never see a half-updated record.
      await tx.delete(stockMovements).where(and(
        eq(stockMovements.businessId, businessId),
        inArray(stockMovements.reference, [`return:${id}:stock`, `return:${id}:replacement`]),
      ))
      await tx.delete(journalEntries).where(and(
        eq(journalEntries.businessId, businessId),
        eq(journalEntries.reference, id),
        eq(journalEntries.kind, "return"),
      ))
      await tx.delete(returnItems).where(eq(returnItems.returnId, id))
      await tx.update(returns).set({
        date, stockReturned, refundAmount: refund.toFixed(2),
        notes: notes.trim() || null, total: total.toFixed(2),
      }).where(and(eq(returns.id, id), eq(returns.businessId, businessId)))
      await tx.insert(returnItems).values(lines.map((line, index) => ({
        id: `RI-${id}-${index + 1}`, returnId: id, productId: line.productId,
        qty: line.qty, price: line.price.toFixed(2),
      })))
      if (stockReturned) {
        for (const line of lines) await tx.insert(stockMovements).values({
          id: `SM-${id}-${line.productId}`, businessId, date, productId: line.productId,
          type: "reversal", qty: line.qty, reference: `return:${id}:stock`,
        })
      }
      if (!refundCustomer) {
        for (const line of lines) await tx.insert(stockMovements).values({
          id: `SM-${id}-REPLACEMENT-${line.productId}`, businessId, date, productId: line.productId,
          type: "replacement", qty: -line.qty, reference: `return:${id}:replacement`,
        })
      }
      const stockValue = stockReturned ? lines.reduce((sum, line) => sum + line.qty * line.unitCost, 0) : 0
      const replacementValue = !refundCustomer ? lines.reduce((sum, line) => sum + line.qty * line.replacementUnitCost, 0) : 0
      if (refund > 0 || stockValue > 0 || replacementValue > 0) {
        const entryId = `JE-${id}`
        await tx.insert(journalEntries).values({
          id: entryId, businessId, entryDate: date, kind: "return",
          reference: id, description: `Customer return for ${record.orderId}`,
        })
        const journalLines: Array<{ id: string; journalEntryId: string; account: string; debit: string; credit: string }> = []
        if (refund > 0) journalLines.push(
          { id: `${entryId}-sales-return`, journalEntryId: entryId, account: "Sales Returns", debit: refund.toFixed(2), credit: "0" },
          { id: `${entryId}-cash`, journalEntryId: entryId, account: resolvedRefundAccount!, debit: "0", credit: refund.toFixed(2) },
        )
        if (stockValue > 0) journalLines.push(
          { id: `${entryId}-inventory`, journalEntryId: entryId, account: "Inventory", debit: stockValue.toFixed(2), credit: "0" },
          { id: `${entryId}-cogs`, journalEntryId: entryId, account: "Cost of Goods Sold", debit: "0", credit: stockValue.toFixed(2) },
        )
        if (replacementValue > 0) journalLines.push(
          { id: `${entryId}-replacement-cost`, journalEntryId: entryId, account: "Replacement Cost", debit: replacementValue.toFixed(2), credit: "0" },
          { id: `${entryId}-replacement-inventory`, journalEntryId: entryId, account: "Inventory", debit: "0", credit: replacementValue.toFixed(2) },
        )
        await tx.insert(journalEntryLines).values(journalLines)
      }
      return { id, orderId: record.orderId, date, stockReturned, refundAmount: refund, total }
    })
    await writeAudit({
      businessId, page: "Returns", action: "Edit Return", reference: id,
      changes: [
        { property: "Date", previous: record.date, current: date },
        { property: "Stock Decision", previous: record.stockReturned ? "Restocked" : "Not restocked", current: stockReturned ? "Restocked" : "Not restocked" },
        { property: "Refund Amount", previous: String(record.refundAmount), current: refund.toFixed(2) },
        { property: "Return Total", previous: String(record.total), current: total.toFixed(2) },
        { property: "Notes", previous: record.notes ?? "—", current: notes.trim() || "—" },
      ],
    })
    return NextResponse.json(updated)
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    const known: Record<string, [string, number]> = {
      ORDER_NOT_FOUND: ["Order not found", 404],
      ORDER_CANCELLED: ["Cannot edit a return linked to a cancelled order", 409],
      PRODUCT_NOT_IN_ORDER: ["Only products from the selected order can be returned", 400],
      PRODUCT_NOT_FOUND: ["Product not found", 404],
      RETURN_QTY_EXCEEDS_SOLD: ["Return quantity exceeds the remaining quantity sold", 409],
      REFUND_EXCEEDS_PAID: ["Refund cannot exceed the eligible amount paid for the returned items", 409],
      NO_REFUND_ACCOUNT: ["Create or activate a Cash & Bank account before recording a refund", 400],
    }
    if (known[message]) return NextResponse.json({ error: known[message][0] }, { status: known[message][1] })
    console.error("PATCH /api/returns/[id]", error)
    return NextResponse.json({ error: "Failed to update return" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const authorized = await getAuthorizedReturn(id)
    if ("error" in authorized) return authorized.error
    const { record, businessId } = authorized
    await db.transaction(async (tx) => {
      // Serialize delete against return creation/edits so remaining returnable quantities stay correct.
      const [order] = await tx.select({ id: orders.id }).from(orders)
        .where(and(eq(orders.id, record.orderId), eq(orders.businessId, businessId))).for("update").limit(1)
      if (!order) throw new Error("ORDER_NOT_FOUND")
      await tx.delete(stockMovements).where(and(
        eq(stockMovements.businessId, businessId),
        inArray(stockMovements.reference, [`return:${id}:stock`, `return:${id}:replacement`]),
      ))
      await tx.delete(journalEntries).where(and(
        eq(journalEntries.businessId, businessId),
        eq(journalEntries.reference, id),
        eq(journalEntries.kind, "return"),
      ))
      await tx.delete(returns).where(and(eq(returns.id, id), eq(returns.businessId, businessId)))
    })
    await writeAudit({
      businessId, page: "Returns", action: "Delete Return", reference: id,
      changes: [
        { property: "Deleted", previous: "Active", current: "Deleted" },
        { property: "Stock Decision", previous: record.stockReturned ? "Restocked" : "Not restocked", current: "Effects reversed" },
        { property: "Refund Amount", previous: String(record.refundAmount), current: "Reversed" },
        { property: "Return Total", previous: String(record.total), current: "Deleted" },
      ],
    })
    return NextResponse.json({ id, deleted: true, orderId: record.orderId })
  } catch (error) {
    console.error("DELETE /api/returns/[id]", error)
    return NextResponse.json({ error: "Failed to delete return" }, { status: 500 })
  }
}
