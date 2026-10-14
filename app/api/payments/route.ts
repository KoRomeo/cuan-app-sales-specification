import { NextResponse } from "next/server"
import { and, desc, eq, sql } from "drizzle-orm"
import { transactionDb } from "@/lib/db/transaction"
import {
  payments, orders, purchases, orderItems, purchaseItems,
  journalEntries, journalEntryLines,
} from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

export async function GET(request: Request) {
  try {
    const businessId = new URL(request.url).searchParams.get("businessId")
    if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const rows = await transactionDb.select().from(payments)
      .where(eq(payments.businessId, businessId)).orderBy(desc(payments.date))
    return NextResponse.json(rows)
  } catch (error) {
    console.error("Failed to fetch payments:", error)
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, businessId, orderId, purchaseId, date, amount, account } = body ?? {}
    if (typeof id !== "string" || !id.trim() || typeof businessId !== "string" || !businessId.trim() ||
        !validDate(date) || typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0 ||
        typeof account !== "string" || !account.trim()) {
      return NextResponse.json({ error: "Valid id, businessId, date, positive amount, and account are required" }, { status: 400 })
    }
    if ((!orderId && !purchaseId) || (orderId && purchaseId)) {
      return NextResponse.json({ error: "Provide exactly one of orderId or purchaseId" }, { status: 400 })
    }
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    await transactionDb.transaction(async (tx) => {
      const [existing] = await tx.select({ id: payments.id }).from(payments).where(eq(payments.id, id)).limit(1)
      if (existing) throw new Error("PAYMENT_ID_EXISTS")
      const [existingJournal] = await tx.select({ id: journalEntries.id }).from(journalEntries)
        .where(and(eq(journalEntries.businessId, businessId), eq(journalEntries.kind, "payment"), eq(journalEntries.reference, id))).limit(1)
      if (existingJournal) throw new Error("PAYMENT_JOURNAL_EXISTS")

      let total = 0
      let priorPayments = 0
      let description = ""
      if (orderId) {
        const [order] = await tx.select({ id: orders.id, status: orders.status }).from(orders)
          .where(and(eq(orders.id, orderId), eq(orders.businessId, businessId))).for("update").limit(1)
        if (!order) throw new Error("ORDER_NOT_FOUND")
        if (order.status === "cancelled") throw new Error("ORDER_CANCELLED")
        const lines = await tx.select({ qty: orderItems.qty, price: orderItems.price, discount: orderItems.discount })
          .from(orderItems).where(eq(orderItems.orderId, orderId))
        total = lines.reduce((sum, line) => sum + Number(line.qty) * Number(line.price) - Number(line.discount), 0)
        const [paid] = await tx.select({ amount: sql<string>`coalesce(sum(${payments.amount}), 0)` }).from(payments)
          .where(and(eq(payments.businessId, businessId), eq(payments.orderId, orderId)))
        priorPayments = Number(paid?.amount ?? 0)
        description = `Customer payment for ${orderId}`
      } else {
        const [purchase] = await tx.select({ id: purchases.id }).from(purchases)
          .where(and(eq(purchases.id, purchaseId), eq(purchases.businessId, businessId))).for("update").limit(1)
        if (!purchase) throw new Error("PURCHASE_NOT_FOUND")
        const lines = await tx.select({ qty: purchaseItems.qty, unitCost: purchaseItems.unitCost })
          .from(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId))
        total = lines.reduce((sum, line) => sum + Number(line.qty) * Number(line.unitCost), 0)
        const [paid] = await tx.select({ amount: sql<string>`coalesce(sum(${payments.amount}), 0)` }).from(payments)
          .where(and(eq(payments.businessId, businessId), eq(payments.purchaseId, purchaseId)))
        priorPayments = Number(paid?.amount ?? 0)
        description = `Supplier payment for ${purchaseId}`
      }
      if (amount + priorPayments > total + 0.005) throw new Error("PAYMENT_EXCEEDS_BALANCE")

      await tx.insert(payments).values({
        id, businessId, orderId: orderId || null, purchaseId: purchaseId || null,
        date, amount: amount.toFixed(2), account: account.trim(),
      })
      const entryId = `JE-PAY-${id}`
      await tx.insert(journalEntries).values({
        id: entryId, businessId, entryDate: date, kind: "payment", reference: id, description,
      })
      await tx.insert(journalEntryLines).values(orderId ? [
        { id: `${entryId}-debit`, journalEntryId: entryId, account: account.trim(), debit: amount.toFixed(2), credit: "0" },
        { id: `${entryId}-credit`, journalEntryId: entryId, account: "Accounts Receivable", debit: "0", credit: amount.toFixed(2) },
      ] : [
        { id: `${entryId}-debit`, journalEntryId: entryId, account: "Accounts Payable", debit: amount.toFixed(2), credit: "0" },
        { id: `${entryId}-credit`, journalEntryId: entryId, account: account.trim(), debit: "0", credit: amount.toFixed(2) },
      ])
    })
    return NextResponse.json({ message: "Payment recorded successfully", id }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    const known: Record<string, [string, number]> = {
      PAYMENT_ID_EXISTS: ["Payment ID already exists", 409],
      PAYMENT_JOURNAL_EXISTS: ["Payment journal already exists", 409],
      ORDER_NOT_FOUND: ["Order not found for this business", 404],
      PURCHASE_NOT_FOUND: ["Purchase not found for this business", 404],
      ORDER_CANCELLED: ["Cannot accept payment for a cancelled Order", 409],
      PAYMENT_EXCEEDS_BALANCE: ["Payment exceeds the remaining balance", 400],
    }
    if (known[message]) return NextResponse.json({ error: known[message][0] }, { status: known[message][1] })
    console.error("Failed to record payment:", error)
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 })
  }
}
