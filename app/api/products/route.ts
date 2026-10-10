import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { products } from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"
import { asc, eq } from "drizzle-orm"

export async function GET(request: Request) {
  try {
    const businessId = new URL(request.url).searchParams.get("businessId")
    if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const rows = await db.select().from(products).where(eq(products.businessId, businessId)).orderBy(asc(products.name))
    return NextResponse.json(rows)
  } catch (error) {
    console.error("Failed to fetch products", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, businessId, name, sellingPrice, costReference, averageCost, minimumStock = 0 } = body
    if (typeof id !== "string" || !id.trim() || typeof businessId !== "string" || !businessId.trim() || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "id, businessId, and name are required" }, { status: 400 })
    }
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const values = [sellingPrice, costReference, averageCost, minimumStock]
    if (values.some((value) => typeof value !== "number" || !Number.isFinite(value)) || minimumStock < 0) {
      return NextResponse.json({ error: "Prices and minimumStock must be valid non-negative numbers" }, { status: 400 })
    }
    const [product] = await db.insert(products).values({ id: id.trim(), businessId, name: name.trim(), sellingPrice: String(sellingPrice), costReference: String(costReference), averageCost: String(averageCost), minimumStock }).returning()
    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error("Failed to create product", error)
    const message = error instanceof Error && error.message.includes("duplicate") ? "A product with this identifier or name already exists" : "Failed to create product"
    return NextResponse.json({ error: message }, { status: message.startsWith("A product") ? 409 : 500 })
  }
}
