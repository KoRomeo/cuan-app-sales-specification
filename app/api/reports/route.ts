import { NextResponse } from "next/server"
import { and, desc, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  auditLogs, auditLogChanges, customers, deliveries, expenses, journalEntries,
  journalEntryLines, orderItems, orders, payments, products, purchaseItems,
  purchases, replacements, returns, stockMovements, suppliers, user,
} from "@/lib/db/schema"
import { requireBusinessAccess } from "@/lib/api-auth"

const validDate = (value: string | null) => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + "T00:00:00Z"))
const within = (date: string, from: string, to: string) => date >= from && date <= to
const num = (value: unknown) => Number(value ?? 0)

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const businessId = url.searchParams.get("businessId")
    const from = url.searchParams.get("from")
    const to = url.searchParams.get("to")
    if (!businessId) return NextResponse.json({ error: "businessId is required" }, { status: 400 })
    if (!validDate(from) || !validDate(to) || from! > to!) return NextResponse.json({ error: "Valid from and to dates are required" }, { status: 400 })
    const access = await requireBusinessAccess(businessId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const [orderRows, purchaseRows, productRows, paymentRows, expenseRows, movementRows, deliveryRows, replacementRows, returnRows, journalRows, accountRows, customerRows, supplierRows, logs] = await Promise.all([
      db.select().from(orders).where(eq(orders.businessId, businessId)),
      db.select().from(purchases).where(eq(purchases.businessId, businessId)),
      db.select().from(products).where(eq(products.businessId, businessId)),
      db.select().from(payments).where(eq(payments.businessId, businessId)),
      db.select().from(expenses).where(eq(expenses.businessId, businessId)),
      db.select().from(stockMovements).where(eq(stockMovements.businessId, businessId)),
      db.select({ id: deliveries.id, date: deliveries.date, method: deliveries.method, recipient: deliveries.recipient, address: deliveries.address, transportCost: deliveries.transportCost, orderId: deliveries.orderId }).from(deliveries).innerJoin(orders, and(eq(orders.id, deliveries.orderId), eq(orders.businessId, businessId))),
      db.select().from(replacements).where(eq(replacements.businessId, businessId)),
      db.select().from(returns).where(eq(returns.businessId, businessId)),
      db.select().from(journalEntries).where(eq(journalEntries.businessId, businessId)),
      db.select({ id: journalEntryLines.id, journalEntryId: journalEntryLines.journalEntryId, account: journalEntryLines.account, debit: journalEntryLines.debit, credit: journalEntryLines.credit }).from(journalEntryLines).innerJoin(journalEntries, eq(journalEntries.id, journalEntryLines.journalEntryId)).where(eq(journalEntries.businessId, businessId)),
      db.select().from(customers).where(eq(customers.businessId, businessId)),
      db.select().from(suppliers).where(eq(suppliers.businessId, businessId)),
      db.select({ id: auditLogs.id, date: auditLogs.date, time: auditLogs.time, page: auditLogs.page, action: auditLogs.action, reference: auditLogs.reference, userName: user.name }).from(auditLogs).leftJoin(user, eq(auditLogs.userId, user.id)).where(eq(auditLogs.businessId, businessId)).orderBy(desc(auditLogs.date), desc(auditLogs.time)),
    ])
    const orderIds = orderRows.map(x => x.id)
    const purchaseIds = purchaseRows.map(x => x.id)
    const [orderLineRows, purchaseLineRows] = await Promise.all([
      orderIds.length ? db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)) : Promise.resolve([]),
      purchaseIds.length ? db.select().from(purchaseItems).where(inArray(purchaseItems.purchaseId, purchaseIds)) : Promise.resolve([]),
    ])
    const customerMap = new Map(customerRows.map(x => [x.id, x.name]))
    const supplierMap = new Map(supplierRows.map(x => [x.id, x.name]))
    const productMap = new Map(productRows.map(x => [x.id, x]))
    const orderPayments = new Map<string, number>()
    const purchasePayments = new Map<string, number>()
    for (const p of paymentRows) {
      if (p.orderId) orderPayments.set(p.orderId, (orderPayments.get(p.orderId) ?? 0) + num(p.amount))
      if (p.purchaseId) purchasePayments.set(p.purchaseId, (purchasePayments.get(p.purchaseId) ?? 0) + num(p.amount))
    }
    const sales = orderRows.filter(o => within(o.date, from!, to!) && o.status !== "cancelled").map(o => {
      const items = orderLineRows.filter(i => i.orderId === o.id)
      const total = items.reduce((s, i) => s + i.qty * num(i.price) - num(i.discount), 0)
      const cogs = items.reduce((s, i) => s + i.qty * num(i.unitCost), 0)
      const linkedReturns = returnRows.filter((r) => r.orderId === o.id && within(r.date, from!, to!))
      const linkedReturnIds = new Set(linkedReturns.map((r) => r.id))
      const linkedJournalIds = new Set(journalRows.filter((entry) => entry.kind === "return" && linkedReturnIds.has(entry.reference) && within(entry.entryDate, from!, to!)).map((entry) => entry.id))
      const linkedJournalLines = accountRows.filter((line) => linkedJournalIds.has(line.journalEntryId))
      const refundTotal = linkedReturns.reduce((sum, r) => sum + num(r.refundAmount), 0)
      const returnedCogs = linkedJournalLines.filter((line) => line.account === "Cost of Goods Sold").reduce((sum, line) => sum + num(line.credit) - num(line.debit), 0)
      const replacementCost = linkedJournalLines.filter((line) => line.account === "Replacement Cost").reduce((sum, line) => sum + num(line.debit) - num(line.credit), 0)
      const netRevenue = total - refundTotal
      const netCogs = cogs - returnedCogs
      return { id: o.id, date: o.date, customer: customerMap.get(o.customerId) ?? o.customerId, customerId: o.customerId, status: o.status, total, refundTotal, netRevenue, cogs, netCogs, replacementCost, grossProfit: netRevenue - netCogs - replacementCost, paid: orderPayments.get(o.id) ?? 0, outstanding: Math.max(0, total - (orderPayments.get(o.id) ?? 0)), returnCount: linkedReturns.length, items: items.map(i => ({ productId: i.productId, product: productMap.get(i.productId)?.name ?? i.productId, qty: i.qty, price: num(i.price), total: i.qty * num(i.price) - num(i.discount) })) }
    })
    const purchaseReport = purchaseRows.filter(p => within(p.date, from!, to!)).map(p => {
      const items = purchaseLineRows.filter(i => i.purchaseId === p.id)
      const total = items.reduce((s, i) => s + i.qty * num(i.unitCost), 0)
      const paid = purchasePayments.get(p.id) ?? 0
      return { id: p.id, date: p.date, supplier: supplierMap.get(p.supplierId) ?? p.supplierId, supplierId: p.supplierId, total, paid, outstanding: Math.max(0, total - paid), items: items.map(i => ({ productId: i.productId, product: productMap.get(i.productId)?.name ?? i.productId, qty: i.qty, unitCost: num(i.unitCost), total: i.qty * num(i.unitCost) })) }
    })
    const inventory = productRows.map(p => {
      const stock = movementRows.filter(m => m.productId === p.id).reduce((s, m) => s + m.qty, 0)
      return { id: p.id, product: p.name, stock, minimumStock: p.minimumStock, averageCost: num(p.averageCost), stockValue: stock * num(p.averageCost), status: stock < 0 ? "negative" : stock < p.minimumStock ? "low" : "normal" }
    }).sort((a,b) => a.product.localeCompare(b.product))
    const paymentsReport = paymentRows.filter(p => within(p.date, from!, to!)).map(p => ({ id: p.id, date: p.date, amount: num(p.amount), account: p.account, reference: p.orderId ?? p.purchaseId ?? "—", kind: p.orderId ? "receivable" : "payable" }))
    const expenseReport = expenseRows.filter(e => within(e.date, from!, to!)).map(e => ({ id: e.id, date: e.date, category: e.category, description: e.description, account: e.account, amount: num(e.amount) }))
    const deliveriesReport = deliveryRows.filter(d => within(d.date, from!, to!)).map(d => ({ ...d, transportCost: num(d.transportCost) }))
    const replacementsReport = replacementRows.filter(r => within(r.date, from!, to!)).map(r => {
      const entry = journalRows.find((journal) => journal.kind === "replacement" && journal.reference === r.id && within(journal.entryDate, from!, to!))
      const cost = accountRows.filter((line) => line.journalEntryId === entry?.id && line.account === "Cost of Goods Sold").reduce((sum, line) => sum + num(line.debit) - num(line.credit), 0)
      return { id: r.id, date: r.date, orderId: r.orderId, product: productMap.get(r.productId)?.name ?? r.productId, qty: r.qty, reason: r.reason, delivered: r.delivered, cost }
    })
    const entries = journalRows.filter(j => within(j.entryDate, from!, to!)).map(j => ({ id: j.id, date: j.entryDate, kind: j.kind, reference: j.reference, description: j.description, lines: accountRows.filter(l => l.journalEntryId === j.id).map(l => ({ account: l.account, debit: num(l.debit), credit: num(l.credit) })) }))
    const historyIds = logs.filter(l => within(l.date, from!, to!)).map(l => l.id)
    const changes = historyIds.length ? await db.select().from(auditLogChanges).where(inArray(auditLogChanges.auditLogId, historyIds)) : []
    const history = logs.filter(l => within(l.date, from!, to!)).map(l => ({ id: l.id, date: l.date, time: l.time, page: l.page, action: l.action, reference: l.reference, user: l.userName ?? "System", changes: changes.filter(c => c.auditLogId === l.id).map(c => ({ property: c.property, previous: c.previous ?? "—", current: c.current ?? "—" })) }))
    const expensesTotal = expenseReport.reduce((s,e)=>s+e.amount,0)
    const transportTotal = deliveriesReport.reduce((s,d)=>s+d.transportCost,0)
    const existingReplacementCost = replacementsReport.reduce((s,r)=>s+r.cost,0)
    const grossRevenue = sales.reduce((s,o)=>s+o.total,0)
    const returnJournals = entries.filter(e => e.kind === "return")
    const salesReturns = returnJournals.reduce((sum, entry) => sum + entry.lines.filter(line => line.account === "Sales Returns").reduce((part, line) => part + line.debit - line.credit, 0), 0)
    const returnedCogs = returnJournals.reduce((sum, entry) => sum + entry.lines.filter(line => line.account === "Cost of Goods Sold").reduce((part, line) => part + line.credit - line.debit, 0), 0)
    const returnReplacementCost = returnJournals.reduce((sum, entry) => sum + entry.lines.filter(line => line.account === "Replacement Cost").reduce((part, line) => part + line.debit - line.credit, 0), 0)
    const replacementCost = existingReplacementCost + returnReplacementCost
    const revenue = grossRevenue - salesReturns
    const cogs = sales.reduce((s,o)=>s+o.cogs,0) - returnedCogs
    const returnsReport = returnRows.filter(r => within(r.date, from!, to!)).map(r => {
      const entry = returnJournals.find((journal) => journal.reference === r.id)
      const replacementCost = (entry?.lines ?? []).filter(line => line.account === "Replacement Cost").reduce((sum, line) => sum + line.debit - line.credit, 0)
      return { id: r.id, date: r.date, orderId: r.orderId, total: num(r.total), refundAmount: num(r.refundAmount), replacementCost, stockReturned: r.stockReturned, notes: r.notes }
    })
    const purchaseTotal = purchaseReport.reduce((s,p)=>s+p.total,0)
    const receivables = orderRows.filter(o=>o.status!=="cancelled").reduce((s,o)=>{const total=orderLineRows.filter(i=>i.orderId===o.id).reduce((n,i)=>n+i.qty*num(i.price)-num(i.discount),0);return s+Math.max(0,total-(orderPayments.get(o.id)??0))},0)
    const payables = purchaseRows.reduce((s,p)=>{const total=purchaseLineRows.filter(i=>i.purchaseId===p.id).reduce((n,i)=>n+i.qty*num(i.unitCost),0);return s+Math.max(0,total-(purchasePayments.get(p.id)??0))},0)
    const cashIn = paymentsReport.filter(p=>p.kind==="receivable").reduce((s,p)=>s+p.amount,0)
    const refundCashOut = returnsReport.reduce((sum, item) => sum + item.refundAmount, 0)
    const cashOut = paymentsReport.filter(p=>p.kind==="payable").reduce((s,p)=>s+p.amount,0)+expensesTotal+refundCashOut
    const periodJournals = entries.flatMap(e=>e.lines.map(l=>({entryId:e.id,date:e.date,kind:e.kind,reference:e.reference,description:e.description,account:l.account,debit:l.debit,credit:l.credit})))
    return NextResponse.json({
      range:{from,to}, summary:{grossSales:grossRevenue,salesReturns,sales:revenue,orders:sales.length,averageOrder:sales.length?revenue/sales.length:0,cogs,grossProfit:revenue-cogs-replacementCost,transport:transportTotal,replacementCost,expenses:expensesTotal,netProfit:revenue-cogs-transportTotal-replacementCost-expensesTotal,purchases:purchaseTotal,receivables,payables,cashIn,cashOut,refundCashOut,netCash:cashIn-cashOut,inventoryValue:inventory.reduce((s,p)=>s+p.stockValue,0),negativeStock:inventory.filter(p=>p.stock<0).length,lowStock:inventory.filter(p=>p.status==="low").length},
      sales,returns:returnsReport,purchases:purchaseReport,inventory,payments:paymentsReport,expenses:expenseReport,deliveries:deliveriesReport,replacements:replacementsReport,journals:entries,ledger:periodJournals,history,
    })
  } catch (error) {
    console.error("GET /api/reports", error)
    return NextResponse.json({ error: "Failed to generate reports" }, { status: 500 })
  }
}
