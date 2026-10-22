import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { purchaseDocuments } from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"

type Ctx = { params: Promise<{ id: string }> }
export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params
  try {
    const body = await request.json() as { businessId?: string; supplierId?: string; itemProductIds?: Record<string, string>; createSupplier?: boolean; createProductIndexes?: number[] }
    const businessId = body.businessId ?? ""
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const [doc] = await db.select().from(purchaseDocuments).where(and(eq(purchaseDocuments.id, id), eq(purchaseDocuments.businessId, businessId))).limit(1)
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 })
    if (doc.status !== "review" || !doc.extractedData) return NextResponse.json({ error: "Only reviewed documents can be confirmed" }, { status: 409 })
    // Purchase confirmation is deliberately guarded until supplier/product resolution and
    // purchase posting can run in one database transaction without duplicate stock/journals.
    return NextResponse.json({ error: "Confirmation requires product and supplier resolution to be completed first", needsResolution: true }, { status: 409 })
  } catch (error) {
    console.error("Invoice confirmation failed", error)
    return NextResponse.json({ error: "Unable to confirm invoice" }, { status: 500 })
  }
}
