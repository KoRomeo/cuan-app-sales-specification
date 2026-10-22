import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { get } from "@vercel/blob"
import { db } from "@/lib/db"
import { purchaseDocuments } from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"

type Context = { params: Promise<{ id: string }> }
const MAX_PROCESS_BYTES = 10 * 1024 * 1024

export async function POST(request: NextRequest, { params }: Context) {
  const { id } = await params
  const businessId = request.nextUrl.searchParams.get("businessId") ?? ""
  const access = await requireBusinessAccess(businessId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  const [document] = await db.select().from(purchaseDocuments)
    .where(and(eq(purchaseDocuments.id, id), eq(purchaseDocuments.businessId, businessId))).limit(1)
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 })
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 })
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Private Blob storage is not configured" }, { status: 503 })

  await db.update(purchaseDocuments).set({ status: "processing", errorMessage: null, updatedAt: new Date() })
    .where(and(eq(purchaseDocuments.id, id), eq(purchaseDocuments.businessId, businessId)))
  try {
    const stored = await get(document.blobPathname, { access: "private" })
    if (!stored || stored.statusCode !== 200) throw new Error("Unable to read the private invoice file")
    const bytes = Buffer.from(await new Response(stored.stream).arrayBuffer())
    if (!bytes.length || bytes.length > MAX_PROCESS_BYTES) throw new Error("Invoice file is empty or exceeds the processing limit")
    const dataUrl = `data:${document.mimeType};base64,${bytes.toString("base64")}`
    const inputContent = document.mimeType.startsWith("image/")
      ? [{ type: "input_image", image_url: dataUrl, detail: "high" }]
      : [{ type: "input_file", filename: document.fileName, file_data: dataUrl }]
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_INVOICE_MODEL || "gpt-4.1-mini", input: [{
        role: "user", content: [...inputContent, { type: "input_text", text:
          "Extract this supplier invoice into strict JSON. Never invent missing values. Return invoiceNumber, date (YYYY-MM-DD or null), dueDate (YYYY-MM-DD or null), supplierName, supplierCity, total (number or null), items (array of {productName, unit, quantity, unitCost, discount, lineTotal}), confidence (0-100), issues (array of strings). Use null for missing units. Return JSON only."
        }]
      }] }),
    })
    if (!response.ok) throw new Error(`OpenAI request failed (${response.status})`)
    const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> }
    const raw = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("")
    if (!raw) throw new Error("OpenAI returned no extracted invoice data")
    const parsed = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/\s*```$/, ""))
    const confidence = Number.isFinite(Number(parsed.confidence)) ? Math.max(0, Math.min(100, Math.round(Number(parsed.confidence)))) : null
    const issues = Array.isArray(parsed.issues) ? parsed.issues.filter((item: unknown): item is string => typeof item === "string").slice(0, 50) : []
    await db.update(purchaseDocuments).set({ status: "review", extractedData: parsed, confidence, reviewIssues: issues, errorMessage: null, updatedAt: new Date() })
      .where(and(eq(purchaseDocuments.id, id), eq(purchaseDocuments.businessId, businessId)))
    return NextResponse.json({ id, status: "review", extractedData: parsed, confidence, reviewIssues: issues })
  } catch (error) {
    console.error("Invoice extraction failed", error)
    const message = error instanceof Error ? error.message : "Invoice extraction failed"
    await db.update(purchaseDocuments).set({ status: "failed", errorMessage: message.slice(0, 500), updatedAt: new Date() })
      .where(and(eq(purchaseDocuments.id, id), eq(purchaseDocuments.businessId, businessId)))
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
