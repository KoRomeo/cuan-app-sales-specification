import { NextRequest, NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { purchaseDocuments } from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get("businessId") ?? ""
  const access = await requireBusinessAccess(businessId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  try {
    const documents = await db.select().from(purchaseDocuments)
      .where(eq(purchaseDocuments.businessId, businessId))
      .orderBy(desc(purchaseDocuments.createdAt)).limit(1000)
    return NextResponse.json(documents)
  } catch (error) {
    console.error("GET purchase documents failed", error)
    const databaseError = error as { code?: string; cause?: { code?: string } }
    if (databaseError?.code === "42P01" || databaseError?.cause?.code === "42P01") {
      return NextResponse.json(
        {
          error: "The purchase_documents table is missing from the connected database. Apply drizzle/0010_purchase_documents.sql to the same database used by this app, then retry.",
          code: "PURCHASE_DOCUMENTS_TABLE_MISSING",
        },
        { status: 503 },
      )
    }
    return NextResponse.json({ error: "Unable to load purchase documents" }, { status: 500 })
  }
}
