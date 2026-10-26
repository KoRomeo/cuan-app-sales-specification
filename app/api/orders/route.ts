import { NextRequest, NextResponse } from "next/server"
import { and, eq, inArray, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { businessMembers, customers, financialAccounts, journalEntries, journalEntryLines, orderItems, orders, payments, products, stockMovements } from "@/lib/db/schema"
import { headers } from "next/headers"
import { generateEntityId } from "@/lib/db/ids"
import { writeAudit } from "@/lib/audit"

const STATUSES = ["requested", "ready", "delivered", "cancelled"] as const
type Status = (typeof STATUSES)[number]
type Item = { id: string; productId: string; qty: number; price: number | string; discount?: number | string; unitCost: number | string }

async function access(businessId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { ok: false as const, status: 401, error: "Authentication required" }
  const [member] = await db.select({ role: businessMembers.role }).from(businessMembers).where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, session.user.id))).limit(1)
  return member ? { ok: true as const, userId: session.user.id } : { ok: false as const, status: 403, error: "You do not have access to this business" }
}
function date(value: unknown) { return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) }
function items(value: unknown): value is Item[] {
  if (!Array.isArray(value) || value.length === 0) return false
  const ids = new Set<string>()
  return value.every((item) => {
    if (!item || typeof item.id !== "string" || !item.id.trim() || ids.has(item.id) || typeof item.productId !== "string") return false
    ids.add(item.id)
    const qty = Number(item.qty), price = Number(item.price), discount = Number(item.discount ?? 0), cost = Number(item.unitCost)
    return Number.isSafeInteger(qty) && qty > 0 && Number.isFinite(price) && price >= 0 && Number.isFinite(discount) && discount >= 0 && discount <= price && Number.isFinite(cost) && cost >= 0
  })
}
function fail(error: unknown, fallback = "Order operation failed") {
  const map: Record<string, [string, number]> = { CUSTOMER_NOT_FOUND: ["Customer not found for this business", 404], PRODUCT_NOT_FOUND: ["One or more products were not found for this business", 404], PAYMENT_EXCEEDS_TOTAL: ["Payment cannot exceed order total", 400], PAYMENT_ID_EXISTS: ["Payment ID already exists", 409], INVALID_FINANCIAL_ACCOUNT: ["Select an active Cash & Bank account for this business", 400], ORDER_NOT_FOUND: ["Order not found", 404], ORDER_ID_EXISTS: ["Order ID already exists", 409], INVALID_STATUS: ["Invalid order status transition", 409], DELIVERED_IMMUTABLE: ["Delivered orders cannot be edited or cancelled", 409], DELIVERY_ALREADY_PROCESSED: ["Stock deduction for this order was already recorded", 409], NEGATIVE_STOCK: ["Delivery would create negative stock", 409], DELIVERY_REQUIRED: ["Mark an Order as delivered by creating a Delivery", 409], ORDER_ITEMS_IMMUTABLE: ["Order items cannot be edited after stock and accounting have been posted", 409], CANCEL_WITH_PAYMENTS_UNSUPPORTED: ["This Order has payments; cancellation is blocked until payment reversal or customer-credit handling is implemented", 409] }
  const known = error instanceof Error ? map[error.message] : undefined
  if (known) return NextResponse.json({ error: known[0] }, { status: known[1] })
  console.error(fallback, error)
  return NextResponse.json({ error: fallback }, { status: 500 })
}
async function verify(tx: any, businessId: string, customerId: string, lineItems: Item[]) {
  const [customer] = await tx.select({ id: customers.id }).from(customers).where(and(eq(customers.id, customerId), eq(customers.businessId, businessId))).limit(1)
  if (!customer) throw new Error("CUSTOMER_NOT_FOUND")
  const ids = [...new Set(lineItems.map((item) => item.productId))]
  const found = await tx.select({ id: products.id }).from(products).where(and(eq(products.businessId, businessId), inArray(products.id, ids)))
  if (found.length !== ids.length) throw new Error("PRODUCT_NOT_FOUND")
}

export async function GET(request: NextRequest) {
  try {
    const businessId = request.nextUrl.searchParams.get("businessId")
    if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    const allowed = await access(businessId); if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status })
    const rows = await db.select().from(orders).where(eq(orders.businessId, businessId))
    const lineRows = rows.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, rows.map((row) => row.id))) : []
    return NextResponse.json(rows.map((row) => ({ ...row, items: lineRows.filter((line) => line.orderId === row.id) })))
  } catch (error) { return fail(error) }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json(); const { businessId, date: orderDate, customerId, status = "requested", dueDate, notes, items: lineItems, paidAmount = 0, paymentAccount = "Cash", paymentDate = orderDate, paymentId } = body
    if (![businessId, customerId].every((v) => typeof v === "string" && v.trim()) || !date(orderDate) || (dueDate && !date(dueDate)) || !STATUSES.includes(status) || !["requested", "ready"].includes(status) || !items(lineItems) || typeof paidAmount !== "number" || !Number.isFinite(paidAmount) || paidAmount < 0 || (paidAmount > 0 && (typeof paymentAccount !== "string" || !paymentAccount.trim())) || (paidAmount > 0 && !paymentId)) return NextResponse.json({ error: "Order fields, items, or payment are invalid" }, { status: 400 })
    const allowed = await access(businessId); if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status })
    const id = await db.transaction(async (tx) => {
      const generatedId = await generateEntityId(tx, orders, businessId, "ORD", orderDate)
      const [existing] = await tx.select({ id: orders.id }).from(orders).where(eq(orders.id, generatedId)).limit(1); if (existing) throw new Error("ORDER_ID_EXISTS")
      await verify(tx, businessId, customerId, lineItems)
      const productRows = await tx.select({ id: products.id, sellingPrice: products.sellingPrice, averageCost: products.averageCost }).from(products).where(and(eq(products.businessId, businessId), inArray(products.id, [...new Set(lineItems.map((item) => item.productId))])))
      const byProduct = new Map(productRows.map((product) => [product.id, product]))
      const normalizedItems = lineItems.map((item) => ({ ...item, price: Number(item.price), unitCost: Number(byProduct.get(item.productId)?.averageCost) }))
      const total = normalizedItems.reduce((sum, item) => sum + item.qty * item.price - Number(item.discount ?? 0), 0)
      if (paidAmount > total) throw new Error("PAYMENT_EXCEEDS_TOTAL")
      await tx.insert(orders).values({ id: generatedId, businessId, date: orderDate, customerId, status, dueDate: dueDate || null, notes: notes || null })
      await tx.insert(orderItems).values(normalizedItems.map((item) => ({ id: item.id, orderId: generatedId, productId: item.productId, qty: Number(item.qty), price: String(item.price), discount: String(item.discount ?? 0), unitCost: String(item.unitCost) })))
      // Stock, revenue, and COGS are recognized at Order creation. Negative stock is allowed.
      await tx.insert(stockMovements).values(normalizedItems.map((item) => ({
        id: `SM-SALE-${generatedId}-${item.id}`, businessId, date: orderDate, productId: item.productId,
        type: "sale" as const, qty: -Number(item.qty), reference: `order:${generatedId}:sale`,
      })))
      const revenue = total
      const cogs = normalizedItems.reduce((sum, item) => sum + Number(item.qty) * Number(item.unitCost), 0)
      const saleEntryId = `JE-SALE-${generatedId}`
      await tx.insert(journalEntries).values({ id: saleEntryId, businessId, entryDate: orderDate, kind: "sale", reference: generatedId, description: `Order sale and COGS for ${generatedId}` })
      await tx.insert(journalEntryLines).values([
        { id: `${saleEntryId}-ar`, journalEntryId: saleEntryId, account: "Accounts Receivable", debit: revenue.toFixed(2), credit: "0" },
        { id: `${saleEntryId}-revenue`, journalEntryId: saleEntryId, account: "Sales Revenue", debit: "0", credit: revenue.toFixed(2) },
        { id: `${saleEntryId}-cogs`, journalEntryId: saleEntryId, account: "Cost of Goods Sold", debit: cogs.toFixed(2), credit: "0" },
        { id: `${saleEntryId}-inventory`, journalEntryId: saleEntryId, account: "Inventory", debit: "0", credit: cogs.toFixed(2) },
      ])
      if (paidAmount > 0) {
        const [account] = await tx.select({ id: financialAccounts.id }).from(financialAccounts).where(and(eq(financialAccounts.businessId, businessId), eq(financialAccounts.name, paymentAccount.trim()), eq(financialAccounts.active, true))).limit(1)
        if (!account) throw new Error("INVALID_FINANCIAL_ACCOUNT")
        const [existingPayment] = await tx.select({ id: payments.id }).from(payments).where(eq(payments.id, paymentId)).limit(1)
        if (existingPayment) throw new Error("PAYMENT_ID_EXISTS")
        const entryId = `JE-PAY-${paymentId}`
        await tx.insert(payments).values({ id: paymentId, businessId, orderId: generatedId, purchaseId: null, date: paymentDate, amount: paidAmount.toFixed(2), account: paymentAccount.trim() })
        await tx.insert(journalEntries).values({ id: entryId, businessId, entryDate: paymentDate, kind: "payment", reference: paymentId, description: `Customer payment for ${generatedId}` })
        await tx.insert(journalEntryLines).values([{ id: `${entryId}-debit`, journalEntryId: entryId, account: paymentAccount.trim(), debit: paidAmount.toFixed(2), credit: "0" }, { id: `${entryId}-credit`, journalEntryId: entryId, account: "Accounts Receivable", debit: "0", credit: paidAmount.toFixed(2) }])
      }
      return generatedId
    })
    await writeAudit({ businessId, page: "Orders", action: "Created order", reference: id })
    return NextResponse.json({ message: "Order created successfully", id }, { status: 201 })
  } catch (error) { return fail(error) }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json(); const { id, businessId, date: orderDate, customerId, status, dueDate, notes, items: lineItems } = body
    if (typeof id !== "string" || typeof businessId !== "string") return NextResponse.json({ error: "id and businessId are required" }, { status: 400 })
    if (orderDate !== undefined && !date(orderDate) || dueDate !== undefined && dueDate !== null && dueDate !== "" && !date(dueDate) || status !== undefined && !STATUSES.includes(status) || lineItems !== undefined && !items(lineItems)) return NextResponse.json({ error: "Invalid order fields" }, { status: 400 })
    const allowed = await access(businessId); if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status })
    await db.transaction(async (tx) => {
      const [current] = await tx.select().from(orders).where(and(eq(orders.id, id), eq(orders.businessId, businessId))).for("update").limit(1); if (!current) throw new Error("ORDER_NOT_FOUND")
      if (current.status === "delivered") throw new Error("DELIVERED_IMMUTABLE")
      if (current.status === "cancelled") throw new Error("INVALID_STATUS")
      const next = (status ?? current.status) as Status
      const transitions: Record<Status, Status[]> = { requested: ["requested", "ready", "cancelled"], ready: ["ready", "cancelled"], delivered: ["delivered"], cancelled: ["cancelled"] }
      if (!transitions[current.status].includes(next)) throw new Error("INVALID_STATUS")
      const existingItems = await tx.select().from(orderItems).where(eq(orderItems.orderId, id))
      if (customerId !== undefined) await verify(tx, businessId, customerId, lineItems ?? existingItems as Item[])
      if (lineItems !== undefined) { await tx.delete(orderItems).where(eq(orderItems.orderId, id)); await tx.insert(orderItems).values(lineItems.map((item: Item) => ({ id: item.id, orderId: id, productId: item.productId, qty: Number(item.qty), price: String(item.price), discount: String(item.discount ?? 0), unitCost: String(item.unitCost) }))) }
      if (next === "delivered") throw new Error("DELIVERY_REQUIRED")
      if (lineItems !== undefined) throw new Error("ORDER_ITEMS_IMMUTABLE")
      if (next === "cancelled") {
        const linkedPayments = await tx.select({ id: payments.id }).from(payments).where(and(eq(payments.businessId, businessId), eq(payments.orderId, id))).limit(1)
        if (linkedPayments.length) throw new Error("CANCEL_WITH_PAYMENTS_UNSUPPORTED")
        const existingReversal = await tx.select({ id: stockMovements.id }).from(stockMovements)
          .where(and(eq(stockMovements.businessId, businessId), eq(stockMovements.reference, `order:${id}:cancel`))).limit(1)
        if (!existingReversal.length) {
          await tx.insert(stockMovements).values(existingItems.map((item) => ({
            id: `SM-REVERSAL-${id}-${item.id}`, businessId, date: new Date().toISOString().slice(0, 10),
            productId: item.productId, type: "reversal" as const, qty: item.qty, reference: `order:${id}:cancel`,
          })))
          const [saleEntry] = await tx.select({ id: journalEntries.id }).from(journalEntries)
            .where(and(eq(journalEntries.businessId, businessId), eq(journalEntries.kind, "sale"), eq(journalEntries.reference, id))).limit(1)
          if (saleEntry) {
            const lines = await tx.select().from(journalEntryLines).where(eq(journalEntryLines.journalEntryId, saleEntry.id))
            const reversalId = `JE-REVERSAL-${id}`
            await tx.insert(journalEntries).values({ id: reversalId, businessId, entryDate: new Date().toISOString().slice(0, 10), kind: "reversal", reference: `order:${id}:cancel`, description: `Reversal of cancelled Order ${id}` })
            await tx.insert(journalEntryLines).values(lines.map((line) => ({
              id: `${reversalId}-${line.id}`, journalEntryId: reversalId, account: line.account,
              debit: line.credit, credit: line.debit,
            })))
          }
        }
      }
            await tx.update(orders).set({ ...(orderDate !== undefined ? { date: orderDate } : {}), ...(customerId !== undefined ? { customerId } : {}), ...(dueDate !== undefined ? { dueDate: dueDate || null } : {}), ...(notes !== undefined ? { notes: notes || null } : {}), status: next }).where(and(eq(orders.id, id), eq(orders.businessId, businessId)))
    })
    await writeAudit({ businessId, page: "Orders", action: `Updated order (${status ?? "details"})`, reference: id })
    return NextResponse.json({ message: "Order updated successfully", id })
  } catch (error) { return fail(error) }
}
  
