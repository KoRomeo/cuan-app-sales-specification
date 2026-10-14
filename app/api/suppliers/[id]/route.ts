import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { requireBusinessAccess } from "@/lib/api-auth"
import { purchases, suppliers } from "@/lib/db/schema"

type Context = { params: Promise<{ id: string }> }

async function getContext(request: Request, id: string) {
  const businessId = new URL(request.url).searchParams.get("businessId")
  if (!businessId) return { response: NextResponse.json({ error: "businessId is required" }, { status: 400 }) }
  const access = await requireBusinessAccess(businessId)
  if (!access.ok) return { response: NextResponse.json({ error: access.error }, { status: access.status }) }
  const [supplier] = await db.select().from(suppliers)
    .where(and(eq(suppliers.id, id), eq(suppliers.businessId, businessId))).limit(1)
  if (!supplier) return { response: NextResponse.json({ error: "Supplier not found" }, { status: 404 }) }
  return { businessId, supplier }
}

export async function GET(request: Request, { params }: Context) {
  try {
    const context = await getContext(request, (await params).id)
    if ("response" in context) return context.response
    return NextResponse.json(context.supplier)
  } catch (error) {
    console.error("Failed to fetch supplier", error)
    return NextResponse.json({ error: "Failed to fetch supplier" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const id = (await params).id
    const context = await getContext(request, id)
    if ("response" in context) return context.response
    const body = await request.json()
    if (body.name !== undefined && (typeof body.name !== "string" || !body.name.trim())) {
      return NextResponse.json({ error: "name must be a non-empty string" }, { status: 400 })
    }
    const contact = body.contact === undefined ? undefined : typeof body.contact === "string" && body.contact.trim() ? body.contact.trim() : null
    const [updated] = await db.update(suppliers).set({
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.contact !== undefined ? { contact } : {}),
    }).where(and(eq(suppliers.id, id), eq(suppliers.businessId, context.businessId))).returning()
    return NextResponse.json(updated)
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return NextResponse.json({ error: "A supplier with this name already exists in this business" }, { status: 409 })
    }
    console.error("Failed to update supplier", error)
    return NextResponse.json({ error: "Failed to update supplier" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const id = (await params).id
    const context = await getContext(request, id)
    if ("response" in context) return context.response
    const [relatedPurchase] = await db.select({ id: purchases.id }).from(purchases)
      .where(and(eq(purchases.supplierId, id), eq(purchases.businessId, context.businessId))).limit(1)
    if (relatedPurchase) {
      return NextResponse.json({ error: "This supplier has purchase history and cannot be deleted." }, { status: 409 })
    }
    await db.delete(suppliers).where(and(eq(suppliers.id, id), eq(suppliers.businessId, context.businessId)))
    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error("Failed to delete supplier", error)
    return NextResponse.json({ error: "Failed to delete supplier" }, { status: 500 })
  }
}
