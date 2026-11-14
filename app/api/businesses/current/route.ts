import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { businesses, businessMembers } from "@/lib/db/schema"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const [membership] = await db
    .select({ id: businesses.id, name: businesses.name, type: businesses.type, costingMethod: businesses.costingMethod, role: businessMembers.role })
    .from(businessMembers)
    .innerJoin(businesses, eq(businesses.id, businessMembers.businessId))
    .where(eq(businessMembers.userId, session.user.id))
    .limit(1)

  if (!membership) return NextResponse.json({ error: "No business membership found" }, { status: 404 })
  return NextResponse.json(membership)
}

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const body = await request.json().catch(() => null)
  const name = typeof body?.name === "string" ? body.name.trim() : undefined
  // "average" (moving average) is the implemented default; "fifo" is stored but not yet implemented.
  const costingMethod = typeof body?.costingMethod === "string" ? body.costingMethod : undefined
  if (name !== undefined && (!name || name.length > 120)) {
    return NextResponse.json({ error: "Business name must be between 1 and 120 characters" }, { status: 400 })
  }
  if (costingMethod !== undefined && !["average", "fifo"].includes(costingMethod)) {
    return NextResponse.json({ error: "costingMethod must be average or fifo" }, { status: 400 })
  }
  if (name === undefined && costingMethod === undefined) {
    return NextResponse.json({ error: "Provide a business name or costingMethod" }, { status: 400 })
  }

  const [membership] = await db
    .select({ id: businesses.id })
    .from(businessMembers)
    .innerJoin(businesses, eq(businesses.id, businessMembers.businessId))
    .where(eq(businessMembers.userId, session.user.id))
    .limit(1)

  if (!membership) return NextResponse.json({ error: "No business membership found" }, { status: 404 })

  const [updated] = await db
    .update(businesses)
    .set({ ...(name !== undefined ? { name } : {}), ...(costingMethod !== undefined ? { costingMethod } : {}) })
    .where(eq(businesses.id, membership.id))
    .returning({ id: businesses.id, name: businesses.name, type: businesses.type, costingMethod: businesses.costingMethod })

  return NextResponse.json(updated)
}

export const dynamic = "force-dynamic"
