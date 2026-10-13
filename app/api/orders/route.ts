import { NextRequest, NextResponse } from "next/server"
import { and, eq, inArray, like, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { businessMembers, customers, journalEntries, journalEntryLines, orderItems, orders, payments, products, stockMovements } from "@/lib/db/schema"
import { headers } from "next/headers"

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
  const map: Record<string, [string, number]> = { CUSTOMER_NOT_FOUND: ["Customer not found for this business", 404], PRODUCT_NOT_FOUND: ["One or more products were not found for this business", 404], PAYMENT_EXCEEDS_TOTAL: ["Payment cannot exceed order total", 400], PAYMENT_ID_EXISTS: ["Payment ID already exists", 409], ORDER_NOT_FOUND: ["Order not found", 404], ORDER_ID_EXISTS: ["Order ID already exists", 409], INVALID_STATUS: ["Invalid order status transition", 409], DELIVERED_IMMUTABLE: ["Delivered orders cannot be edited or cancelled", 409], DELIVERY_ALREADY_PROCESSED: ["Stock deduction for this order was already recorded", 409], NEGATIVE_STOCK: ["Delivery would create negative stock", 409] }
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
      // Allocate IDs on the server, serialized globally by calendar month because IDs are primary keys.
      const [year, month] = orderDate.split("-");
      const prefix = `ORD-${year}${month}-`;

      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(0, hashtext(${prefix}))`,
      );

      const [latest] = await tx
        .select({ id: orders.id })
        .from(orders)
        .where(like(orders.id, `${prefix}%`))
        .orderBy(sql`${orders.id} DESC`)
        .limit(1);

      const lastNumber = latest ? Number(latest.id.slice(prefix.length)) : 0;
      if (!Number.isSafeInteger(lastNumber) || lastNumber < 0 || lastNumber >= 9999) {
        throw new Error("ORDER_ID_SEQUENCE_EXHAUSTED");
      }
      const id = `${prefix}${String(lastNumber + 1).padStart(4, "0")}`;

      await verify(tx, businessId, customerId, lineItems)
      const productRows = await tx.select({ id: products.id, sellingPrice: products.sellingPrice, averageCost: products.averageCost }).from(products).where(and(eq(products.businessId, businessId), inArray(products.id, [...new Set(lineItems.map((item) => item.productId))])))
      const byProduct = new Map(productRows.map((product) => [product.id, product]))
      const normalizedItems = lineItems.map((item) => ({ ...item, price: Number(byProduct.get(item.productId)?.sellingPrice), unitCost: Number(byProduct.get(item.productId)?.averageCost) }))
      const total = normalizedItems.reduce((sum, item) => sum + item.qty * item.price - Number(item.discount ?? 0), 0)
      if (paidAmount > total) throw new Error("PAYMENT_EXCEEDS_TOTAL")
      await tx.insert(orders).values({ id, businessId, date: orderDate, customerId, status, dueDate: dueDate || null, notes: notes || null })
      await tx.insert(orderItems).values(normalizedItems.map((item) => ({ id: item.id, orderId: id, productId: item.productId, qty: Number(item.qty), price: String(item.price), discount: String(item.discount ?? 0), unitCost: String(item.unitCost) })))
      if (paidAmount > 0) {
        const [existingPayment] = await tx.select({ id: payments.id }).from(payments).where(eq(payments.id, paymentId)).limit(1)
        if (existingPayment) throw new Error("PAYMENT_ID_EXISTS")
        const entryId = `JE-PAY-${paymentId}`
        await tx.insert(payments).values({ id: paymentId, businessId, orderId: id, purchaseId: null, date: paymentDate, amount: paidAmount.toFixed(2), account: paymentAccount.trim() })
        await tx.insert(journalEntries).values({ id: entryId, businessId, entryDate: paymentDate, kind: "payment", reference: paymentId, description: `Customer payment for ${id}` })
        await tx.insert(journalEntryLines).values([{ id: `${entryId}-debit`, journalEntryId: entryId, account: paymentAccount.trim(), debit: paidAmount.toFixed(2), credit: "0" }, { id: `${entryId}-credit`, journalEntryId: entryId, account: "Accounts Receivable", debit: "0", credit: paidAmount.toFixed(2) }])
      }
      return id
    })
    return NextResponse.json({ message: "Order created successfully", id }, { status: 201 })
  } catch (error) { return fail(error) }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      id,
      businessId,
      date: orderDate,
      status,
      dueDate,
      notes,
    } = body

    if (
      typeof id !== "string" ||
      !id.trim() ||
      typeof businessId !== "string" ||
      !businessId.trim()
    ) {
      return NextResponse.json(
        { error: "id and businessId are required" },
        { status: 400 },
      )
    }

    if (
      (orderDate !== undefined &&
        !date(orderDate)) ||
      (dueDate !== undefined &&
        dueDate !== null &&
        dueDate !== "" &&
        !date(dueDate)) ||
      (status !== undefined &&
        !["requested", "ready"].includes(status)) ||
      (notes !== undefined &&
        notes !== null &&
        typeof notes !== "string")
    ) {
      return NextResponse.json(
        { error: "Invalid order fields" },
        { status: 400 },
      )
    }

    const allowed = await access(businessId)

    if (!allowed.ok) {
      return NextResponse.json(
        { error: allowed.error },
        { status: allowed.status },
      )
    }

    await db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.id, id),
            eq(orders.businessId, businessId),
          ),
        )
        .for("update")
        .limit(1)

      if (!current) {
        throw new Error("ORDER_NOT_FOUND")
      }

      if (
        current.status === "delivered" ||
        current.status === "cancelled"
      ) {
        throw new Error("INVALID_STATUS")
      }

      const nextStatus = status ?? current.status

      const validTransition =
        current.status === "requested"
          ? ["requested", "ready"].includes(nextStatus)
          : nextStatus === "ready"

      if (!validTransition) {
        throw new Error("INVALID_STATUS")
      }

      await tx
        .update(orders)
        .set({
          ...(orderDate !== undefined
            ? { date: orderDate }
            : {}),
          ...(dueDate !== undefined
            ? { dueDate: dueDate || null }
            : {}),
          ...(notes !== undefined
            ? { notes: notes || null }
            : {}),
          status: nextStatus,
        })
        .where(
          and(
            eq(orders.id, id),
            eq(orders.businessId, businessId),
          ),
        )
    })

    return NextResponse.json({
      message: "Order updated successfully",
      id,
    })
  } catch (error) {
    return fail(error)
  }
}
  
