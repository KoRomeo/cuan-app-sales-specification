import { NextResponse } from "next/server"
import { and, eq, inArray, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { businessMembers, journalEntries, journalEntryLines, payments, products, purchaseDocuments, purchaseItems, purchases, stockMovements, suppliers } from "@/lib/db/schema"
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
    const [sourceInvoice] = await db.select({ id: purchaseDocuments.id, fileName: purchaseDocuments.fileName, createdAt: purchaseDocuments.createdAt, mimeType: purchaseDocuments.mimeType }).from(purchaseDocuments).where(and(eq(purchaseDocuments.businessId, businessId), eq(purchaseDocuments.purchaseId, id))).limit(1)
    return NextResponse.json({ ...purchase, items, supplier: supplier ?? null, products: productRows, payments: paymentRows, stockMovements: movements, sourceInvoice: sourceInvoice ?? null })
  } catch (error) { console.error("GET /api/purchases/[id]", error); return NextResponse.json({ error: "Failed to fetch purchase details" }, { status: 500 })
  }
}



export async function PATCH(request: Request, { params }: Context) {
  try {
    const { id } = await params
    const businessId = new URL(request.url).searchParams.get("businessId")
    if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    const [member] = await db.select({ role: businessMembers.role }).from(businessMembers).where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, session.user.id))).limit(1)
    if (!member) return NextResponse.json({ error: "You do not have access to this business" }, { status: 403 })
    const body = await request.json()
    const dueDate = body.dueDate === "" || body.dueDate === null ? null : body.dueDate
    if (dueDate !== null && (typeof dueDate !== "string" || !/^\\d{4}-\\d{2}-\\d{2}$/.test(dueDate) || Number.isNaN(Date.parse(dueDate)))) {
      return NextResponse.json({ error: "dueDate must be a valid YYYY-MM-DD date or null" }, { status: 400 })
    }
    const [updated] = await db.update(purchases).set({ dueDate }).where(and(eq(purchases.id, id), eq(purchases.businessId, businessId))).returning()
    if (!updated) return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
    return NextResponse.json({ message: "Due date updated", dueDate: updated.dueDate })
  } catch (error) {
    console.error("PATCH /api/purchases/[id]", error)
    return NextResponse.json({ error: "Failed to update purchase due date" }, { status: 500 })
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
      // Reconcile affected products in the same transaction so inventory reflects the deletion.
      const items = await tx.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, id))
      const affectedProductIds = [...new Set(items.map((item) => item.productId))]
      await tx.delete(stockMovements).where(and(eq(stockMovements.businessId, businessId), eq(stockMovements.reference, `purchase:${id}:receive`)))
      const [entry] = await tx.select({ id: journalEntries.id }).from(journalEntries).where(and(eq(journalEntries.businessId, businessId), eq(journalEntries.reference, id))).limit(1)
      if (entry) {
        await tx.delete(journalEntryLines).where(eq(journalEntryLines.journalEntryId, entry.id))
        await tx.delete(journalEntries).where(eq(journalEntries.id, entry.id))
      }
      await tx.delete(purchaseItems).where(eq(purchaseItems.purchaseId, id))
      await tx.delete(purchases).where(and(eq(purchases.id, id), eq(purchases.businessId, businessId)))
      for (const productId of affectedProductIds) {
        const remainingPurchases = await tx.select({ qty: purchaseItems.qty, unitCost: purchaseItems.unitCost }).from(purchaseItems).innerJoin(purchases, eq(purchaseItems.purchaseId, purchases.id)).where(and(eq(purchases.businessId, businessId), eq(purchaseItems.productId, productId)))
        const totalQty = remainingPurchases.reduce((sum, row) => sum + Number(row.qty), 0)
        const totalCost = remainingPurchases.reduce((sum, row) => sum + Number(row.qty) * Number(row.unitCost), 0)
        const [product] = await tx.select({ costReference: products.costReference }).from(products).where(and(eq(products.id, productId), eq(products.businessId, businessId))).limit(1)
        if (product) await tx.update(products).set({ averageCost: String(totalQty > 0 ? totalCost / totalQty : Number(product.costReference)) }).where(and(eq(products.id, productId), eq(products.businessId, businessId)))
      }
      return NextResponse.json({ message: "Purchase deleted successfully; inventory recalculated", id, affectedProductIds })
    })
  } catch (error) {
    console.error("DELETE /api/purchases/[id]", error)
    return NextResponse.json({ error: "Failed to delete purchase" }, { status: 500 })
  }
}
