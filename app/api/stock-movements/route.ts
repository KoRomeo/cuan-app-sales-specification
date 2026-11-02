import { NextResponse } from "next/server"
import { and, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { products, stockMovements } from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"

export async function GET(request: Request) {
  try {
    const businessId = new URL(request.url).searchParams.get("businessId")
    if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const movements = await db.select().from(stockMovements).where(eq(stockMovements.businessId, businessId)).orderBy(desc(stockMovements.date))
    return NextResponse.json(movements)
  } catch (error) {
    console.error("Failed to fetch stock movements", error)
    return NextResponse.json({ error: "Failed to fetch stock movements" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, businessId, date, productId, type, qty, reference } = body
    if (![id, businessId, date, productId, type, reference].every((value) => typeof value === "string" && value.trim())) return NextResponse.json({ error: "id, businessId, date, productId, type, and reference are required" }, { status: 400 })
    if (!Number.isInteger(qty) || qty === 0) return NextResponse.json({ error: "qty must be a non-zero integer" }, { status: 400 })
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const [product] = await db.select({ id: products.id }).from(products).where(and(eq(products.id, productId), eq(products.businessId, businessId))).limit(1)
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 })
    const result = await db.transaction(async (tx) => tx.insert(stockMovements).values({ id, businessId, date, productId, type, qty, reference }).onConflictDoNothing({ target: stockMovements.id }).returning())
    if (!result[0]) return NextResponse.json({ error: "A movement with this id already exists" }, { status: 409 })
    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Failed to create stock movement", error)
    return NextResponse.json({ error: "Failed to create stock movement" }, { status: 500 })
  }
}
