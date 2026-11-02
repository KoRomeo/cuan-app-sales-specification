import { NextResponse } from "next/server"
import { and, desc, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { products, stockMovements } from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const businessId = url.searchParams.get("businessId")
    const includeMovements = url.searchParams.get("includeMovements") === "1"
    if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })

    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const productRows = await db
      .select({
        id: products.id,
        businessId: products.businessId,
        name: products.name,
        sellingPrice: products.sellingPrice,
        costReference: products.costReference,
        averageCost: products.averageCost,
        minimumStock: products.minimumStock,
        stock: sql<number>`coalesce(sum(${stockMovements.qty}), 0)`,
      })
      .from(products)
      .leftJoin(
        stockMovements,
        and(eq(stockMovements.productId, products.id), eq(stockMovements.businessId, businessId)),
      )
      .where(eq(products.businessId, businessId))
      .groupBy(
        products.id,
        products.businessId,
        products.name,
        products.sellingPrice,
        products.costReference,
        products.averageCost,
        products.minimumStock,
      )
      .orderBy(products.name)

    let movements: (typeof stockMovements.$inferSelect & { productName: string })[] = []
    if (includeMovements) {
      movements = await db
        .select({
          id: stockMovements.id,
          businessId: stockMovements.businessId,
          date: stockMovements.date,
          productId: stockMovements.productId,
          type: stockMovements.type,
          qty: stockMovements.qty,
          reference: stockMovements.reference,
          productName: products.name,
        })
        .from(stockMovements)
        .innerJoin(products, and(eq(products.id, stockMovements.productId), eq(products.businessId, businessId)))
        .where(eq(stockMovements.businessId, businessId))
        .orderBy(desc(stockMovements.date))
    }

    return NextResponse.json({
      products: productRows.map((row) => ({ ...row, stock: Number(row.stock) })),
      ...(includeMovements ? { movements } : {}),
    })
  } catch (error) {
    console.error("Failed to fetch inventory data", error)
    return NextResponse.json({ error: "Failed to fetch inventory data" }, { status: 500 })
  }
}
