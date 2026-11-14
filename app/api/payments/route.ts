import { NextResponse } from "next/server"
import { and, desc, eq, sql } from "drizzle-orm"
import { transactionDb } from "@/lib/db/transaction"
import { generateEntityId } from "@/lib/db/ids"
import {
  payments, orders, purchases, orderItems, purchaseItems,
  journalEntries, journalEntryLines, financialAccounts,
} from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

// Line total honours percent vs amount discounts so the order balance matches the invoice.
function lineTotal(qty: number, price: number, discount: number, discountType: string) {
  const gross = qty * price
  return Math.max(0, gross - (discountType === "percent" ? gross * discount / 100 : discount))
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
    const { businessId, orderId, purchaseId, date, amount, account } = body ?? {}
    if (typeof businessId !== "string" || !businessId.trim() ||
        !validDate(date) || typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0 ||
        typeof account !== "string" || !account.trim()) {
      return NextResponse.json({ error: "Valid businessId, date, positive amount, and account are required" }, { status: 400 })
    }
    if ((!orderId && !purchaseId) || (orderId && purchaseId)) {
      return NextResponse.json({ error: "Provide exactly one of orderId or purchaseId" }, { status: 400 })
    }
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const paymentId = await transactionDb.transaction(async (tx) => {
      const [cashAccount] = await tx.select({ id: financialAccounts.id }).from(financialAccounts)
        .where(and(
          eq(financialAccounts.businessId, businessId),
          eq(financialAccounts.name, account.trim()),
          eq(financialAccounts.active, true),
        )).limit(1)
      if (!cashAccount) throw new Error("INVALID_FINANCIAL_ACCOUNT")
      // Server-owned ID: PREFIX-YYYYMMDD-NNNN, regardless of any client-supplied id.
      const id = await generateEntityId(tx, payments, businessId, "PAY", date)

      let total = 0
      let priorPayments = 0
      let description = ""
      if (orderId) {
        const [order] = await tx.select({ id: orders.id, status: orders.status, taxAmount: orders.taxAmount }).from(orders)
          .where(and(eq(orders.id, orderId), eq(orders.businessId, businessId))).for("update").limit(1)
        if (!order) throw new Error("ORDER_NOT_FOUND")
        if (order.status === "cancelled") throw new Error("ORDER_CANCELLED")
        const lines = await tx.select({ qty: orderItems.qty, price: orderItems.price, discount: orderItems.discount, discountType: orderItems.discountType })
          .from(orderItems).where(eq(orderItems.orderId, orderId))
        total = lines.reduce((sum, line) => sum + lineTotal(Number(line.qty), Number(line.price), Number(line.discount), line.discountType), 0) + Number(order.taxAmount)
        const [paid] = await tx.select({ amount: sql<string>`coalesce(sum(${payments.amount}), 0)` }).from(payments)
          .where(and(eq(payments.businessId, businessId), eq(payments.orderId, orderId)))
        priorPayments = Number(paid?.amount ?? 0)
        description = `Customer payment received into ${account.trim()} for ${orderId}`
      } else {
        const [purchase] = await tx.select({ id: purchases.id, status: purchases.status, totalOverride: purchases.totalOverride }).from(purchases)
          .where(and(eq(purchases.id, purchaseId), eq(purchases.businessId, businessId))).for("update").limit(1)
        if (!purchase) throw new Error("PURCHASE_NOT_FOUND")
        if (purchase.status === "cancelled") throw new Error("PURCHASE_CANCELLED")
        const lines = await tx.select({ qty: purchaseItems.qty, unitCost: purchaseItems.unitCost, discount: purchaseItems.discount, discountType: purchaseItems.discountType })
          .from(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId))
        total = purchase.totalOverride != null ? Number(purchase.totalOverride) : lines.reduce((sum, line) => { const gross = Number(line.qty) * Number(line.unitCost); const discount = line.discountType === "percent" ? gross * Number(line.discount) / 100 : Number(line.discount); return sum + Math.ceil(Math.max(0, gross - discount) - 1e-9) }, 0)
        const [paid] = await tx.select({ amount: sql<string>`coalesce(sum(${payments.amount}), 0)` }).from(payments)
          .where(and(eq(payments.businessId, businessId), eq(payments.purchaseId, purchaseId)))
        priorPayments = Number(paid?.amount ?? 0)
        description = `Supplier payment from ${account.trim()} for ${purchaseId}`
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
      return id
    })
    await writeAudit({ businessId, page: "Payments", action: orderId ? "Recorded customer payment" : "Recorded supplier payment", reference: paymentId })
    return NextResponse.json({ message: "Payment recorded successfully", id: paymentId }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    const known: Record<string, [string, number]> = {
      INVALID_FINANCIAL_ACCOUNT: ["Select an active Cash & Bank account for this business", 400],
      PAYMENT_ID_EXISTS: ["Payment ID already exists", 409],
      PAYMENT_JOURNAL_EXISTS: ["Payment journal already exists", 409],
      ORDER_NOT_FOUND: ["Order not found for this business", 404],
      PURCHASE_NOT_FOUND: ["Purchase not found for this business", 404],
      PURCHASE_CANCELLED: ["Cannot record payment for a cancelled purchase", 409],
      ORDER_CANCELLED: ["Cannot accept payment for a cancelled Order", 409],
      PAYMENT_EXCEEDS_BALANCE: ["Payment exceeds the remaining balance", 400],
    }
    if (known[message]) return NextResponse.json({ error: known[message][0] }, { status: known[message][1] })
    console.error("Failed to record payment:", error)
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 })
  }
}
