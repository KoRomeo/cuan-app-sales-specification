import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { get } from "@vercel/blob"
import { and, eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
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
const safePathName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180)

type UploadMetadata = {
  businessId?: string
  documentId?: string
  fileName?: string
  storageFileName?: string
  mimeType?: string
  fileSize?: number
  uploadRole?: "original" | "preview"
}

function expectedPath(businessId: string, documentId: string, storageFileName: string, role: "original" | "preview") {
  return role === "preview"
    ? `purchase-invoices/${businessId}/${documentId}/preview.webp`
    : `purchase-invoices/${businessId}/${documentId}/original-${safePathName(storageFileName)}`
}

async function verifyBlob(pathname: string, expectedSize: number) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN is missing.")
  const stored = await get(pathname, { access: "private", token: process.env.BLOB_READ_WRITE_TOKEN })
  if (!stored || stored.statusCode !== 200) throw new Error("Uploaded private file could not be verified")
  const bytes = Buffer.from(await new Response(stored.stream).arrayBuffer())
  if (bytes.length !== expectedSize) throw new Error("Uploaded file size did not match the selected file")
}

async function finalizeUpload(request: NextRequest) {
  const body = await request.json() as {
    action?: string; businessId?: string; documentId?: string; pathname?: string
    fileName?: string; storageFileName?: string; mimeType?: string; fileSize?: number
    previewPathname?: string; previewFileSize?: number
  }
  const businessId = body.businessId ?? ""
  const documentId = body.documentId ?? ""
  const fileName = String(body.fileName ?? "")
  const storageFileName = String(body.storageFileName ?? fileName)
  const mimeType = body.mimeType ?? ""
  const fileSize = Number(body.fileSize)
  const pathname = body.pathname ?? ""
  const previewPathname = body.previewPathname
  const previewFileSize = body.previewFileSize == null ? undefined : Number(body.previewFileSize)
  const access = await requireBusinessAccess(businessId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  if (!/^[0-9a-f-]{36}$/i.test(documentId)) return NextResponse.json({ error: "Invalid document ID" }, { status: 400 })
  if (!allowedMime(mimeType) || !Number.isInteger(fileSize) || fileSize < 1 || fileSize > MAX_BYTES[mimeType]) {
    return NextResponse.json({ error: "Unsupported original file type or size" }, { status: 400 })
  }
  if (pathname !== expectedPath(businessId, documentId, storageFileName, "original")) {
    return NextResponse.json({ error: "Original file path is not authorized" }, { status: 400 })
  }
  if (previewPathname && (previewPathname !== expectedPath(businessId, documentId, "preview.webp", "preview") ||
    mimeType === "application/pdf" || mimeType === "text/plain" ||
    !Number.isInteger(previewFileSize) || previewFileSize! < 1 || previewFileSize! >= fileSize || previewFileSize! > MAX_BYTES["image/webp"])) {
    return NextResponse.json({ error: "Preview file is invalid" }, { status: 400 })
  }
  const [existing] = await db.select().from(purchaseDocuments)
    .where(and(eq(purchaseDocuments.id, documentId), eq(purchaseDocuments.businessId, businessId))).limit(1)
  if (existing) return NextResponse.json({ id: existing.id, status: existing.status })
  try {
    await verifyBlob(pathname, fileSize)
    if (previewPathname) await verifyBlob(previewPathname, previewFileSize!)
    await db.insert(purchaseDocuments).values({
      id: documentId, businessId, uploadedBy: access.userId,
      fileName: fileName.slice(0, 255), mimeType, fileSize,
      blobPathname: pathname, previewBlobPathname: previewPathname ?? null,
      previewFileSize: previewPathname ? previewFileSize! : null,
      status: "queued", targetType: "purchase",
    })
    return NextResponse.json({ id: documentId, status: "queued" })
  } catch (error) {
    console.error("Unable to finalize private invoice upload", error)
    return NextResponse.json({ error: "Unable to finalize invoice upload. Please try again." }, { status: 502 })
  }
}

function allowedMime(value: string): value is keyof typeof MAX_BYTES {
  return Object.prototype.hasOwnProperty.call(MAX_BYTES, value)
}

export async function POST(request: NextRequest) {
  try {
    const incoming = await request.clone().json() as { action?: string }
    if (incoming.action === "finalize") return await finalizeUpload(request)
    const body = incoming as HandleUploadBody
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!clientPayload) throw new Error("Upload metadata is required")
        const metadata = JSON.parse(clientPayload) as UploadMetadata
        const businessId = metadata.businessId ?? ""
        const documentId = metadata.documentId ?? ""
        const fileName = String(metadata.fileName ?? "")
        const storageFileName = String(metadata.storageFileName ?? fileName)
        const mimeType = metadata.mimeType ?? ""
        const fileSize = Number(metadata.fileSize)
        const role = metadata.uploadRole ?? "original"
        const access = await requireBusinessAccess(businessId)
        if (!access.ok) throw new Error(access.error)
        if (!/^[0-9a-f-]{36}$/i.test(documentId)) throw new Error("Invalid document ID")
        if (!allowedMime(mimeType)) throw new Error("Unsupported file type")
        const limit = MAX_BYTES[mimeType]
        if (!Number.isInteger(fileSize) || fileSize < 1 || fileSize > limit) throw new Error("File exceeds the allowed size")
        if (role !== "original" && role !== "preview") throw new Error("Invalid upload role")
        if (role === "preview" && (mimeType !== "image/webp" || fileSize > MAX_BYTES["image/webp"])) throw new Error("Invalid WebP preview")
        if (pathname !== expectedPath(businessId, documentId, storageFileName, role)) throw new Error("Upload path is not authorized")
        if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN is missing. Add the Blob Read-Write token to the Development environment.")
        return {
          allowedContentTypes: [mimeType],
          maximumSizeInBytes: limit,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ businessId, documentId, role }),
        }
      },
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error("Private invoice upload failed", error)
    const message = error instanceof Error ? error.message : "Upload failed"
    const safeValidationMessages = new Set([
      "Upload metadata is required", "Invalid document ID", "Unsupported file type", "File exceeds the allowed size",
      "Upload path is not authorized", "Invalid upload role", "Invalid WebP preview",
      "BLOB_READ_WRITE_TOKEN is missing. Add the Blob Read-Write token to the Development environment.",
    ])
    return NextResponse.json(
      { error: safeValidationMessages.has(message) ? message : "Unable to prepare invoice upload. Please check the server configuration and try again." },
      { status: safeValidationMessages.has(message) ? 400 : 500 },
    )
  }
}
