import { NextResponse } from "next/server"
import { and, eq, inArray, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { businessMembers, journalEntries, payments, products, purchaseItems, purchases, stockMovements, suppliers } from "@/lib/db/schema"
import { headers } from "next/headers"

type Context = { params: Promise<{ id: string }> }
export async function GET(request: Request, { params }: Context) {
  try {
    const { id } = await params; const businessId = new URL(request.url).searchParams.get("businessId"); if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    const session = await auth.api.getSession({ headers: await headers() }); if (!session?.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    const [member] = await db.select({ role: businessMembers.role }).from(businessMembers).where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, session.user.id))).limit(1); if (!member) return NextResponse.json({ error: "You do not have access to this business" }, { status: 403 })
    const [purchase] = await db.select().from(purchases).where(and(eq(purchases.id, id), eq(purchases.businessId, businessId))).limit(1); if (!purchase) return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
    const items = await db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, id)); const movements = await db.select().from(stockMovements).where(and(eq(stockMovements.businessId, businessId), eq(stockMovements.reference, `purchase:${id}:receive`)))
    const [supplier] = await db.select().from(suppliers).where(and(eq(suppliers.id, purchase.supplierId), eq(suppliers.businessId, businessId))).limit(1)
    const productIds = [...new Set(items.map((item) => item.productId))]
    const productRows = productIds.length ? await db.select({ id: products.id, name: products.name, averageCost: products.averageCost, stock: sql<number>`coalesce(sum(${stockMovements.qty}), 0)` }).from(products).leftJoin(stockMovements, and(eq(stockMovements.productId, products.id), eq(stockMovements.businessId, businessId))).where(and(eq(products.businessId, businessId), inArray(products.id, productIds))).groupBy(products.id) : []
    const paymentRows = await db.select().from(payments).where(and(eq(payments.businessId, businessId), eq(payments.purchaseId, id)))
    return NextResponse.json({ ...purchase, items, supplier: supplier ?? null, products: productRows, payments: paymentRows, stockMovements: movements })
  } catch (error) { console.error("GET /api/purchases/[id]", error); return NextResponse.json({ error: "Failed to fetch purchase details" }, { status: 500 })
  }
}


export async function DELETE(request: Request, { params }: Context) {
  try {
    const { id } = await params
    const businessId = new URL(request.url).searchParams.get("businessId")
    if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    const [member] = await db.select({ role: businessMembers.role }).from(businessMembers).where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, session.user.id))).limit(1)
    if (!member) return NextResponse.json({ error: "You do not have access to this business" }, { status: 403 })
    return await db.transaction(async (tx) => {
      const [purchase] = await tx.select().from(purchases).where(and(eq(purchases.id, id), eq(purchases.businessId, businessId))).for("update").limit(1)
      if (!purchase) return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
      const [payment] = await tx.select({ id: payments.id }).from(payments).where(and(eq(payments.businessId, businessId), eq(payments.purchaseId, id))).limit(1)
      if (payment) return NextResponse.json({ error: "Purchases with any partial or full payment cannot be deleted." }, { status: 409 })
      // A purchase may be deleted while unpaid. Remove its own receipt movement and journal
      // entry in the same transaction so inventory and accounting do not retain orphaned effects.
      await tx.delete(stockMovements).where(and(eq(stockMovements.businessId, businessId), eq(stockMovements.reference, `purchase:${id}:receive`)))
      await tx.delete(journalEntries).where(and(eq(journalEntries.businessId, businessId), eq(journalEntries.reference, id)))
      await tx.delete(purchaseItems).where(eq(purchaseItems.purchaseId, id))
      await tx.delete(purchases).where(and(eq(purchases.id, id), eq(purchases.businessId, businessId)))
      return NextResponse.json({ message: "Purchase deleted successfully", id })
    })
  } catch (error) {
    console.error("DELETE /api/purchases/[id]", error)
    return NextResponse.json({ error: "Failed to delete purchase" }, { status: 500 })
  }
}
