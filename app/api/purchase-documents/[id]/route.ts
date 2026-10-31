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

    // Remove both the original and its optional preview before deleting the database record.
    const paths = [document.blobPathname, document.previewBlobPathname].filter((path): path is string => Boolean(path))
    await del(paths, { token: process.env.BLOB_READ_WRITE_TOKEN })
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

export async function PATCH(request: NextRequest, { params }: Context) {
  const { id } = await params
  let body: { businessId?: string; action?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }) }
  const businessId = body.businessId ?? request.nextUrl.searchParams.get("businessId") ?? ""
  const access = await requireBusinessAccess(businessId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  if (body.action !== "restore_review") return NextResponse.json({ error: "Unsupported action" }, { status: 400 })
  const [document] = await db.select().from(purchaseDocuments)
    .where(and(eq(purchaseDocuments.id, id), eq(purchaseDocuments.businessId, businessId))).limit(1)
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 })
  if (document.purchaseId || document.status === "confirmed") {
    return NextResponse.json({ error: "An invoice linked to a recorded purchase cannot be restored to review. Cancel or restore the purchase first." }, { status: 409 })
  }
  const [updated] = await db.update(purchaseDocuments).set({ status: "review", errorMessage: null, updatedAt: new Date() })
    .where(and(eq(purchaseDocuments.id, id), eq(purchaseDocuments.businessId, businessId))).returning()
  return NextResponse.json({ success: true, id: updated.id, status: updated.status })
}
