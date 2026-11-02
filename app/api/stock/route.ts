import { NextResponse } from "next/server"
import { and, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { products, stockMovements } from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"

export async function GET(request: Request) {
  try {
    const businessId = new URL(request.url).searchParams.get("businessId")
    if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const rows = await db.select({ productId: products.id, name: products.name, minimumStock: products.minimumStock, stock: sql<number>`coalesce(sum(${stockMovements.qty}), 0)` }).from(products).leftJoin(stockMovements, and(eq(stockMovements.productId, products.id), eq(stockMovements.businessId, businessId))).where(eq(products.businessId, businessId)).groupBy(products.id, products.name, products.minimumStock)
    return NextResponse.json(rows.map((row) => ({ ...row, stock: Number(row.stock), isLowStock: Number(row.stock) < row.minimumStock })))
  } catch (error) {
    console.error("Failed to fetch stock", error)
    return NextResponse.json({ error: "Failed to fetch stock" }, { status: 500 })
  }
}
