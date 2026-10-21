import { NextResponse } from "next/server"
import { and, eq, gte, inArray, lte } from "drizzle-orm"
import { transactionDb } from "@/lib/db/transaction"
import { orders, journalEntries, journalEntryLines } from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get("businessId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    if ((startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) ||
        (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate))) {
      return NextResponse.json({ error: "Dates must use YYYY-MM-DD format" }, { status: 400 })
    }
    if (startDate && endDate && startDate > endDate) {
      return NextResponse.json({ error: "startDate cannot be after endDate" }, { status: 400 })
    }

    const orderConditions = [eq(orders.businessId, businessId),
      ...(startDate ? [gte(orders.date, startDate)] : []),
      ...(endDate ? [lte(orders.date, endDate)] : [])]
    const orderRows = await transactionDb.select({ id: orders.id }).from(orders).where(and(...orderConditions))

    const entryConditions = [eq(journalEntries.businessId, businessId),
      ...(startDate ? [gte(journalEntries.entryDate, startDate)] : []),
      ...(endDate ? [lte(journalEntries.entryDate, endDate)] : [])]
    const entries = await transactionDb.select().from(journalEntries).where(and(...entryConditions))
    const entryIds = entries.map((entry) => entry.id)
    const lines = entryIds.length
      ? await transactionDb.select().from(journalEntryLines).where(inArray(journalEntryLines.journalEntryId, entryIds))
      : []
    const linesByEntry = new Map<string, typeof lines>()
    for (const line of lines) {
      const group = linesByEntry.get(line.journalEntryId) ?? []
      group.push(line)
      linesByEntry.set(line.journalEntryId, group)
    }

    const ledger = lines.reduce<Record<string, { debit: number; credit: number }>>((result, line) => {
      const current = result[line.account] ?? { debit: 0, credit: 0 }
      current.debit += Number(line.debit)
      current.credit += Number(line.credit)
      result[line.account] = current
      return result
    }, {})
    const sumAccount = (account: string, side: "debit" | "credit") =>
      lines.filter((line) => line.account === account).reduce((sum, line) => sum + Number(line[side]), 0)
    const round = (value: number) => Number(value.toFixed(2))
    const grossSalesRevenue = sumAccount("Sales Revenue", "credit") - sumAccount("Sales Revenue", "debit")
    const salesReturns = sumAccount("Sales Returns", "debit") - sumAccount("Sales Returns", "credit")
    const salesRevenue = grossSalesRevenue - salesReturns
    const costOfGoodsSold = sumAccount("Cost of Goods Sold", "debit") - sumAccount("Cost of Goods Sold", "credit")
    const replacementCost = sumAccount("Replacement Cost", "debit") - sumAccount("Replacement Cost", "credit")
    const totalPurchases = entries.filter((entry) => entry.kind === "purchase").reduce((sum, entry) =>
      sum + (linesByEntry.get(entry.id) ?? []).filter((line) => line.account === "Inventory")
        .reduce((part, line) => part + Number(line.debit) - Number(line.credit), 0), 0)
    const totalExpenses = entries.filter((entry) => entry.kind === "expense").reduce((sum, entry) =>
      sum + (linesByEntry.get(entry.id) ?? []).reduce((part, line) => part + Number(line.debit), 0), 0)
    const totalPaymentsReceived = entries.filter((entry) => entry.kind === "payment").reduce((sum, entry) => {
      const entryLines = linesByEntry.get(entry.id) ?? []
      const receivableCredit = entryLines.filter((line) => line.account === "Accounts Receivable")
        .reduce((part, line) => part + Number(line.credit), 0)
      return sum + receivableCredit
    }, 0)
    const entryBalances = entries.map((entry) => {
      const entryLines = linesByEntry.get(entry.id) ?? []
      return entryLines.reduce((sum, line) => sum + Number(line.debit) - Number(line.credit), 0)
    })
    const ledgerBalanced = entryBalances.every((balance) => Math.abs(balance) < 0.005)

    return NextResponse.json({
      businessId,
      period: { startDate: startDate || null, endDate: endDate || null },
      orderCount: orderRows.length,
      grossSalesRevenue: round(grossSalesRevenue),
      salesReturns: round(salesReturns),
      salesRevenue: round(salesRevenue),
      netSales: round(salesRevenue),
      costOfGoodsSold: round(costOfGoodsSold),
      replacementCost: round(replacementCost),
      grossProfit: round(salesRevenue - costOfGoodsSold - replacementCost),
      totalPaymentsReceived: round(totalPaymentsReceived),
      totalPurchases: round(totalPurchases),
      totalExpenses: round(totalExpenses),
      ledger,
      ledgerBalanced,
      note: "Financial totals are calculated from persisted journal entries; operational Order count is shown separately.",
    })
  } catch (error) {
    console.error("Failed to generate accounting summary:", error)
    return NextResponse.json({ error: "Failed to generate accounting summary" }, { status: 500 })
  }
}
