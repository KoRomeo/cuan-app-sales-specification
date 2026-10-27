import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { get } from "@vercel/blob"
import { db } from "@/lib/db"
import { purchaseDocuments } from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"

type Context = { params: Promise<{ id: string }> }
const MAX_PROCESS_BYTES = 10 * 1024 * 1024
const EXTRACTION_PROMPT = "Extract this supplier invoice into strict JSON. Never invent missing values. Return invoiceNumber, date (YYYY-MM-DD or null), dueDate (YYYY-MM-DD or null), supplierName, supplierCity, total (number or null), items (array of {productName, unit, quantity, unitCost, discount, lineTotal}), confidence (0-100), issues (array of strings). Use null for missing units. Return JSON only."

function getTextFromResponse(payload: Record<string, unknown>, format: string): string {
  if (format === "responses") {
    const outputText = payload.output_text
    if (typeof outputText === "string" && outputText.trim()) return outputText
    const output = Array.isArray(payload.output) ? payload.output as Array<{ content?: Array<{ text?: string }> }> : []
    return output.flatMap((item) => item.content ?? []).map((item) => item.text ?? "").join("")
  }
  const choices = Array.isArray(payload.choices) ? payload.choices as Array<{ message?: { content?: string | Array<{ text?: string }> } }> : []
  const message = choices[0]?.message?.content
  if (typeof message === "string") return message
  if (Array.isArray(message)) return message.map((item) => item.text ?? "").join("")
  return ""
}

export async function POST(request: NextRequest, { params }: Context) {
  const { id } = await params
  const businessId = request.nextUrl.searchParams.get("businessId") ?? ""
  const access = await requireBusinessAccess(businessId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  const [document] = await db.select().from(purchaseDocuments)
    .where(and(eq(purchaseDocuments.id, id), eq(purchaseDocuments.businessId, businessId))).limit(1)
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 })
  if (document.status === "processing") return NextResponse.json({ error: "This document is already being processed" }, { status: 409 })
  if (document.status !== "queued" && document.status !== "failed") {
    return NextResponse.json({ error: "Only queued or failed documents can be processed" }, { status: 409 })
  }

  const apiKey = process.env.AI_API_KEY
  const baseUrl = (process.env.AI_BASE_URL || "http://localhost:20128/v1").replace(/\/+$/, "")
  const model = process.env.AI_MODEL || "cl/~anthropic/claude-opus-latest"
  const format = (process.env.AI_API_FORMAT || "chat-completions").toLowerCase()
  if (!apiKey) return NextResponse.json({ error: "Configure AI_API_KEY in .env.development.local (use the key required by your local 9Router)." }, { status: 503 })
  
  if (format !== "chat-completions" && format !== "responses") return NextResponse.json({ error: "AI_API_FORMAT must be chat-completions or responses" }, { status: 503 })
  if (document.mimeType === "application/pdf" && format !== "responses") {
    const message = "This PDF requires a gateway/model that supports the Responses API input_file format. Set AI_API_FORMAT=responses only after confirming your 9Router endpoint supports POST /v1/responses. Image invoices can use chat-completions."
    await db.update(purchaseDocuments).set({ status: "failed", errorMessage: message, updatedAt: new Date() })
      .where(and(eq(purchaseDocuments.id, id), eq(purchaseDocuments.businessId, businessId)))
    return NextResponse.json({ error: message }, { status: 415 })
  }

  await db.update(purchaseDocuments).set({ status: "processing", errorMessage: null, updatedAt: new Date() })
    .where(and(eq(purchaseDocuments.id, id), eq(purchaseDocuments.businessId, businessId)))
  try {
    if (!process.env.BLOB_STORE_ID) throw new Error("BLOB_STORE_ID is missing. Add the Blob Store ID from Vercel Storage Settings to .env.development.local.")
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN is missing. Add the Blob Read-Write token to .env.development.local.")
    const stored = await get(document.blobPathname, { access: "private", token: process.env.BLOB_READ_WRITE_TOKEN })
    if (!stored || stored.statusCode !== 200) throw new Error("Unable to read the private invoice file")
    const bytes = Buffer.from(await new Response(stored.stream).arrayBuffer())
    if (!bytes.length || bytes.length > MAX_PROCESS_BYTES) throw new Error("Invoice file is empty or exceeds the 10 MB processing limit")
    const dataUrl = `data:${document.mimeType};base64,${bytes.toString("base64")}`

    let endpoint: string
    let body: Record<string, unknown>
    if (format === "responses") {
      endpoint = `${baseUrl}/responses`
      const fileContent = document.mimeType.startsWith("image/")
        ? [{ type: "input_image", image_url: dataUrl, detail: "high" }]
        : document.mimeType === "application/pdf"
          ? [{ type: "input_file", filename: document.fileName, file_data: dataUrl }]
          : [{ type: "input_text", text: bytes.toString("utf8") }]
      body = { model, input: [{ role: "user", content: [...fileContent, { type: "input_text", text: EXTRACTION_PROMPT }] }] }
    } else {
      endpoint = `${baseUrl}/chat/completions`
      const messageContent = document.mimeType.startsWith("image/")
        ? [
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
            { type: "text", text: EXTRACTION_PROMPT },
          ]
        : `Invoice file text:\n${bytes.toString("utf8")}\n\n${EXTRACTION_PROMPT}`
      body = { model, messages: [{ role: "user", content: messageContent }], temperature: 0 }
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    })
    if (!response.ok) {
      const details = (await response.text()).slice(0, 500)
      throw new Error(`9Router request failed (${response.status}) at ${endpoint}: ${details || response.statusText}`)
    }
    const payload = await response.json() as Record<string, unknown>
    const raw = getTextFromResponse(payload, format).trim()
    if (!raw) throw new Error("The selected model returned no extracted invoice data")
    const parsed = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "")) as Record<string, unknown>
    if (!Array.isArray(parsed.items)) parsed.items = []
    const confidence = Number.isFinite(Number(parsed.confidence)) ? Math.max(0, Math.min(100, Math.round(Number(parsed.confidence)))) : null
    const issues = Array.isArray(parsed.issues) ? parsed.issues.filter((item: unknown): item is string => typeof item === "string").slice(0, 50) : []
    await db.update(purchaseDocuments).set({ status: "review", extractedData: parsed, confidence, reviewIssues: issues, errorMessage: null, updatedAt: new Date() })
      .where(and(eq(purchaseDocuments.id, id), eq(purchaseDocuments.businessId, businessId)))
    return NextResponse.json({ id, status: "review", extractedData: parsed, confidence, reviewIssues: issues })
  } catch (error) {
    console.error("Invoice extraction failed", error)
    await db.update(purchaseDocuments).set({ status: "failed", errorMessage: "Invoice extraction failed. Check server logs for details.", updatedAt: new Date() })
      .where(and(eq(purchaseDocuments.id, id), eq(purchaseDocuments.businessId, businessId)))
    return NextResponse.json({ error: "Invoice extraction failed. Please verify the AI configuration and try again." }, { status: 502 })
  }
}
