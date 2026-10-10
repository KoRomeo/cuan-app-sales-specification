import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { businessMembers } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"

export async function requireBusinessAccess(businessId: string) {
  if (!businessId || businessId.length > 128) {
    return { ok: false as const, status: 400, error: "A valid businessId is required" }
  }

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return { ok: false as const, status: 401, error: "Authentication required" }
  }

  const [membership] = await db
    .select({ role: businessMembers.role })
    .from(businessMembers)
    .where(
      and(
        eq(businessMembers.businessId, businessId),
        eq(businessMembers.userId, session.user.id),
      ),
    )
    .limit(1)

  if (!membership) {
    return { ok: false as const, status: 403, error: "You do not have access to this business" }
  }

  return { ok: true as const, userId: session.user.id, role: membership.role }
}

export function jsonError(error: unknown, fallback: string) {
  console.error(`[api] ${fallback}`, error)
  return { error: fallback }
}
