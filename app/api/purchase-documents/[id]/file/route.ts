import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { get } from "@vercel/blob"
import { db } from "@/lib/db"
import { purchaseDocuments } from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"

type Context = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Context) {
  const { id } = await params
  const businessId = request.nextUrl.searchParams.get("businessId") ?? ""
  const access = await requireBusinessAccess(businessId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  try {
    const [document] = await db.select().from(purchaseDocuments)
      .where(and(eq(purchaseDocuments.id, id), eq(purchaseDocuments.businessId, businessId)))
      .limit(1)
    if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 })

    if (!process.env.BLOB_STORE_ID) throw new Error("BLOB_STORE_ID is missing. Add the Blob Store ID from Vercel Storage Settings to .env.development.local.")
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN is missing. Add the Blob Read-Write token to .env.development.local.")
    const stored = await get(document.blobPathname, { access: "private", token: process.env.BLOB_READ_WRITE_TOKEN })
    if (!stored || stored.statusCode !== 200) {
      return NextResponse.json({ error: "Original invoice file is unavailable" }, { status: 404 })
    }

    const safeName = document.fileName.replace(/[\r\n"]/g, "_")
    return new Response(stored.stream, {
      status: 200,
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `inline; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(document.fileName)}`,
        "Content-Length": String(document.fileSize),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    console.error("Unable to open private invoice original", error)
    return NextResponse.json({ error: "Unable to open original invoice" }, { status: 500 })
  }
}
