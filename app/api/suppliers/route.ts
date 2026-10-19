import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { businessMembers, suppliers } from "@/lib/db/schema"
import { generateEntityId } from "@/lib/db/ids"
import { writeAudit } from "@/lib/audit"

async function getBusinessAccess(businessId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return { ok: false as const, status: 401, error: "Authentication required" }
  const [member] = await db.select({ userId: businessMembers.userId }).from(businessMembers).where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, session.user.id))).limit(1)
  return member ? { ok: true as const } : { ok: false as const, status: 403, error: "You do not have access to this business" }
}

export async function GET(request: Request) {
  try {
    const businessId = new URL(request.url).searchParams.get("businessId")
    if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    const access = await getBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const suppliersList = await db.select().from(suppliers).where(eq(suppliers.businessId, businessId))

    return NextResponse.json(suppliersList)
  } catch (error) {
    console.error("Failed to fetch suppliers:", error)

    return NextResponse.json(
      {
        error: "Failed to fetch suppliers",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { businessId, name, contact } = body

    if (!businessId || !name) {
      return NextResponse.json(
        {
          error: "Supplier ID, business ID and name are required",
        },
        { status: 400 },
      )
    }
    const access = await getBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const supplier = await db.transaction(async (tx) => {
      const id = await generateEntityId(tx, suppliers, businessId, "SUP", new Date().toISOString().slice(0, 10))
      const [created] = await tx
        .insert(suppliers)
        .values({ id, businessId, name: String(name).trim(), contact: contact || null })
        .returning()
      return created
    })

    await writeAudit({ businessId, page: "Suppliers", action: "Created supplier", reference: supplier.id })
    return NextResponse.json(supplier, { status: 201 })
  } catch (error) {
    console.error("Failed to create supplier:", error)

    return NextResponse.json(
      {
        error: "Failed to create supplier",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
