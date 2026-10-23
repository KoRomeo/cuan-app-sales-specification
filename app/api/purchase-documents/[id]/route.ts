import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { del } from "@vercel/blob"
import { db } from "@/lib/db"
import { purchaseDocuments } from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"

type Context = { params: Promise<{ id: string }> }

export async function DELETE(request: NextRequest, { params }: Context) {
  const { id } = await params
  const businessId = request.nextUrl.searchParams.get("businessId") ?? ""
  const access = await requireBusinessAccess(businessId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  try {
    const [document] = await db.select().from(purchaseDocuments)
      .where(and(eq(purchaseDocuments.id, id), eq(purchaseDocuments.businessId, businessId)))
      .limit(1)
    if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 })
    if (document.purchaseId || document.status === "confirmed") {
      return NextResponse.json({ error: "This invoice has already created a purchase and cannot be deleted here." }, { status: 409 })
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("BLOB_READ_WRITE_TOKEN is missing. Add the Blob Read-Write token to .env.development.local.")
    }

    // Remove the original private Blob first. Keep the database record if Blob deletion fails.
    await del(document.blobPathname, { token: process.env.BLOB_READ_WRITE_TOKEN })
    await db.delete(purchaseDocuments)
      .where(and(eq(purchaseDocuments.id, id), eq(purchaseDocuments.businessId, businessId)))

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error("DELETE purchase document failed", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete purchase document" },
      { status: 502 },
    )
  }
}
