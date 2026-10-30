import { NextRequest, NextResponse } from "next/server"
import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import {
  businessMembers,
  financialAccounts,
  journalEntries,
  journalEntryLines,
  payments,
  products,
  purchaseItems,
  purchases,
  stockMovements,
  suppliers,
} from "@/lib/db/schema"
import { headers } from "next/headers"
import { generateEntityId } from "@/lib/db/ids"
import { writeAudit } from "@/lib/audit"

type PurchaseInputItem = {
  id: string
  productId: string
  qty: number
  unitCost: number
  discount?: number
  discountType?: 'amount' | 'percent'
}
function purchaseLineDiscount(item: PurchaseInputItem) { const gross=Number(item.qty)*Number(item.unitCost), value=Number(item.discount??0); return item.discountType==='percent'?gross*value/100:value }

async function access(businessId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { ok: false as const, status: 401, error: "Authentication required" }
  const [member] = await db
    .select({ role: businessMembers.role })
    .from(businessMembers)
    .where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, session.user.id)))
    .limit(1)
  return member
    ? { ok: true as const }
    : { ok: false as const, status: 403, error: "You do not have access to this business" }
}

function validDate(value: unknown): value is string {
  return typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : ""
  const known: Record<string, [string, number]> = {
    SUPPLIER_NOT_FOUND: ["Supplier not found for this business", 404],
    PRODUCT_NOT_FOUND: ["One or more products were not found for this business", 404],
    PURCHASE_ID_EXISTS: ["Purchase ID already exists", 409],
    PAYMENT_ID_EXISTS: ["Payment ID already exists", 409],
    INVALID_FINANCIAL_ACCOUNT: ["Select an active Cash & Bank account for this business", 400],
    PAYMENT_EXCEEDS_TOTAL: ["Payment cannot exceed the purchase total", 400],
  }
  if (known[message]) return NextResponse.json({ error: known[message][0] }, { status: known[message][1] })
  if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
    return NextResponse.json({ error: "A purchase, payment, or accounting reference already exists" }, { status: 409 })
  }
  console.error("Purchase operation failed", error)
  return NextResponse.json({ error: "Purchase operation failed" }, { status: 500 })
}

export async function GET(request: NextRequest) {
  try {
    const businessId = request.nextUrl.searchParams.get("businessId")
    if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    const allowed = await access(businessId)
    if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status })

    const rows = await db.select().from(purchases).where(eq(purchases.businessId, businessId))
    const lines = rows.length
      ? await db.select().from(purchaseItems).where(inArray(purchaseItems.purchaseId, rows.map((row) => row.id)))
      : []
    return NextResponse.json(rows.map((row) => ({
      ...row,
      items: lines.filter((line) => line.purchaseId === row.id),
    })))
  } catch (error) {
    return failure(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      businessId,
      date,
      supplierId,
      dueDate,
      notes,
      items,
      paidAmount = 0,
      paymentId,
      paymentDate,
      paymentAccount = "Cash",
    } = body as {
      businessId: string
      date: string
      supplierId: string
      dueDate?: string | null
      notes?: string | null
      items: PurchaseInputItem[]
      paidAmount?: number
      paymentId?: string
      paymentDate?: string
      paymentAccount?: string
    }

    if (
      ![businessId, supplierId].every((value) => typeof value === "string" && value.trim()) ||
      !validDate(date) ||
      (dueDate != null && dueDate !== "" && !validDate(dueDate)) ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json({ error: "Required purchase fields or items are invalid" }, { status: 400 })
    }

    if (items.some((item) =>
      !item ||
      typeof item.id !== "string" ||
      !item.id.trim() ||
      typeof item.productId !== "string" ||
      !Number.isSafeInteger(Number(item.qty)) ||
      Number(item.qty) <= 0 ||
      !Number.isFinite(Number(item.unitCost)) ||
      Number(item.unitCost) < 0 ||
      !Number.isFinite(Number(item.discount ?? 0)) || Number(item.discount ?? 0) < 0 ||
      ![undefined, 'amount', 'percent'].includes(item.discountType) ||
      (item.discountType === 'percent' ? Number(item.discount) > 100 : Number(item.discount ?? 0) > Number(item.qty)*Number(item.unitCost))
    )) {
      return NextResponse.json({ error: "Each item needs a valid ID, product, quantity, and cost" }, { status: 400 })
    }

    if (typeof paidAmount !== "number" || !Number.isFinite(paidAmount) || paidAmount < 0) {
      return NextResponse.json({ error: "paidAmount must be a valid non-negative number" }, { status: 400 })
    }
    if (paidAmount > 0 && (!paymentId?.trim() || !validDate(paymentDate ?? date) || !paymentAccount?.trim())) {
      return NextResponse.json({ error: "A payment ID, valid payment date, and account are required for a paid purchase" }, { status: 400 })
    }

    const allowed = await access(businessId)
    if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status })

    const id = await db.transaction(async (tx) => {
      const id = await generateEntityId(tx, purchases, businessId, "PUR", date)
      const [existing] = await tx.select({ id: purchases.id }).from(purchases).where(eq(purchases.id, id)).limit(1)
      if (existing) throw new Error("PURCHASE_ID_EXISTS")

      if (paidAmount > 0) {
        const [account] = await tx.select({ id: financialAccounts.id }).from(financialAccounts).where(and(eq(financialAccounts.businessId, businessId), eq(financialAccounts.name, paymentAccount!.trim()), eq(financialAccounts.active, true))).limit(1)
        if (!account) throw new Error("INVALID_FINANCIAL_ACCOUNT")
        const [existingPayment] = await tx.select({ id: payments.id }).from(payments).where(eq(payments.id, paymentId!)).limit(1)
        if (existingPayment) throw new Error("PAYMENT_ID_EXISTS")
      }

      const [supplier] = await tx.select({ id: suppliers.id })
        .from(suppliers)
        .where(and(eq(suppliers.id, supplierId), eq(suppliers.businessId, businessId)))
        .limit(1)
      if (!supplier) throw new Error("SUPPLIER_NOT_FOUND")

      const productIds = [...new Set(items.map((item) => item.productId))]
      const foundProducts = await tx.select({
        id: products.id,
        averageCost: products.averageCost,
      }).from(products).where(and(eq(products.businessId, businessId), inArray(products.id, productIds)))
      if (foundProducts.length !== productIds.length) throw new Error("PRODUCT_NOT_FOUND")

      const total = items.reduce((sum, item) => sum + Number(item.qty)*Number(item.unitCost)-purchaseLineDiscount(item), 0)
      if (paidAmount > total) throw new Error("PAYMENT_EXCEEDS_TOTAL")

      await tx.insert(purchases).values({
        id,
        businessId,
        date,
        supplierId,
        dueDate: dueDate || null,
        notes: notes || null,
      })
      await tx.insert(purchaseItems).values(items.map((item) => ({
        id: item.id,
        purchaseId: id,
        productId: item.productId,
        qty: Number(item.qty),
        unitCost: String(item.unitCost), discount: String(item.discount ?? 0), discountType: item.discountType ?? "amount",
      })))

      const existingMovements = await tx.select({
        productId: stockMovements.productId,
        qty: stockMovements.qty,
      }).from(stockMovements).where(and(
        eq(stockMovements.businessId, businessId),
        inArray(stockMovements.productId, productIds),
      ))

      const currentStock = new Map<string, number>()
      for (const movement of existingMovements) {
        currentStock.set(movement.productId, (currentStock.get(movement.productId) ?? 0) + movement.qty)
      }

      const quantities = new Map<string, { qty: number; totalCost: number }>()
      for (const item of items) {
        const current = quantities.get(item.productId) ?? { qty: 0, totalCost: 0 }
        current.qty += Number(item.qty)
        current.totalCost += Number(item.qty)*Number(item.unitCost)-purchaseLineDiscount(item)
        quantities.set(item.productId, current)
      }

      const movementRows = items.map((item, index) => ({
        id: `MOV-PUR-${id}-${index + 1}`,
        businessId,
        date,
        productId: item.productId,
        type: "purchase" as const,
        qty: Number(item.qty),
        reference: `purchase:${id}:receive`,
      }))
      await tx.insert(stockMovements).values(movementRows)

      for (const [productId, received] of quantities) {
        const product = foundProducts.find((row) => row.id === productId)!
        const stockBefore = currentStock.get(productId) ?? 0
        const oldAverage = Number(product.averageCost)
        const purchaseAverage = received.totalCost / received.qty
        const newAverage = stockBefore > 0
          ? ((stockBefore * oldAverage) + received.totalCost) / (stockBefore + received.qty)
          : purchaseAverage
        await tx.update(products)
          .set({ averageCost: newAverage.toFixed(2) })
          .where(and(eq(products.id, productId), eq(products.businessId, businessId)))
      }

      const purchaseJournalId = `JE-PUR-${id}`
      await tx.insert(journalEntries).values({
        id: purchaseJournalId,
        businessId,
        entryDate: date,
        kind: "purchase",
        reference: id,
        description: `Inventory purchased from ${supplierId}`,
      })
      await tx.insert(journalEntryLines).values([
        { id: `${purchaseJournalId}-inventory`, journalEntryId: purchaseJournalId, account: "Inventory", debit: total.toFixed(2), credit: "0" },
        { id: `${purchaseJournalId}-payable`, journalEntryId: purchaseJournalId, account: "Accounts Payable", debit: "0", credit: total.toFixed(2) },
      ])

      if (paidAmount > 0) {
        await tx.insert(payments).values({
          id: paymentId!,
          businessId,
          orderId: null,
          purchaseId: id,
          date: paymentDate || date,
          amount: paidAmount.toFixed(2),
          account: paymentAccount!.trim(),
        })
        const paymentJournalId = `JE-PAY-${paymentId}`
        await tx.insert(journalEntries).values({
          id: paymentJournalId,
          businessId,
          entryDate: paymentDate || date,
          kind: "payment",
          reference: paymentId!,
          description: `Supplier payment from ${paymentAccount!.trim()} for ${id}`,
        })
        await tx.insert(journalEntryLines).values([
          { id: `${paymentJournalId}-debit`, journalEntryId: paymentJournalId, account: "Accounts Payable", debit: paidAmount.toFixed(2), credit: "0" },
          { id: `${paymentJournalId}-credit`, journalEntryId: paymentJournalId, account: paymentAccount!.trim(), debit: "0", credit: paidAmount.toFixed(2) },
        ])
      }
      return id
    })

    await writeAudit({ businessId, page: "Purchases", action: "Created purchase", reference: id })
    return NextResponse.json({ message: "Purchase created successfully", id }, { status: 201 })
  } catch (error) {
    return failure(error)
  }
}
