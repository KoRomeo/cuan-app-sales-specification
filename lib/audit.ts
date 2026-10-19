import { db } from "@/lib/db"
import { auditLogs } from "@/lib/db/schema"

type AuditInput = {
  businessId: string
  page: string
  action: string
  reference: string
  userId?: string | null
}

export async function writeAudit(input: AuditInput) {
  const now = new Date()
  await db.insert(auditLogs).values({
    id: `AUD-${crypto.randomUUID()}`,
    businessId: input.businessId,
    date: now.toISOString().slice(0, 10),
    time: now.toISOString().slice(11, 19),
    page: input.page,
    action: input.action,
    userId: input.userId ?? null,
    reference: input.reference,
  })
}
