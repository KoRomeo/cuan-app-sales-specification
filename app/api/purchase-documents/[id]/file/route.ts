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
  const wantsPreview = request.nextUrl.searchParams.get("variant") === "preview"
  const access = await requireBusinessAccess(businessId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  try {
    const [document] = await db.select().from(purchaseDocuments)
      .where(and(eq(purchaseDocuments.id, id), eq(purchaseDocuments.businessId, businessId))).limit(1)
    if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 })
    if (!process.env.BLOB_STORE_ID) throw new Error("BLOB_STORE_ID is missing.")
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN is missing.")
    const usePreview = wantsPreview && Boolean(document.previewBlobPathname)
    const pathname = usePreview ? document.previewBlobPathname! : document.blobPathname
    const stored = await get(pathname, { access: "private", token: process.env.BLOB_READ_WRITE_TOKEN })
    if (!stored || stored.statusCode !== 200) {
      return NextResponse.json({ error: usePreview ? "Invoice preview is unavailable" : "Original invoice file is unavailable" }, { status: 404 })
    }
    const contentType = usePreview ? "image/webp" : document.mimeType
    const contentLength = usePreview ? document.previewFileSize : document.fileSize
    const safeName = document.fileName.replace(/[\r\n"]/g, "_")
    return new Response(stored.stream, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(document.fileName)}`,
        ...(contentLength ? { "Content-Length": String(contentLength) } : {}),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    console.error("Unable to open private invoice file", error)
    return NextResponse.json({ error: "Unable to open invoice file" }, { status: 500 })
  }
}
