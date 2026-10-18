import { NextResponse } from "next/server"
import { and, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { expenses, journalEntries, journalEntryLines, financialAccounts } from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"
import { generateEntityId } from "@/lib/db/ids"

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

export async function GET(request: Request) {
  try {
    const businessId = new URL(request.url).searchParams.get("businessId")
    if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    const rows = await db.select().from(expenses).where(eq(expenses.businessId, businessId)).orderBy(desc(expenses.date))
    return NextResponse.json(rows)
  } catch (error) {
    console.error("GET /api/expenses", error)
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { businessId, date, category, amount, account, description } = body ?? {}
    if (typeof businessId !== "string" || !businessId.trim() ||
        !validDate(date) ||
        typeof category !== "string" || !category.trim() ||
        typeof account !== "string" || !account.trim() ||
        typeof description !== "string" || !description.trim() ||
        typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Valid business, date, category, amount, account and description are required" }, { status: 400 })
    }
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const expense = await db.transaction(async (tx) => {
      const [cashAccount] = await tx.select({ id: financialAccounts.id }).from(financialAccounts)
        .where(and(
          eq(financialAccounts.businessId, businessId),
          eq(financialAccounts.name, account.trim()),
          eq(financialAccounts.active, true),
        )).limit(1)
      if (!cashAccount) throw new Error("INVALID_FINANCIAL_ACCOUNT")
      const id = await generateEntityId(tx, expenses, businessId, "EXP", date)
      const [created] = await tx.insert(expenses).values({
        id, businessId, date, category: category.trim(), amount: amount.toFixed(2),
        account: account.trim(), description: description.trim(),
      }).returning()
      const entryId = `JE-EXP-${id}`
      await tx.insert(journalEntries).values({
        id: entryId, businessId, entryDate: date, kind: "expense", reference: id,
        description: description.trim(),
      })
      await tx.insert(journalEntryLines).values([
        { id: `${entryId}-debit`, journalEntryId: entryId, account: category.trim(), debit: amount.toFixed(2), credit: "0" },
        { id: `${entryId}-credit`, journalEntryId: entryId, account: account.trim(), debit: "0", credit: amount.toFixed(2) },
      ])
      return created
    })
    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_FINANCIAL_ACCOUNT") {
      return NextResponse.json({ error: "Select an active Cash & Bank account for this business" }, { status: 400 })
    }
    console.error("POST /api/expenses", error)
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 })
  }
}
