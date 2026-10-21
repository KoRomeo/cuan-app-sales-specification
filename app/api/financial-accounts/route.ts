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
    const [rows, journalLines] = await Promise.all([
      db.select().from(financialAccounts).where(eq(financialAccounts.businessId, businessId)).orderBy(asc(financialAccounts.name)),
      db.select({ account: journalEntryLines.account, debit: journalEntryLines.debit, credit: journalEntryLines.credit, kind: journalEntries.kind, reference: journalEntries.reference })
        .from(journalEntryLines)
        .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
        .where(eq(journalEntries.businessId, businessId)),
    ])
    const balances = new Map<string, number>()
    const accountsWithOpeningJournal = new Set<string>()
    for (const line of journalLines) {
      balances.set(line.account, (balances.get(line.account) ?? 0) + Number(line.debit) - Number(line.credit))
      if (line.kind === "opening" && line.reference.startsWith("FA-")) accountsWithOpeningJournal.add(line.reference)
    }
    return NextResponse.json(rows.map((account) => {
      const openingAlreadyJournaled = accountsWithOpeningJournal.has(account.id)
      const openingBalance = openingAlreadyJournaled ? 0 : Number(account.openingBalance)
      return { ...account, currentBalance: Number((openingBalance + (balances.get(account.name) ?? 0)).toFixed(2)) }
    }))
  } catch (error) {
    console.error("Failed to fetch financial accounts", error)
    return NextResponse.json({ error: "Failed to fetch financial accounts" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { businessId, name, type, openingBalance = 0 } = body
    if (typeof businessId !== "string" || !businessId.trim() || typeof name !== "string" || !name.trim() || !["cash", "bank"].includes(type)) {
      return NextResponse.json({ error: "businessId, name, and a valid account type are required" }, { status: 400 })
    }
    if (typeof openingBalance !== "number" || !Number.isFinite(openingBalance) || openingBalance < 0) {
      return NextResponse.json({ error: "openingBalance must be a non-negative number" }, { status: 400 })
    }
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const created = await db.transaction(async (tx) => {
      const id = `FA-${crypto.randomUUID()}`
      const [account] = await tx.insert(financialAccounts).values({
        id, businessId, name: name.trim(), type, openingBalance: String(openingBalance), active: true,
      }).returning()
      if (openingBalance > 0) {
        const entryId = `JE-OPENING-${id}`
        const amount = openingBalance.toFixed(2)
        await tx.insert(journalEntries).values({
          id: entryId, businessId, entryDate: new Date().toISOString().slice(0, 10),
          kind: "opening", reference: id, description: `Opening balance for ${name.trim()}`,
        })
        await tx.insert(journalEntryLines).values([
          { id: `${entryId}-debit`, journalEntryId: entryId, account: name.trim(), debit: amount, credit: "0" },
          { id: `${entryId}-credit`, journalEntryId: entryId, account: "Opening Balance Equity", debit: "0", credit: amount },
        ])
      }
      return account
    })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("Failed to create financial account", error)
    const duplicate = error instanceof Error && /duplicate|unique/i.test(error.message)
    return NextResponse.json({ error: duplicate ? "An account with this name already exists" : "Failed to create financial account" }, { status: duplicate ? 409 : 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { businessId, id, active } = body
    if (typeof businessId !== "string" || !businessId || typeof id !== "string" || typeof active !== "boolean") {
      return NextResponse.json({ error: "businessId, id, and active are required" }, { status: 400 })
    }
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const [updated] = await db.update(financialAccounts).set({ active }).where(and(eq(financialAccounts.id, id), eq(financialAccounts.businessId, businessId))).returning()
    if (!updated) return NextResponse.json({ error: "Financial account not found" }, { status: 404 })
    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to update financial account", error)
    return NextResponse.json({ error: "Failed to update financial account" }, { status: 500 })
  }
}
