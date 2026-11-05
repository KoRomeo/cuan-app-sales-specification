import { NextRequest, NextResponse } from "next/server"
import { and, desc, eq, inArray, isNull } from "drizzle-orm"
import { randomUUID } from "node:crypto"
import { db } from "@/lib/db"
import { requireBusinessAccess } from "@/lib/api-auth"
import {
  deliveries, notifications, orderItems, orders, payments, products,
  purchaseDocuments, purchaseItems, purchases, stockMovements,
} from "@/lib/db/schema"

type Kind =
  | "negative_stock" | "low_stock" | "order_requested" | "order_ready"
  | "purchase_unreceived" | "invoice_review" | "invoice_failed"
  | "receivable_overdue" | "receivable_due" | "payable_overdue" | "payable_due"

type Event = {
  fingerprint: string
  kind: Kind
  entityId: string | null
  payload: Record<string, string | number | null>
  href: string
  priority: "critical" | "warning" | "info"
}

const money = (value: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.round(value))
const dateInDays = (days: number) => {
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
const today = () => dateInDays(0)

function lineTotal(qty: number, unitPrice: number, discount: number, discountType: string) {
  const gross = qty * unitPrice
  return Math.max(0, gross - (discountType === "percent" ? gross * discount / 100 : discount))
}

function localized(kind: Kind, payload: Event["payload"], locale: string) {
  const id = locale === "id"
  const name = String(payload.name ?? payload.id ?? "")
  const amount = money(Number(payload.amount ?? 0))
  const due = String(payload.dueDate ?? "")
  const stock = Number(payload.stock ?? 0)
  const count = Number(payload.count ?? 0)
  const messages: Record<Kind, [string, string, string, string]> = {
    negative_stock: ["Negative stock", `${name} has ${Math.abs(stock)} units of negative stock.`, "Stok negatif", `${name} memiliki stok negatif sebanyak ${Math.abs(stock)} unit.`],
    low_stock: ["Low stock", `${name} is below its minimum stock level (${stock} remaining).`, "Stok menipis", `${name} berada di bawah batas minimum (tersisa ${stock}).`],
    order_requested: ["New order needs attention", `Order ${name} is waiting for processing.`, "Pesanan baru perlu diproses", `Pesanan ${name} menunggu diproses.`],
    order_ready: ["Order ready for delivery", `Order ${name} is ready and has no delivery record yet.`, "Pesanan siap dikirim", `Pesanan ${name} siap dikirim dan belum memiliki catatan pengiriman.`],
    purchase_unreceived: ["Purchase awaiting receipt", `Purchase ${name} has not been marked as received.`, "Pembelian belum diterima", `Pembelian ${name} belum ditandai sudah diterima.`],
    invoice_review: ["Purchase invoice needs review", `Invoice ${name} is waiting for your review.`, "Faktur pembelian perlu ditinjau", `Faktur ${name} menunggu ditinjau.`],
    invoice_failed: ["Invoice processing failed", `Invoice ${name} could not be processed. Open it to review the error.`, "Pemrosesan faktur gagal", `Faktur ${name} gagal diproses. Buka untuk memeriksa kendalanya.`],
    receivable_overdue: ["Overdue receivable", `${name} has an outstanding balance of Rp${amount}; due ${due}.`, "Piutang jatuh tempo", `${name} masih memiliki piutang Rp${amount}; jatuh tempo ${due}.`],
    receivable_due: ["Receivable due soon", `${name} has Rp${amount} outstanding; due ${due}.`, "Piutang segera jatuh tempo", `${name} memiliki piutang Rp${amount}; jatuh tempo ${due}.`],
    payable_overdue: ["Overdue payable", `${name} has an outstanding balance of Rp${amount}; due ${due}.`, "Utang jatuh tempo", `${name} masih memiliki utang Rp${amount}; jatuh tempo ${due}.`],
    payable_due: ["Payable due soon", `${name} has Rp${amount} outstanding; due ${due}.`, "Utang segera jatuh tempo", `${name} memiliki utang Rp${amount}; jatuh tempo ${due}.`],
  }
  const message = messages[kind]
  return { title: id ? message[2] : message[0], description: id ? message[3] : message[1], count }
}

export async function GET(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get("businessId") ?? ""
  const locale = request.nextUrl.searchParams.get("locale") ?? "en"
  const access = await requireBusinessAccess(businessId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  try {
    const [
      productRows, movementRows, orderRows, purchaseRows, paymentRows,
      documentRows, deliveryRows,
    ] = await Promise.all([
      db.select().from(products).where(eq(products.businessId, businessId)),
      db.select().from(stockMovements).where(eq(stockMovements.businessId, businessId)),
      db.select().from(orders).where(eq(orders.businessId, businessId)),
      db.select().from(purchases).where(eq(purchases.businessId, businessId)),
      db.select().from(payments).where(eq(payments.businessId, businessId)),
      db.select().from(purchaseDocuments).where(eq(purchaseDocuments.businessId, businessId)),
      db.select({ orderId: deliveries.orderId }).from(deliveries).innerJoin(orders, eq(orders.id, deliveries.orderId)).where(eq(orders.businessId, businessId)),
    ])

    const events: Event[] = []
    const stockByProduct = new Map<string, number>()
    for (const movement of movementRows) stockByProduct.set(movement.productId, (stockByProduct.get(movement.productId) ?? 0) + movement.qty)
    for (const product of productRows) {
      const stock = stockByProduct.get(product.id) ?? 0
      if (stock < 0) events.push({ fingerprint: `stock:negative:${product.id}`, kind: "negative_stock", entityId: product.id, payload: { name: product.name, stock }, href: "/stock?filter=negative", priority: "critical" })
      else if (product.minimumStock > 0 && stock < product.minimumStock) events.push({ fingerprint: `stock:low:${product.id}`, kind: "low_stock", entityId: product.id, payload: { name: product.name, stock }, href: "/stock?filter=low", priority: "warning" })
    }

    const orderIds = orderRows.map(row => row.id)
    const purchaseIds = purchaseRows.map(row => row.id)
    const [orderLineRows, purchaseLineRows] = await Promise.all([
      orderIds.length ? db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)) : Promise.resolve([]),
      purchaseIds.length ? db.select().from(purchaseItems).where(inArray(purchaseItems.purchaseId, purchaseIds)) : Promise.resolve([]),
    ])
    const deliveredOrderIds = new Set(deliveryRows.map(row => row.orderId).filter((id): id is string => Boolean(id)))
    for (const order of orderRows) {
      if (order.status === "requested") events.push({ fingerprint: `order:requested:${order.id}`, kind: "order_requested", entityId: order.id, payload: { name: order.id }, href: `/orders/${order.id}`, priority: "info" })
      if (order.status === "ready" && !deliveredOrderIds.has(order.id)) events.push({ fingerprint: `order:ready:${order.id}`, kind: "order_ready", entityId: order.id, payload: { name: order.id }, href: `/orders/${order.id}`, priority: "warning" })
    }

    const movementReferences = new Set(movementRows.map(row => row.reference))
    for (const purchase of purchaseRows) {
      if (purchase.status !== "cancelled" && !movementReferences.has(`purchase:${purchase.id}:receive`)) {
        events.push({ fingerprint: `purchase:unreceived:${purchase.id}`, kind: "purchase_unreceived", entityId: purchase.id, payload: { name: purchase.id }, href: `/purchases/${purchase.id}`, priority: "warning" })
      }
    }

    for (const document of documentRows) {
      if (document.status === "review") events.push({ fingerprint: `invoice:review:${document.id}`, kind: "invoice_review", entityId: document.id, payload: { name: document.fileName }, href: `/purchase-invoice/${document.id}/review`, priority: "info" })
      if (document.status === "failed") events.push({ fingerprint: `invoice:failed:${document.id}`, kind: "invoice_failed", entityId: document.id, payload: { name: document.fileName }, href: `/purchase-invoice/${document.id}`, priority: "critical" })
    }

    const todayDate = today()
    const soonDate = dateInDays(3)
    for (const order of orderRows) {
      if (order.status === "cancelled" || !order.dueDate) continue
      const total = orderLineRows.filter(line => line.orderId === order.id).reduce((sum, line) => sum + lineTotal(line.qty, Number(line.price), Number(line.discount), line.discountType), 0)
      const paid = paymentRows.filter(payment => payment.orderId === order.id).reduce((sum, payment) => sum + Number(payment.amount), 0)
      const outstanding = Math.max(0, total - paid)
      if (outstanding <= 0) continue
      if (order.dueDate < todayDate) events.push({ fingerprint: `receivable:overdue:${order.id}`, kind: "receivable_overdue", entityId: order.id, payload: { name: order.id, amount: outstanding, dueDate: order.dueDate }, href: "/receivables", priority: "critical" })
      else if (order.dueDate <= soonDate) events.push({ fingerprint: `receivable:due:${order.id}`, kind: "receivable_due", entityId: order.id, payload: { name: order.id, amount: outstanding, dueDate: order.dueDate }, href: "/receivables", priority: "warning" })
    }
    for (const purchase of purchaseRows) {
      if (purchase.status === "canceled" || !purchase.dueDate) continue
      const lines = purchaseLineRows.filter(line => line.purchaseId === purchase.id)
      const calculated = lines.reduce((sum, line) => sum + lineTotal(line.qty, Number(line.unitCost), Number(line.discount), line.discountType), 0)
      const total = purchase.totalOverride == null ? calculated : Number(purchase.totalOverride)
      const paid = paymentRows.filter(payment => payment.purchaseId === purchase.id).reduce((sum, payment) => sum + Number(payment.amount), 0)
      const outstanding = Math.max(0, total - paid)
      if (outstanding <= 0) continue
      if (purchase.dueDate < todayDate) events.push({ fingerprint: `payable:overdue:${purchase.id}`, kind: "payable_overdue", entityId: purchase.id, payload: { name: purchase.id, amount: outstanding, dueDate: purchase.dueDate }, href: "/payables", priority: "critical" })
      else if (purchase.dueDate <= soonDate) events.push({ fingerprint: `payable:due:${purchase.id}`, kind: "payable_due", entityId: purchase.id, payload: { name: purchase.id, amount: outstanding, dueDate: purchase.dueDate }, href: "/payables", priority: "warning" })
    }

    await db.transaction(async tx => {
      const activeRows = await tx.select().from(notifications).where(and(
        eq(notifications.businessId, businessId),
        eq(notifications.userId, access.userId),
        isNull(notifications.resolvedAt),
      )).for("update")
      const activeByFingerprint = new Map(activeRows.map(row => [row.fingerprint, row]))
      const currentFingerprints = new Set(events.map(event => event.fingerprint))
      for (const event of events) {
        const existing = activeByFingerprint.get(event.fingerprint)
        if (existing) {
          await tx.update(notifications).set({
            kind: event.kind, entityId: event.entityId, payload: event.payload,
            href: event.href, priority: event.priority, updatedAt: new Date(),
          }).where(eq(notifications.id, existing.id))
        } else {
          await tx.insert(notifications).values({
            id: `NTF-${randomUUID()}`, businessId, userId: access.userId,
            fingerprint: event.fingerprint, kind: event.kind, entityId: event.entityId,
            payload: event.payload, href: event.href, priority: event.priority,
          })
        }
      }
      const staleIds = activeRows.filter(row => !currentFingerprints.has(row.fingerprint)).map(row => row.id)
      if (staleIds.length) await tx.update(notifications).set({ resolvedAt: new Date(), updatedAt: new Date() }).where(inArray(notifications.id, staleIds))
    })

    const rows = await db.select().from(notifications)
      .where(and(eq(notifications.businessId, businessId), eq(notifications.userId, access.userId)))
      .orderBy(desc(notifications.createdAt)).limit(200)
    const items = rows.map(row => ({
      id: row.id, kind: row.kind, entityId: row.entityId, href: row.href,
      priority: row.priority, isRead: row.isRead, createdAt: row.createdAt,
      resolvedAt: row.resolvedAt, ...localized(row.kind as Kind, row.payload, locale),
    }))
    return NextResponse.json({
      items,
      unreadCount: items.filter(item => !item.isRead && !item.resolvedAt).length,
      activeCount: items.filter(item => !item.resolvedAt).length,
    })
  } catch (error) {
    console.error("GET notifications failed", error)
    const databaseError = error as { code?: string; cause?: { code?: string } }
    const code = databaseError?.code ?? databaseError?.cause?.code
    if (code === "42P01" || code === "42703") return NextResponse.json({ error: "Notification database migration is required. Run pnpm db:migrate." }, { status: 503 })
    return NextResponse.json({ error: "Unable to load notifications" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const businessId = typeof body.businessId === "string" ? body.businessId : ""
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    if (body.all === true) {
      await db.update(notifications).set({ isRead: true, updatedAt: new Date() }).where(and(
        eq(notifications.businessId, businessId), eq(notifications.userId, access.userId),
        eq(notifications.isRead, false), isNull(notifications.resolvedAt),
      ))
      return NextResponse.json({ success: true })
    }
    if (typeof body.id !== "string" || !body.id) return NextResponse.json({ error: "A notification id is required" }, { status: 400 })
    await db.update(notifications).set({ isRead: true, updatedAt: new Date() }).where(and(
      eq(notifications.id, body.id), eq(notifications.businessId, businessId),
      eq(notifications.userId, access.userId),
    ))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PATCH notifications failed", error)
    return NextResponse.json({ error: "Unable to update notification" }, { status: 500 })
  }
}
