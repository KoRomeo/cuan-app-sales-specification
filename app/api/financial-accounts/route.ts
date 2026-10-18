import { NextResponse } from "next/server"
import { asc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { financialAccounts } from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"

export async function GET(request: Request) {
  try {
    const businessId = new URL(request.url).searchParams.get("businessId")
    if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const rows = await db.select().from(financialAccounts).where(eq(financialAccounts.businessId, businessId)).orderBy(asc(financialAccounts.name))
    return NextResponse.json(rows)
  } catch (error) {
    console.error("Failed to fetch financial accounts", error)
    return NextResponse.json({ error: "Failed to fetch financial accounts" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { businessId, name, type, openingBalance = 0 } = body
    if (typeof businessId !== "string" || !businessId.trim() || typeof name !== "string" || !name.trim() || !["cash", "bank"].includes(type)) {
      return NextResponse.json({ error: "businessId, name, and a valid account type are required" }, { status: 400 })
    }
    if (typeof openingBalance !== "number" || !Number.isFinite(openingBalance) || openingBalance < 0) {
      return NextResponse.json({ error: "openingBalance must be a non-negative number" }, { status: 400 })
    }
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const id = `FA-${crypto.randomUUID()}`
    const [created] = await db.insert(financialAccounts).values({
      id, businessId, name: name.trim(), type, openingBalance: String(openingBalance), active: true,
    }).returning()
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("Failed to create financial account", error)
    const duplicate = error instanceof Error && /duplicate|unique/i.test(error.message)
    return NextResponse.json({ error: duplicate ? "An account with this name already exists" : "Failed to create financial account" }, { status: duplicate ? 409 : 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { businessId, id, active } = body
    if (typeof businessId !== "string" || !businessId || typeof id !== "string" || typeof active !== "boolean") {
      return NextResponse.json({ error: "businessId, id, and active are required" }, { status: 400 })
    }
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const [updated] = await db.update(financialAccounts).set({ active }).where(eq(financialAccounts.id, id)).returning()
    if (!updated || updated.businessId !== businessId) return NextResponse.json({ error: "Financial account not found" }, { status: 404 })
    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to update financial account", error)
    return NextResponse.json({ error: "Failed to update financial account" }, { status: 500 })
  }
}
