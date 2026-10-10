import { NextRequest, NextResponse } from "next/server"
import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { businessMembers, products, purchaseItems, purchases, suppliers } from "@/lib/db/schema"
import { headers } from "next/headers"

async function access(businessId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { ok: false as const, status: 401, error: "Authentication required" }
  const [member] = await db.select({ role: businessMembers.role }).from(businessMembers).where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, session.user.id))).limit(1)
  return member ? { ok: true as const } : { ok: false as const, status: 403, error: "You do not have access to this business" }
}
function validDate(value: unknown) { return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) }
function failure(error: unknown) {
  const message = error instanceof Error ? error.message : ""
  const known: Record<string, [string, number]> = { SUPPLIER_NOT_FOUND: ["Supplier not found for this business", 404], PRODUCT_NOT_FOUND: ["One or more products were not found for this business", 404], PURCHASE_ID_EXISTS: ["Purchase ID already exists", 409] }
  if (known[message]) return NextResponse.json({ error: known[message][0] }, { status: known[message][1] })
  console.error("Purchase operation failed", error); return NextResponse.json({ error: "Purchase operation failed" }, { status: 500 })
}

export async function GET(request: NextRequest) {
  try {
    const businessId = request.nextUrl.searchParams.get("businessId"); if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    const allowed = await access(businessId); if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status })
    const rows = await db.select().from(purchases).where(eq(purchases.businessId, businessId)); const lines = rows.length ? await db.select().from(purchaseItems).where(inArray(purchaseItems.purchaseId, rows.map((row) => row.id))) : []
    return NextResponse.json(rows.map((row) => ({ ...row, items: lines.filter((line) => line.purchaseId === row.id) })))
  } catch (error) { return failure(error) }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json(); const { id, businessId, date, supplierId, dueDate, notes, items } = body
    if (![id, businessId, supplierId].every((value) => typeof value === "string" && value.trim()) || !validDate(date) || dueDate && !validDate(dueDate) || !Array.isArray(items) || items.length === 0) return NextResponse.json({ error: "Required purchase fields or items are invalid" }, { status: 400 })
    if (items.some((item) => !item || typeof item.id !== "string" || typeof item.productId !== "string" || !Number.isSafeInteger(Number(item.qty)) || Number(item.qty) <= 0 || !Number.isFinite(Number(item.unitCost)) || Number(item.unitCost) < 0)) return NextResponse.json({ error: "Each item needs a valid ID, product, quantity, and cost" }, { status: 400 })
    const allowed = await access(businessId); if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: allowed.status })
    await db.transaction(async (tx) => {
      const [existing] = await tx.select({ id: purchases.id }).from(purchases).where(eq(purchases.id, id)).limit(1); if (existing) throw new Error("PURCHASE_ID_EXISTS")
      const [supplier] = await tx.select({ id: suppliers.id }).from(suppliers).where(and(eq(suppliers.id, supplierId), eq(suppliers.businessId, businessId))).limit(1); if (!supplier) throw new Error("SUPPLIER_NOT_FOUND")
      const productIds = [...new Set(items.map((item: any) => item.productId))]; const found = await tx.select({ id: products.id }).from(products).where(and(eq(products.businessId, businessId), inArray(products.id, productIds))); if (found.length !== productIds.length) throw new Error("PRODUCT_NOT_FOUND")
      await tx.insert(purchases).values({ id, businessId, date, supplierId, dueDate: dueDate || null, notes: notes || null })
      await tx.insert(purchaseItems).values(items.map((item: any) => ({ id: item.id, purchaseId: id, productId: item.productId, qty: Number(item.qty), unitCost: String(item.unitCost) })))
    })
    return NextResponse.json({ message: "Purchase created successfully", id }, { status: 201 })
  } catch (error) { return failure(error) }
}
