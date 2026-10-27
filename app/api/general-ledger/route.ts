import { NextResponse } from "next/server"
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm"
import { transactionDb } from "@/lib/db/transaction"
import { journalEntries, journalEntryLines } from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get("businessId")
    const account = searchParams.get("account")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    if ((startDate && !/^\\d{4}-\\d{2}-\\d{2}$/.test(startDate)) || (endDate && !/^\\d{4}-\\d{2}-\\d{2}$/.test(endDate))) {
      return NextResponse.json({ error: "Dates must use YYYY-MM-DD format" }, { status: 400 })
    }
    const conditions = [eq(journalEntries.businessId, businessId),
      ...(startDate ? [gte(journalEntries.entryDate, startDate)] : []),
      ...(endDate ? [lte(journalEntries.entryDate, endDate)] : [])]
    const entries = await transactionDb.select().from(journalEntries).where(and(...conditions)).orderBy(asc(journalEntries.entryDate), asc(journalEntries.createdAt))
    const ids = entries.map((entry) => entry.id)
    const lines = ids.length ? await transactionDb.select().from(journalEntryLines).where(inArray(journalEntryLines.journalEntryId, ids)) : []
    const entryById = new Map(entries.map((entry) => [entry.id, entry]))
    const filtered = lines.filter((line) => !account || line.account === account)
    const result = filtered.map((line) => {
      const entry = entryById.get(line.journalEntryId)!
      return { key: line.id, date: entry.entryDate, entryId: entry.id, reference: entry.reference, description: entry.description, account: line.account, debit: Number(line.debit), credit: Number(line.credit) }
    }).sort((a,b) => a.date.localeCompare(b.date) || a.entryId.localeCompare(b.entryId))
    const runningByAccount = new Map<string, number>()
    const rows = result.map((row) => {
      const running = (runningByAccount.get(row.account) ?? 0) + row.debit - row.credit
      runningByAccount.set(row.account, running)
      return { ...row, balance: Number(running.toFixed(2)) }
    })
    const accounts = [...new Set(lines.map((line) => line.account))].sort((a,b) => a.localeCompare(b))
    return NextResponse.json({ rows, accounts, businessId })
  } catch (error) {
    console.error("GET /api/general-ledger", error)
    return NextResponse.json({ error: "Failed to load general ledger" }, { status: 500 })
  }
}
