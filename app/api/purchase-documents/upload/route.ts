import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client"
import { get, issueSignedToken } from "@vercel/blob"
import { and, eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { db } from "@/lib/db"
import { purchaseDocuments } from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"

const MAX_BYTES: Record<string, number> = {
  "image/jpeg": 7 * 1024 * 1024,
  "image/png": 7 * 1024 * 1024,
  "image/webp": 7 * 1024 * 1024,
  "application/pdf": 10 * 1024 * 1024,
  "text/plain": 2 * 1024 * 1024,
}
const allowed = Object.keys(MAX_BYTES)
const safePathName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180)

type UploadMetadata = {
  businessId?: string
  documentId?: string
  fileName?: string
  mimeType?: string
  fileSize?: number
}

async function finalizeUpload(request: NextRequest) {
  const body = await request.json() as {
    action?: string
    businessId?: string
    documentId?: string
    pathname?: string
    fileName?: string
    mimeType?: string
    fileSize?: number
  }
  const businessId = body.businessId ?? ""
  const documentId = body.documentId ?? ""
  const fileName = String(body.fileName ?? "")
  const mimeType = body.mimeType ?? ""
  const fileSize = Number(body.fileSize)
  const pathname = body.pathname ?? ""

  const access = await requireBusinessAccess(businessId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  if (!/^[0-9a-f-]{36}$/i.test(documentId)) return NextResponse.json({ error: "Invalid document ID" }, { status: 400 })
  if (!allowed.includes(mimeType) || !Number.isInteger(fileSize) || fileSize < 1 || fileSize > MAX_BYTES[mimeType]) {
    return NextResponse.json({ error: "Unsupported file type or size" }, { status: 400 })
  }
  const expectedPath = `purchase-invoices/${businessId}/${documentId}/${safePathName(fileName)}`
  if (pathname !== expectedPath) return NextResponse.json({ error: "Uploaded file path does not match the authorized document" }, { status: 400 })

  const [existing] = await db.select().from(purchaseDocuments)
    .where(and(eq(purchaseDocuments.id, documentId), eq(purchaseDocuments.businessId, businessId))).limit(1)
  if (existing) return NextResponse.json({ id: existing.id, status: existing.status })

  try {
    const stored = await get(pathname, { access: "private", storeId: process.env.BLOB_STORE_ID })
    if (!stored || stored.statusCode !== 200) throw new Error("Uploaded private file could not be verified")
    const bytes = Buffer.from(await new Response(stored.stream).arrayBuffer())
    if (bytes.length !== fileSize) throw new Error("Uploaded file size did not match the selected file")

    await db.insert(purchaseDocuments).values({
      id: documentId, businessId, uploadedBy: access.userId,
      fileName: fileName.slice(0, 255), mimeType, fileSize,
      blobPathname: pathname, status: "queued", targetType: "purchase",
    })
    return NextResponse.json({ id: documentId, status: "queued" })
  } catch (error) {
    console.error("Unable to finalize private invoice upload", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to finalize upload" }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const incoming = await request.clone().json() as { action?: string }
    if (incoming.action === "finalize") return await finalizeUpload(request)

    const body = incoming as HandleUploadPresignedBody
    const result = await handleUploadPresigned({
      body,
      request,
      webhookPublicKey: process.env.BLOB_WEBHOOK_PUBLIC_KEY,
      getSignedToken: async (pathname, clientPayload) => {
        if (!clientPayload) throw new Error("Upload metadata is required")
        const metadata = JSON.parse(clientPayload) as UploadMetadata
        const businessId = metadata.businessId ?? ""
        const documentId = metadata.documentId ?? ""
        const fileName = String(metadata.fileName ?? "")
        const mimeType = metadata.mimeType ?? ""
        const fileSize = Number(metadata.fileSize)
        const access = await requireBusinessAccess(businessId)
        if (!access.ok) throw new Error(access.error)
        if (!/^[0-9a-f-]{36}$/i.test(documentId)) throw new Error("Invalid document ID")
        if (!mimeType || !allowed.includes(mimeType)) throw new Error("Unsupported file type")
        const limit = MAX_BYTES[mimeType]
        if (!Number.isInteger(fileSize) || fileSize < 1 || fileSize > limit) throw new Error("File exceeds the allowed size")
        const expectedPath = `purchase-invoices/${businessId}/${documentId}/${safePathName(fileName)}`
        if (pathname !== expectedPath) throw new Error("Upload path is not authorized")
        if (!process.env.BLOB_STORE_ID) throw new Error("BLOB_STORE_ID is missing. Add the Blob Store ID from Vercel Storage Settings to .env.development.local.")
        const token = await issueSignedToken({
          pathname,
          operations: ["put"],
          allowedContentTypes: [mimeType],
          maximumSizeInBytes: limit,
          storeId: process.env.BLOB_STORE_ID,
        })
        return {
          token,
          urlOptions: {
            allowedContentTypes: [mimeType],
            maximumSizeInBytes: limit,
            addRandomSuffix: false,
            allowOverwrite: false,
            validUntil: Date.now() + 10 * 60 * 1000,
          },
        }
      },
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error("Private invoice upload failed", error)
    const message = error instanceof Error ? error.message : "Upload failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
