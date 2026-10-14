import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { requireBusinessAccess } from "@/lib/api-auth"
import { customers, orders } from "@/lib/db/schema"

type Context = { params: Promise<{ id: string }> }

async function getCustomerForBusiness(id: string, businessId: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.businessId, businessId)))
    .limit(1)
  return customer
}

async function getContext(request: Request, id: string) {
  const businessId = new URL(request.url).searchParams.get("businessId")
  if (!businessId) {
    return { response: NextResponse.json({ error: "businessId is required" }, { status: 400 }) }
  }
  const access = await requireBusinessAccess(businessId)
  if (!access.ok) {
    return { response: NextResponse.json({ error: access.error }, { status: access.status }) }
  }
  const customer = await getCustomerForBusiness(id, businessId)
  if (!customer) {
    return { response: NextResponse.json({ error: "Customer not found" }, { status: 404 }) }
  }
  return { businessId, customer }
}

export async function GET(request: Request, { params }: Context) {
  try {
    const { id } = await params
    const context = await getContext(request, id)
    if ("response" in context) return context.response
    return NextResponse.json(context.customer)
  } catch (error) {
    console.error("Failed to fetch customer", error)
    return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { id } = await params
    const context = await getContext(request, id)
    if ("response" in context) return context.response
    const body = await request.json()
    if (body.name !== undefined && (typeof body.name !== "string" || !body.name.trim())) {
      return NextResponse.json({ error: "name must be a non-empty string" }, { status: 400 })
    }
    const optionalText = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null
    const [updated] = await db
      .update(customers)
      .set({
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.phone !== undefined ? { phone: optionalText(body.phone) } : {}),
        ...(body.address !== undefined ? { address: optionalText(body.address) } : {}),
        ...(body.location !== undefined ? { location: optionalText(body.location) } : {}),
      })
      .where(and(eq(customers.id, id), eq(customers.businessId, context.businessId)))
      .returning()
    return NextResponse.json(updated)
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return NextResponse.json({ error: "A customer with this name already exists in this business" }, { status: 409 })
    }
    console.error("Failed to update customer", error)
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const { id } = await params
    const context = await getContext(request, id)
    if ("response" in context) return context.response
    const [relatedOrder] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.customerId, id), eq(orders.businessId, context.businessId)))
      .limit(1)
    if (relatedOrder) {
      return NextResponse.json({ error: "This customer has order history and cannot be deleted." }, { status: 409 })
    }
    await db.delete(customers).where(and(eq(customers.id, id), eq(customers.businessId, context.businessId)))
    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error("Failed to delete customer", error)
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 })
  }
}
