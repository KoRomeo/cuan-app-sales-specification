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
    .select({ id: businesses.id, name: businesses.name, type: businesses.type })
    .from(businessMembers)
    .innerJoin(businesses, eq(businesses.id, businessMembers.businessId))
    .where(eq(businessMembers.userId, session.user.id))
    .limit(1)

  if (!membership) return NextResponse.json({ error: "No business membership found" }, { status: 404 })
  return NextResponse.json(membership)
}

export const dynamic = "force-dynamic"
