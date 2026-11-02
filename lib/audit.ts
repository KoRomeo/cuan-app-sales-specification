import { db } from "@/lib/db"
import { auditLogs, auditLogChanges } from "@/lib/db/schema"

type AuditChange = {
  property: string
  previous?: string | null
  current?: string | null
}

type AuditInput = {
  businessId: string
  page: string
  action: string
  reference: string
  userId?: string | null
  changes?: AuditChange[]
}

export async function writeAudit(input: AuditInput) {
  const now = new Date()
  await db.transaction(async (tx) => {
    const [log] = await tx.insert(auditLogs).values({
      id: `AUD-${crypto.randomUUID()}`,
      businessId: input.businessId,
      date: now.toISOString().slice(0, 10),
      time: now.toISOString().slice(11, 19),
      page: input.page,
      action: input.action,
      userId: input.userId ?? null,
      reference: input.reference,
    }).returning({ id: auditLogs.id })

    if (input.changes?.length) {
      await tx.insert(auditLogChanges).values(input.changes.map((change, index) => ({
        id: `${log.id}-${index + 1}`,
        auditLogId: log.id,
        property: change.property,
        previous: change.previous ?? null,
        current: change.current ?? null,
      })))
    }
  })
}
