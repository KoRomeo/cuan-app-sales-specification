import {
  expenses, inRange, orders, orderCogs, orderTotal, productById, products,
  purchases, purchaseTotal, replacements, stockMovements, TODAY,
} from '@/lib/data'

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
export type EntryKind = 'opening' | 'sale' | 'cogs' | 'customer-payment' | 'purchase' | 'supplier-payment' | 'expense' | 'transport' | 'replacement' | 'adjustment' | 'reversal'
export interface LedgerAccount { code: string; name: string; type: AccountType; isCash?: boolean; group?: 'cogs' | 'transport' | 'operating' }
export interface JournalLine { accountCode: string; account?: string; debit: number; credit: number; description: string }
export interface JournalEntry { id: string; date: string; source?: string; memo?: string; kind: EntryKind; reference: string; description: string; lines: JournalLine[]; reverses?: string }
export type JournalDraft = Omit<JournalEntry, 'id'>

export const expenseCodeByCategory: Record<string, string> = { Transport: '6100', Fuel: '6200', Packaging: '6300', Telephone: '6400', Marketing: '6500', Office: '6600', Other: '6900' }
export const chartOfAccounts: LedgerAccount[] = [
  { code: '1100', name: 'Cash', type: 'asset', isCash: true }, { code: '1110', name: 'Bank', type: 'asset', isCash: true },
  { code: '1200', name: 'Accounts Receivable', type: 'asset' }, { code: '1300', name: 'Inventory', type: 'asset' },
  { code: '2100', name: 'Accounts Payable', type: 'liability' }, { code: '3100', name: 'Retained Earnings', type: 'equity' },
  { code: '4100', name: 'Sales Revenue', type: 'revenue' }, { code: '5100', name: 'Cost of Goods Sold', type: 'expense', group: 'cogs' },
  { code: '6100', name: 'Transport Expense', type: 'expense', group: 'transport' }, ...Object.entries(expenseCodeByCategory).filter(([k]) => k !== 'Transport').map(([name, code]) => ({ code, name: `${name} Expense`, type: 'expense' as const, group: 'operating' as const })),
]

const cashCode = (account: string) => /bank/i.test(account) ? '1110' : '1100'
const entry = (id: string, date: string, kind: EntryKind, reference: string, description: string, lines: JournalLine[]): JournalEntry => ({ id, date, kind, reference, description, lines })
const line = (accountCode: string, debit: number, credit: number, description: string): JournalLine => ({ accountCode, debit, credit, description })

export const journalEntries: JournalEntry[] = [
  ...orders.filter(o => o.status !== 'cancelled').flatMap(o => {
    const total = orderTotal(o); const cogs = orderCogs(o)
    const sale = entry(`JE-${o.id}-SALE`, o.date, 'sale', o.id, 'Sales invoice', [line('1200', total, 0, 'Accounts receivable'), line('4100', 0, total, 'Sales revenue')])
    const cost = entry(`JE-${o.id}-COGS`, o.date, 'cogs', o.id, 'Cost of goods sold', [line('5100', cogs, 0, 'Cost of goods sold'), line('1300', 0, cogs, 'Inventory')])
    const payments = o.payments.map(p => entry(`JE-${p.id}`, p.date, 'customer-payment', o.id, 'Customer payment', [line(cashCode(p.account), p.amount, 0, p.account), line('1200', 0, p.amount, 'Accounts receivable')]))
    return [sale, cost, ...payments]
  }),
  ...purchases.flatMap(p => {
    const total = purchaseTotal(p)
    const purchase = entry(`JE-${p.id}-PURCHASE`, p.date, 'purchase', p.id, 'Inventory purchase', [line('1300', total, 0, 'Inventory'), line('2100', 0, total, 'Accounts payable')])
    return [purchase, ...p.payments.map(x => entry(`JE-${x.id}`, x.date, 'supplier-payment', p.id, 'Supplier payment', [line('2100', x.amount, 0, 'Accounts payable'), line(cashCode(x.account), 0, x.amount, x.account)]))]
  }),
  ...expenses.map(x => entry(`JE-${x.id}`, x.date, 'expense', x.id, x.description, [line(expenseCodeByCategory[x.category] ?? '6900', x.amount, 0, x.category), line(cashCode(x.account), 0, x.amount, x.account)])),
  ...orders.filter(o => o.delivery?.transportCost).map(o => entry(`JE-${o.id}-TRANSPORT`, o.delivery!.date, 'transport', o.id, 'Delivery transport', [line('6100', o.delivery!.transportCost, 0, 'Transport expense'), line(cashCode('Cash'), 0, o.delivery!.transportCost, 'Cash')])),
]

export function isBalanced(e: JournalEntry) { return Math.abs(e.lines.reduce((n, x) => n + x.debit - x.credit, 0)) < 0.01 }
export function accountBalance(code: string, asOf = TODAY) { return journalEntries.filter(e => e.date <= asOf).reduce((n, e) => n + e.lines.filter(x => x.accountCode === code).reduce((s, x) => s + x.debit - x.credit, 0), 0) }
export function inventoryValue() { return products.reduce((n, p) => n + Math.max(0, p.stock) * p.averageCost, 0) }
export function profitAndLoss(range: [string, string]) { const relevant = orders.filter(o => o.status === 'delivered' && inRange(o.date, range)); const revenue = relevant.reduce((n, o) => n + orderTotal(o), 0); const cogs = relevant.reduce((n, o) => n + orderCogs(o), 0); const transport = relevant.reduce((n, o) => n + (o.delivery?.transportCost ?? 0), 0); const periodExpenses = expenses.filter(x => inRange(x.date, range) && x.category !== 'Transport'); const expenseByCategory = [...new Map(periodExpenses.map(x => [x.category, periodExpenses.filter(y => y.category === x.category).reduce((n, y) => n + y.amount, 0)])).entries()]; const operating = periodExpenses.reduce((n, x) => n + x.amount, 0); return { revenue, cogs, grossProfit: revenue - cogs, transport, operating, expenseByCategory, netProfit: revenue - cogs - transport - operating } }
const accountRow = (code: string, asOf: string) => { const account = chartOfAccounts.find(a => a.code === code)!; return { account, balance: accountBalance(code, asOf) } }
export function balanceSheet(asOf = TODAY) { const cash = accountBalance('1100', asOf) + accountBalance('1110', asOf); const inventory = inventoryValue(); const receivables = orders.filter(o => o.status !== 'cancelled' && o.date <= asOf).reduce((n, o) => n + Math.max(orderTotal(o) - o.payments.filter(p => p.date <= asOf).reduce((s, p) => s + p.amount, 0), 0), 0); const payables = purchases.filter(p => p.date <= asOf).reduce((n, p) => n + Math.max(purchaseTotal(p) - p.payments.filter(x => x.date <= asOf).reduce((s, x) => s + x.amount, 0), 0), 0); const assets = [accountRow('1100', asOf), accountRow('1110', asOf), { account: chartOfAccounts.find(a => a.code === '1300')!, balance: inventory }, { account: chartOfAccounts.find(a => a.code === '1200')!, balance: receivables }]; const liabilities = [{ account: chartOfAccounts.find(a => a.code === '2100')!, balance: payables }]; const equity = [{ account: chartOfAccounts.find(a => a.code === '3100')!, balance: assets.reduce((n, x) => n + x.balance, 0) - payables }]; const totalAssets = assets.reduce((n, x) => n + x.balance, 0); const totalLiabilities = payables; const totalEquity = totalAssets - totalLiabilities; return { assets, liabilities, equity, cash, inventory, receivables, payables, totalAssets, totalLiabilities, totalEquity, currentEarnings: 0 } }
export function cashFlow(range: [string, string]) { const customerPayments = orders.flatMap(o => o.payments).filter(p => inRange(p.date, range)).reduce((n, p) => n + p.amount, 0); const supplierPayments = purchases.flatMap(p => p.payments).filter(p => inRange(p.date, range)).reduce((n, p) => n + p.amount, 0); const expensesPaid = expenses.filter(x => inRange(x.date, range)).reduce((n, x) => n + x.amount, 0); return { customerPayments, supplierPayments, expensesPaid, cashIn: customerPayments, cashOutSuppliers: supplierPayments, cashOutExpenses: expensesPaid, net: customerPayments - supplierPayments - expensesPaid } }
export function generalLedger(code: string, range: [string, string]) { let balance = 0; return journalEntries.filter(e => inRange(e.date, range)).flatMap(e => e.lines.filter(x => x.accountCode === code).map(x => { balance += x.debit - x.credit; return { entryId: e.id, date: e.date, memo: e.description, debit: x.debit, credit: x.credit, balance } })) }

void productById; void stockMovements; void replacements
export const now = () => TODAY
export const allAccounts = () => chartOfAccounts
export const journalBalance = () => journalEntries.reduce((n, e) => n + e.lines.reduce((s, x) => s + x.debit - x.credit, 0), 0)
