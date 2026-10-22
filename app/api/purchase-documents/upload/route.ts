import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { db } from "@/lib/db"
import { purchaseDocuments } from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"

const MAX_BYTES: Record<string, number> = {
  "image/jpeg": 7 * 1024 * 1024,
  "image/png": 7 * 1024 * 1024,
  "application/pdf": 10 * 1024 * 1024,
  "text/plain": 2 * 1024 * 1024,
}
const allowed = Object.keys(MAX_BYTES)

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as HandleUploadBody
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!clientPayload) throw new Error("Upload metadata is required")
        const metadata = JSON.parse(clientPayload) as { businessId?: string; fileName?: string; mimeType?: string; fileSize?: number }
        const businessId = metadata.businessId ?? ""
        const access = await requireBusinessAccess(businessId)
        if (!access.ok) throw new Error(access.error)
        if (!metadata.mimeType || !allowed.includes(metadata.mimeType)) throw new Error("Unsupported file type")
        const limit = MAX_BYTES[metadata.mimeType]
        if (!metadata.fileSize || metadata.fileSize < 1 || metadata.fileSize > limit) throw new Error("File exceeds the allowed size")
        return {
          allowedContentTypes: [metadata.mimeType],
          maximumSizeInBytes: limit,
          addRandomSuffix: true,
          access: "private",
          tokenPayload: JSON.stringify({
            businessId, userId: access.userId, documentId: randomUUID(),
            fileName: String(metadata.fileName ?? pathname).slice(0, 255),
            mimeType: metadata.mimeType, fileSize: metadata.fileSize,
          }),
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        if (!tokenPayload) throw new Error("Missing upload metadata")
        const metadata = JSON.parse(tokenPayload) as {
          businessId: string; userId: string; documentId: string;
          fileName: string; mimeType: string; fileSize: number
        }
        await db.insert(purchaseDocuments).values({
          id: metadata.documentId, businessId: metadata.businessId, uploadedBy: metadata.userId,
          fileName: metadata.fileName, mimeType: metadata.mimeType, fileSize: metadata.fileSize,
          blobPathname: blob.pathname, status: "queued", targetType: "purchase",
        })
      },
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error("Private invoice upload failed", error)
    const message = error instanceof Error ? error.message : "Upload failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
