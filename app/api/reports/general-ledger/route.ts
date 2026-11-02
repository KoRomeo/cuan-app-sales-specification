import { NextResponse } from "next/server"
import { and, asc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { financialAccounts, journalEntries, journalEntryLines } from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"

export async function GET(request: Request) {
  try {
    const businessId = new URL(request.url).searchParams.get("businessId")
    if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const [accounts, entries] = await Promise.all([
      db.select({ id: financialAccounts.id, name: financialAccounts.name, openingBalance: financialAccounts.openingBalance })
        .from(financialAccounts)
        .where(and(eq(financialAccounts.businessId, businessId), eq(financialAccounts.active, true)))
        .orderBy(asc(financialAccounts.name)),
      db.select({
        id: journalEntries.id,
        date: journalEntries.entryDate,
        kind: journalEntries.kind,
        reference: journalEntries.reference,
        description: journalEntries.description,
        lineId: journalEntryLines.id,
        account: journalEntryLines.account,
        debit: journalEntryLines.debit,
        credit: journalEntryLines.credit,
      }).from(journalEntries)
        .innerJoin(journalEntryLines, eq(journalEntryLines.journalEntryId, journalEntries.id))
        .where(eq(journalEntries.businessId, businessId))
        .orderBy(asc(journalEntries.entryDate), asc(journalEntries.createdAt), asc(journalEntryLines.id)),
    ])

    const accountNames = new Set<string>(accounts.map((a) => a.name))
    for (const entry of entries) accountNames.add(entry.account)
    const balances = new Map<string, number>()
    const openingJournalAccounts = new Set(entries.filter((entry) => entry.kind === "opening").map((entry) => entry.account))
    for (const account of accounts) {
      if (!openingJournalAccounts.has(account.name)) balances.set(account.name, Number(account.openingBalance))
    }
    const rows = entries.map((entry) => {
      const balance = (balances.get(entry.account) ?? 0) + Number(entry.debit) - Number(entry.credit)
      balances.set(entry.account, balance)
      return { ...entry, debit: Number(entry.debit), credit: Number(entry.credit), balance: Number(balance.toFixed(2)) }
    })
    const accountSummary = [...accountNames].sort((a, b) => a.localeCompare(b)).map((name) => ({
      name,
      balance: Number((balances.get(name) ?? 0).toFixed(2)),
    }))
    return NextResponse.json({ accounts: accountSummary, rows })
  } catch (error) {
    console.error("GET /api/reports/general-ledger", error)
    return NextResponse.json({ error: "Failed to load general ledger" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
