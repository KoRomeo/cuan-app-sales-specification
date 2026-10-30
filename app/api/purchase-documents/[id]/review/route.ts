import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { journalEntries, purchaseDocuments, purchases, stockMovements } from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"

type Ctx = { params: Promise<{ id: string }> }
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  try {
    const body = await request.json() as { businessId?: string; extractedData?: Record<string, unknown> }
    const businessId = body.businessId ?? ""
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const data = body.extractedData
    if (!data || typeof data !== "object" || Array.isArray(data)) return NextResponse.json({ error: "extractedData must be an object" }, { status: 400 })
    if (!Array.isArray(data.items) || data.items.length < 1 || data.items.length > 500) return NextResponse.json({ error: "Invoice must contain 1–500 items" }, { status: 400 })
    const issues: string[] = []
    if (typeof data.supplierName !== "string" || !data.supplierName.trim()) issues.push("Supplier name is required")
    for (const [i, raw] of data.items.entries()) {
      const item = raw as Record<string, unknown>
      if (typeof item.productName !== "string" || !item.productName.trim()) issues.push(`Item ${i + 1}: product name is required`)
      if (!Number.isSafeInteger(Number(item.quantity)) || Number(item.quantity) <= 0) issues.push(`Item ${i + 1}: quantity must be a positive whole number`)
      if (!Number.isFinite(Number(item.unitCost)) || Number(item.unitCost) < 0) issues.push(`Item ${i + 1}: unit cost must be non-negative`)
      const discount = Number(item.discount ?? 0)
      const discountType = item.discountType ?? "amount"
      const gross = Number(item.quantity) * Number(item.unitCost)
      if (!Number.isFinite(discount) || discount < 0 || (discountType !== "amount" && discountType !== "percent") || (discountType === "percent" ? discount > 100 : discount > gross)) issues.push(`Item ${i + 1}: discount must be a valid percentage or amount not exceeding the line subtotal`)
    }
    if (issues.length) return NextResponse.json({ error: "Review validation failed", issues }, { status: 400 })
    const [document] = await db.select().from(purchaseDocuments)
      .where(and(eq(purchaseDocuments.id, id), eq(purchaseDocuments.businessId, businessId))).limit(1)
    if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 })
    if (document.status === "confirmed" && document.purchaseId) {
      const current = (document.extractedData ?? {}) as Record<string, unknown>
      const date = typeof data.date === "string" ? data.date : ""
      const dueDate = typeof data.dueDate === "string" && data.dueDate ? data.dueDate : null
      const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + "T00:00:00Z"))
      if (!validDate(date)) return NextResponse.json({ error: "Invoice date must be a valid YYYY-MM-DD date" }, { status: 400 })
      if (dueDate && !validDate(dueDate)) return NextResponse.json({ error: "Due date must be a valid YYYY-MM-DD date or empty" }, { status: 400 })
      const updatedData = { ...current, invoiceNumber: typeof data.invoiceNumber === "string" ? data.invoiceNumber : current.invoiceNumber, date, dueDate }
      const [updated] = await db.transaction(async (tx) => {
        await tx.update(purchases).set({ date, dueDate }).where(and(eq(purchases.id, document.purchaseId!), eq(purchases.businessId, businessId)))
        await tx.update(stockMovements).set({ date }).where(and(eq(stockMovements.businessId, businessId), eq(stockMovements.reference, `purchase:${document.purchaseId}:receive`)))
        await tx.update(journalEntries).set({ entryDate: date }).where(and(eq(journalEntries.businessId, businessId), eq(journalEntries.reference, document.purchaseId!)))
        return tx.update(purchaseDocuments).set({ extractedData: updatedData, updatedAt: new Date() })
          .where(and(eq(purchaseDocuments.id, id), eq(purchaseDocuments.businessId, businessId), eq(purchaseDocuments.status, "confirmed"))).returning()
      })
      if (!updated) return NextResponse.json({ error: "Invoice could not be updated" }, { status: 409 })
      return NextResponse.json({ id, status: updated.status, extractedData: updated.extractedData })
    }
    if (document.status !== "review") return NextResponse.json({ error: "Document is not editable in its current status" }, { status: 409 })
    const [updated] = await db.update(purchaseDocuments).set({ extractedData: data, reviewIssues: [], updatedAt: new Date() })
      .where(and(eq(purchaseDocuments.id, id), eq(purchaseDocuments.businessId, businessId), eq(purchaseDocuments.status, "review"))).returning()
    if (!updated) return NextResponse.json({ error: "Document not found or not editable in its current status" }, { status: 409 })
    return NextResponse.json({ id, status: updated.status, extractedData: updated.extractedData })
  } catch (error) {
    console.error("Saving invoice review failed", error)
    return NextResponse.json({ error: "Unable to save invoice review" }, { status: 500 })
  }
}
