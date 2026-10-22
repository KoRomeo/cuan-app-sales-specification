import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { purchaseDocuments } from "@/lib/db/schema"
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
    }
    if (issues.length) return NextResponse.json({ error: "Review validation failed", issues }, { status: 400 })
    const [updated] = await db.update(purchaseDocuments).set({ extractedData: data, reviewIssues: [], updatedAt: new Date() })
      .where(and(eq(purchaseDocuments.id, id), eq(purchaseDocuments.businessId, businessId), eq(purchaseDocuments.status, "review"))).returning()
    if (!updated) return NextResponse.json({ error: "Document not found or not editable in its current status" }, { status: 409 })
    return NextResponse.json({ id, status: updated.status, extractedData: updated.extractedData })
  } catch (error) {
    console.error("Saving invoice review failed", error)
    return NextResponse.json({ error: "Unable to save invoice review" }, { status: 500 })
  }
}
