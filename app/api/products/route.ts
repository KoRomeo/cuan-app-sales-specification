import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { products, stockMovements } from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"
import { asc, eq } from "drizzle-orm"
import { generateEntityId } from "@/lib/db/ids"

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
    const { businessId, name, sellingPrice, costReference, averageCost, minimumStock = 0, openingStock = 0, date = new Date().toISOString().slice(0, 10) } = body
    if (typeof businessId !== "string" || !businessId.trim() || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "id, businessId, and name are required" }, { status: 400 })
    }
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const values = [sellingPrice, costReference, averageCost, minimumStock, openingStock]
    if (values.some((value) => typeof value !== "number" || !Number.isFinite(value) || value < 0) || !Number.isInteger(minimumStock) || !Number.isSafeInteger(openingStock)) {
      return NextResponse.json({ error: "Prices, stock, and minimumStock must be valid non-negative numbers" }, { status: 400 })
    }
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
      return NextResponse.json({ error: "date must use YYYY-MM-DD format" }, { status: 400 })
    }
    const product = await db.transaction(async (tx) => {
      const id = await generateEntityId(tx, products, businessId, "PRD", date)
      const [created] = await tx.insert(products).values({ id, businessId, name: name.trim(), sellingPrice: String(sellingPrice), costReference: String(costReference), averageCost: String(averageCost), minimumStock }).returning()
      if (openingStock > 0) {
        await tx.insert(stockMovements).values({
          id: `MOV-OPEN-${created.id}`,
          businessId,
          date,
          productId: created.id,
          type: "opening",
          qty: openingStock,
          reference: `opening:${created.id}`,
        })
      }
      return created
    })
    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error("Failed to create product", error)
    const message = error instanceof Error && error.message.includes("duplicate") ? "A product with this identifier or name already exists" : "Failed to create product"
    return NextResponse.json({ error: message }, { status: message.startsWith("A product") ? 409 : 500 })
  }
}
