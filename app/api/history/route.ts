import { NextResponse } from "next/server"
import { desc, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { auditLogs, auditLogChanges, user } from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"

export async function GET(request: Request) {
  try {
    const businessId = new URL(request.url).searchParams.get("businessId")
    if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const logs = await db.select({
      id: auditLogs.id, date: auditLogs.date, time: auditLogs.time,
      page: auditLogs.page, action: auditLogs.action, userId: auditLogs.userId,
      reference: auditLogs.reference, userName: user.name,
    }).from(auditLogs)
      .leftJoin(user, eq(auditLogs.userId, user.id))
      .where(eq(auditLogs.businessId, businessId))
      .orderBy(desc(auditLogs.date), desc(auditLogs.time))
      .limit(200)
    const ids = logs.map((log) => log.id)
    const changes = ids.length
      ? await db.select().from(auditLogChanges).where(inArray(auditLogChanges.auditLogId, ids))
      : []
    const grouped = new Map<string, typeof changes>()
    for (const change of changes) {
      const items = grouped.get(change.auditLogId) ?? []
      items.push(change)
      grouped.set(change.auditLogId, items)
    }
    return NextResponse.json(logs.map((log) => ({
      ...log,
      user: log.userName || "System",
      changes: (grouped.get(log.id) ?? []).map(({ property, previous, current }) => ({
        property, previous: previous ?? "—", current: current ?? "—",
      })),
    })))
  } catch (error) {
    console.error("Failed to fetch history", error)
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 })
  }
}
