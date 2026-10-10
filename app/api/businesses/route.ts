import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { businesses, businessMembers } from "@/lib/db/schema"

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const body = await request.json().catch(() => null)
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const type = body?.type === "bakery" ? "bakery" : body?.type === "sales" ? "sales" : ""
  if (!name || name.length > 120 || !type) {
    return NextResponse.json({ error: "Business name and type are required" }, { status: 400 })
  }

  const id = `BUS-${crypto.randomUUID()}`
  const result = await db.transaction(async (tx) => {
    const [business] = await tx.insert(businesses).values({ id, name, type }).returning()
    await tx.insert(businessMembers).values({ businessId: id, userId: session.user.id, role: "owner" })
    return business
  })

  return NextResponse.json(result, { status: 201 })
}

export const dynamic = "force-dynamic"
