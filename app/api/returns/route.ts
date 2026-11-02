import { and, desc, eq, inArray } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { financialAccounts, journalEntries, journalEntryLines, orderItems, orders, payments, products, returnItems, returns, stockMovements } from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"
import { generateEntityId } from "@/lib/db/ids"
import { writeAudit } from "@/lib/audit"

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}
type ReturnLine = { productId: string; qty: number }
function validItems(value: unknown): value is ReturnLine[] {
  return Array.isArray(value) && value.length > 0 && value.every((line) =>
    line && typeof line.productId === "string" && line.productId.trim() &&
    Number.isSafeInteger(line.qty) && line.qty > 0 && line.qty <= 999999)
}

export async function GET(request: Request) {
  try {
    const businessId = new URL(request.url).searchParams.get("businessId")
    if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const rows = await db.select().from(returns).where(eq(returns.businessId, businessId)).orderBy(desc(returns.date))
    const items = rows.length ? await db.select().from(returnItems).where(inArray(returnItems.returnId, rows.map((row) => row.id))) : []
    return NextResponse.json(rows.map((row) => ({ ...row, items: items.filter((item) => item.returnId === row.id) })))
  } catch (error) {
    console.error("GET /api/returns", error)
    return NextResponse.json({ error: "Failed to load returns" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { businessId, orderId, date, stockReturned, refundCustomer, refundAmount, refundAccount, notes, items } = body ?? {}
    const refund = Number(refundAmount ?? 0)
    if (typeof businessId !== "string" || !businessId.trim() || typeof orderId !== "string" || !orderId.trim() ||
      !validDate(date) || typeof stockReturned !== "boolean" || typeof refundCustomer !== "boolean" ||
      !validItems(items) || !Number.isFinite(refund) || refund < 0 || (!refundCustomer && refund !== 0) ||
      typeof notes !== "string") {
      return NextResponse.json({ error: "Please provide a valid order, return date, items, and refund settings." }, { status: 400 })
    }
    if (refundCustomer && refund <= 0) return NextResponse.json({ error: "A refund amount greater than Rp0 is required for refund mode." }, { status: 400 })
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const created = await db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.businessId, businessId))).for("update").limit(1)
      if (!order) throw new Error("ORDER_NOT_FOUND")
      if (order.status === "cancelled") throw new Error("ORDER_CANCELLED")
      const sold = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId))
      const priorReturns = await tx.select({ qty: returnItems.qty, productId: returnItems.productId }).from(returnItems)
        .innerJoin(returns, eq(returnItems.returnId, returns.id)).where(eq(returns.orderId, orderId))
      const requestedQty = new Map<string, number>()
      for (const line of items as ReturnLine[]) requestedQty.set(line.productId, (requestedQty.get(line.productId) ?? 0) + line.qty)
      let total = 0
      const lines: Array<{ productId: string; qty: number; price: number; unitCost: number; replacementUnitCost: number }> = []
      for (const [productId, qty] of requestedQty) {
        const matchingSoldLines = sold.filter((line) => line.productId === productId)
        if (matchingSoldLines.length === 0) throw new Error("PRODUCT_NOT_IN_ORDER")
        const soldQty = matchingSoldLines.reduce((sum, line) => sum + Number(line.qty), 0)
        const soldLine = {
          ...matchingSoldLines[0],
          qty: soldQty,
          price: matchingSoldLines.reduce((sum, line) => sum + Number(line.price) * Number(line.qty), 0) / Math.max(1, soldQty),
          discount: matchingSoldLines.reduce((sum, line) => sum + Number(line.discount), 0),
          unitCost: matchingSoldLines.reduce((sum, line) => sum + Number(line.unitCost) * Number(line.qty), 0) / Math.max(1, soldQty),
        }
        const already = priorReturns.filter((line) => line.productId === productId).reduce((sum, line) => sum + Number(line.qty), 0)
        if (already + qty > soldQty) throw new Error("RETURN_QTY_EXCEEDS_SOLD")
        const [product] = await tx.select({ id: products.id, averageCost: products.averageCost }).from(products)
          .where(and(eq(products.id, productId), eq(products.businessId, businessId))).for("update").limit(1)
        if (!product) throw new Error("PRODUCT_NOT_FOUND")
        const price = Number(soldLine.price)
        total += Math.max(0, price * qty - (Number(soldLine.discount) * qty / Number(soldLine.qty)))
        // Reverse the cost recognized on the original sale, not today's moving average.
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
      const paymentRows = await tx.select({ amount: payments.amount }).from(payments).where(and(eq(payments.orderId, orderId), eq(payments.businessId, businessId)))
      const paid = paymentRows.reduce((sum, row) => sum + Number(row.amount), 0)
      const priorRefunds = await tx.select({ amount: returns.refundAmount }).from(returns).where(eq(returns.orderId, orderId))
      const refunded = priorRefunds.reduce((sum, row) => sum + Number(row.amount), 0)
      if (refundCustomer && refund > Math.min(total, Math.max(paid - refunded, 0))) throw new Error("REFUND_EXCEEDS_PAID")
      if (!refundCustomer && refund !== 0) throw new Error("REFUND_NOT_SELECTED")
      const id = await generateEntityId(tx, returns, businessId, "RET", date)
      await tx.insert(returns).values({ id, businessId, orderId, date, stockReturned, refundAmount: refund.toFixed(2), notes: notes.trim() || null, total: total.toFixed(2) })
      await tx.insert(returnItems).values(lines.map((line, index) => ({ id: `RI-${id}-${index + 1}`, returnId: id, productId: line.productId, qty: line.qty, price: line.price.toFixed(2) })))
      if (stockReturned) {
        // Returned goods are added back to sellable stock only when explicitly selected.
        for (const line of lines) await tx.insert(stockMovements).values({
          id: `SM-${id}-${line.productId}`, businessId, date, productId: line.productId,
          type: "reversal", qty: line.qty, reference: `return:${id}:stock`,
        })
      }
      if (!refundCustomer) {
        // No refund means a replacement unit is issued, independent of whether the returned item can be restocked.
        for (const line of lines) await tx.insert(stockMovements).values({
          id: `SM-${id}-REPLACEMENT-${line.productId}`, businessId, date, productId: line.productId,
          type: "replacement", qty: -line.qty, reference: `return:${id}:replacement`,
        })
      }
      const stockValue = stockReturned ? lines.reduce((sum, line) => sum + line.qty * line.unitCost, 0) : 0
      const replacementValue = !refundCustomer ? lines.reduce((sum, line) => sum + line.qty * line.replacementUnitCost, 0) : 0
      if (refund > 0 || stockValue > 0 || replacementValue > 0) {
        const entryId = `JE-${id}`
        await tx.insert(journalEntries).values({ id: entryId, businessId, entryDate: date, kind: "return", reference: id, description: `Customer return for ${orderId}` })
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
      return { id, total, refundAmount: refund, refundAccount: resolvedRefundAccount, stockReturned, orderId }
    })
    await writeAudit({
      businessId, page: "Returns", action: "Record Return", reference: created.id,
      changes: [
        { property: "Order", previous: null, current: created.orderId },
        { property: "Date", previous: null, current: date },
        { property: "Return Total", previous: null, current: String(created.total) },
        { property: "Refund Amount", previous: null, current: String(created.refundAmount) },
        { property: "Stock Decision", previous: null, current: created.stockReturned ? "Restocked" : "Not restocked" },
      ],
    })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    const known: Record<string, [string, number]> = {
      ORDER_NOT_FOUND: ["Order not found", 404],
      ORDER_CANCELLED: ["Cannot return items from a cancelled order", 409],
      PRODUCT_NOT_IN_ORDER: ["Only products from the selected order can be returned", 400],
      PRODUCT_NOT_FOUND: ["Product not found", 404],
      RETURN_QTY_EXCEEDS_SOLD: ["Return quantity exceeds the remaining quantity sold", 409],
      REFUND_EXCEEDS_PAID: ["Refund cannot exceed the eligible amount paid for the returned items", 409],
      REFUND_NOT_SELECTED: ["Refund amount must be zero when refund is disabled", 400],
      NO_REFUND_ACCOUNT: ["Create or activate a Cash & Bank account before recording a refund", 400],
    }
    if (known[message]) return NextResponse.json({ error: known[message][0] }, { status: known[message][1] })
    console.error("POST /api/returns", error)
    return NextResponse.json({ error: "Failed to record return" }, { status: 500 })
  }
}
