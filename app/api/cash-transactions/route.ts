import { NextResponse } from "next/server"
import { and, desc, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { auditLogChanges, auditLogs, financialAccounts, journalEntries, journalEntryLines } from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

export async function GET(request: Request) {
  try {
    const businessId = new URL(request.url).searchParams.get("businessId")
    if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const entries = await db.select().from(journalEntries)
      .where(and(eq(journalEntries.businessId, businessId), inArray(journalEntries.kind, ["opening", "money_in", "transfer", "payment", "expense"])))
      .orderBy(desc(journalEntries.entryDate), desc(journalEntries.createdAt))
    const ids = entries.map((entry) => entry.id)
    const lines = ids.length ? await db.select().from(journalEntryLines).where(inArray(journalEntryLines.journalEntryId, ids)) : []
    const linesByEntry = new Map<string, typeof lines>()
    for (const line of lines) linesByEntry.set(line.journalEntryId, [...(linesByEntry.get(line.journalEntryId) ?? []), line])
    return NextResponse.json(entries.map((entry) => ({
      id: entry.id,
      date: entry.entryDate,
      kind: entry.kind,
      reference: entry.reference,
      description: entry.description,
      lines: (linesByEntry.get(entry.id) ?? []).map((line) => ({ account: line.account, debit: Number(line.debit), credit: Number(line.credit) })),
    })))
  } catch (error) {
    console.error("Failed to load Cash & Bank history", error)
    return NextResponse.json({ error: "Failed to load Cash & Bank history" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { businessId, date, action, account, fromAccount, toAccount, amount, category, description } = body ?? {}
    if (typeof businessId !== "string" || !businessId.trim() || !validDate(date) ||
        !["money_in", "transfer"].includes(action) || typeof amount !== "number" ||
        !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Business, valid date, transaction type, and positive amount are required" }, { status: 400 })
    }
    if (action === "money_in" && (typeof account !== "string" || !account.trim() || typeof category !== "string" || !["owner_capital", "loan_received", "other_income"].includes(category))) {
      return NextResponse.json({ error: "Select a receiving account and a valid source category" }, { status: 400 })
    }
    if (action === "transfer" && (typeof fromAccount !== "string" || !fromAccount.trim() || typeof toAccount !== "string" || !toAccount.trim() || fromAccount.trim() === toAccount.trim())) {
      return NextResponse.json({ error: "Choose two different accounts for the transfer" }, { status: 400 })
    }
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const id = `CB-${crypto.randomUUID()}`
    const entryId = `JE-${action === "money_in" ? "IN" : "TRANSFER"}-${id}`
    const amountText = amount.toFixed(2)
    await db.transaction(async (tx) => {
      const accountNames = action === "money_in" ? [account.trim()] : [fromAccount.trim(), toAccount.trim()]
      const validAccounts = await tx.select({ name: financialAccounts.name }).from(financialAccounts).where(and(
        eq(financialAccounts.businessId, businessId),
        eq(financialAccounts.active, true),
        inArray(financialAccounts.name, accountNames),
      ))
      if (validAccounts.length !== accountNames.length) throw new Error("INVALID_FINANCIAL_ACCOUNT")

      const creditAccount = action === "transfer"
        ? fromAccount.trim()
        : category === "owner_capital" ? "Owner's Equity"
          : category === "loan_received" ? "Loan Payable" : "Other Income"
      const debitAccount = action === "transfer" ? toAccount.trim() : account.trim()
      const transactionDescription = typeof description === "string" && description.trim()
        ? description.trim()
        : action === "transfer" ? `Transfer from ${fromAccount.trim()} to ${toAccount.trim()}`
          : `Money in: ${category === "owner_capital" ? "Owner capital" : category === "loan_received" ? "Loan received" : "Other income"}`

      await tx.insert(journalEntries).values({
        id: entryId, businessId, entryDate: date, kind: action, reference: id, description: transactionDescription,
      })
      await tx.insert(journalEntryLines).values([
        { id: `${entryId}-debit`, journalEntryId: entryId, account: debitAccount, debit: amountText, credit: "0" },
        { id: `${entryId}-credit`, journalEntryId: entryId, account: creditAccount, debit: "0", credit: amountText },
      ])

      const now = new Date()
      const auditId = `AUD-${crypto.randomUUID()}`
      await tx.insert(auditLogs).values({
        id: auditId, businessId, date, time: now.toISOString().slice(11, 19),
        page: "Cash & Bank", action: action === "money_in" ? "Add funds" : "Transfer funds",
        reference: id,
      })
      await tx.insert(auditLogChanges).values([
        { id: `${auditId}-amount`, auditLogId: auditId, property: "Amount", previous: null, current: amountText },
        { id: `${auditId}-account`, auditLogId: auditId, property: action === "money_in" ? "Receiving account" : "From account", previous: null, current: action === "money_in" ? account.trim() : fromAccount.trim() },
        { id: `${auditId}-destination`, auditLogId: auditId, property: action === "money_in" ? "Source category" : "To account", previous: null, current: action === "money_in" ? category : toAccount.trim() },
        { id: `${auditId}-description`, auditLogId: auditId, property: "Description", previous: null, current: transactionDescription },
      ])
    })
    return NextResponse.json({ id, message: action === "money_in" ? "Funds added successfully" : "Transfer recorded successfully" }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_FINANCIAL_ACCOUNT") {
      return NextResponse.json({ error: "Select active Cash & Bank accounts belonging to this business" }, { status: 400 })
    }
    console.error("Failed to record Cash & Bank transaction", error)
    return NextResponse.json({ error: "Failed to record Cash & Bank transaction" }, { status: 500 })
  }
}
