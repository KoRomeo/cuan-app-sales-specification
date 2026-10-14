import { NextResponse } from "next/server"
import { and, desc, eq, inArray, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  journalEntries,
  journalEntryLines,
  orderItems,
  orders,
  products,
  replacements,
  stockMovements,
} from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"
import { generateEntityId } from "@/lib/db/ids"

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

export async function GET(request: Request) {
  try {
    const businessId = new URL(request.url).searchParams.get("businessId")
    if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const rows = await db.select().from(replacements).where(eq(replacements.businessId, businessId)).orderBy(desc(replacements.date))
    const orderIds = [...new Set(rows.map((row) => row.orderId))]
    const lines = orderIds.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)) : []
    return NextResponse.json(rows.map((row) => {
      const line = lines.find((item) => item.orderId === row.orderId && item.productId === row.productId)
      return {
        ...row,
        returnValue: line ? Math.max(0, Number(line.price) * row.qty - Number(line.discount)) : 0,
      }
    }))
  } catch (error) {
    console.error("GET /api/replacements", error)
    return NextResponse.json({ error: "Failed to fetch replacements" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { businessId, date, orderId, productId, qty, reason } = body ?? {}
    if (typeof businessId !== "string" || !businessId.trim() || !validDate(date) ||
        typeof orderId !== "string" || !orderId.trim() ||
        typeof productId !== "string" || !productId.trim() ||
        !Number.isSafeInteger(qty) || qty <= 0 ||
        typeof reason !== "string" || !reason.trim()) {
      return NextResponse.json({ error: "Valid business, date, order, product, quantity and reason are required" }, { status: 400 })
    }
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const replacement = await db.transaction(async (tx) => {
      const [order] = await tx.select({ id: orders.id, status: orders.status }).from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.businessId, businessId))).for("update").limit(1)
      if (!order) throw new Error("ORDER_NOT_FOUND")
      if (order.status === "cancelled") throw new Error("ORDER_CANCELLED")
      const [soldLine] = await tx.select({
        id: orderItems.id, qty: orderItems.qty, price: orderItems.price,
        discount: orderItems.discount,
      }).from(orderItems).where(and(eq(orderItems.orderId, orderId), eq(orderItems.productId, productId))).limit(1)
      if (!soldLine) throw new Error("PRODUCT_NOT_IN_ORDER")
      const [product] = await tx.select({ id: products.id, averageCost: products.averageCost }).from(products)
        .where(and(eq(products.id, productId), eq(products.businessId, businessId))).for("update").limit(1)
      if (!product) throw new Error("PRODUCT_NOT_FOUND")
      const [previous] = await tx.select({ qty: sql<number>`coalesce(sum(${replacements.qty}), 0)` })
        .from(replacements).where(and(
          eq(replacements.businessId, businessId),
          eq(replacements.orderId, orderId),
          eq(replacements.productId, productId),
        ))
      if (Number(previous?.qty ?? 0) + qty > soldLine.qty) throw new Error("REPLACEMENT_QTY_EXCEEDS_SOLD")
      const id = await generateEntityId(tx, replacements, businessId, "RPL", date)
      const [created] = await tx.insert(replacements).values({
        id, businessId, date, orderId, productId, qty, reason: reason.trim(), delivered: false,
      }).returning()
      // Replacement stock is consumed once when the replacement obligation is created.
      // The returned/damaged units are not put back into sellable stock.
      await tx.insert(stockMovements).values({
        id: `SM-REPLACEMENT-${id}`, businessId, date, productId,
        type: "replacement", qty: -qty, reference: `replacement:${id}:issue`,
      })
      const replacementCost = Number(product.averageCost) * qty
      const entryId = `JE-REPLACEMENT-${id}`
      await tx.insert(journalEntries).values({
        id: entryId, businessId, entryDate: date, kind: "replacement",
        reference: id, description: `Replacement stock issued for ${orderId}`,
      })
      await tx.insert(journalEntryLines).values([
        { id: `${entryId}-cogs`, journalEntryId: entryId, account: "Cost of Goods Sold", debit: replacementCost.toFixed(2), credit: "0" },
        { id: `${entryId}-inventory`, journalEntryId: entryId, account: "Inventory", debit: "0", credit: replacementCost.toFixed(2) },
      ])
      return { ...created, returnValue: Math.max(0, Number(soldLine.price) * qty - Number(soldLine.discount)) }
    })
    return NextResponse.json(replacement, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    const known: Record<string, [string, number]> = {
      ORDER_NOT_FOUND: ["Order not found for this business", 404],
      ORDER_CANCELLED: ["Cannot create a replacement for a cancelled Order", 409],
      PRODUCT_NOT_FOUND: ["Product not found for this business", 404],
      PRODUCT_NOT_IN_ORDER: ["This product is not part of the original Order", 400],
      REPLACEMENT_QTY_EXCEEDS_SOLD: ["Total replacement quantity cannot exceed the quantity originally sold", 409],
    }
    if (known[message]) return NextResponse.json({ error: known[message][0] }, { status: known[message][1] })
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return NextResponse.json({ error: "A replacement or accounting reference already exists" }, { status: 409 })
    }
    console.error("POST /api/replacements", error)
    return NextResponse.json({ error: "Failed to create replacement" }, { status: 500 })
  }
}
