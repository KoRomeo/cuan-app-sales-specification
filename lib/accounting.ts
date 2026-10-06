import {
  expenses,
  inRange,
  orders,
  orderCogs,
  orderTotal,
  productById,
  products,
  purchases,
  purchaseTotal,
  replacements,
  stockMovements,
  TODAY,
} from '@/lib/data'

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'

export type EntryKind =
  | 'opening'
  | 'sale'
  | 'cogs'
  | 'customer-payment'
  | 'purchase'
  | 'supplier-payment'
  | 'expense'
  | 'transport'
  | 'replacement'
  | 'adjustment'

export interface LedgerAccount {
  code: string
  name: string
  type: AccountType
  isCash?: boolean
}

export interface JournalLine {
  accountCode: string
  debit: number
  credit: number
  description: string
}

export interface JournalEntry {
  id: string
  date: string
  kind: EntryKind
  reference: string
  description: string
  lines: JournalLine[]
}

const expenseCodeByCategory: Record<string, string> = {
  Transport: '6100',
  Fuel: '6200',
  Packaging: '6300',
  Telephone: '6400',
  Marketing: '6500',
  Office: '6600',
  Other: '6900',
}

export const chartOfAccounts: LedgerAccount[] = [
  { code: '1100', name: 'Cash', type: 'asset', isCash: true },
  { code: '1110', name: 'Bank BCA', type: 'asset', isCash: true },
  { code: '1120', name: 'Bank Mandiri', type: 'asset', isCash: true },
  { code: '1200', name: 'Accounts Receivable', type: 'asset' },
  { code: '1300', name: 'Inventory', type: 'asset' },
  { code: '2100', name: 'Accounts Payable', type: 'liability' },
  { code: '3100', name: "Owner's Equity", type: 'equity' },
  { code: '4100', name: 'Sales Revenue', type: 'revenue' },
  { code: '5100', name: 'Cost of Goods Sold', type: 'expense' },
  { code: '5200', name: 'Stock Adjustment Loss', type: 'expense' },
  { code: '6100', name: 'Transport Expense', type: 'expense' },
  { code: '6200', name: 'Fuel Expense', type: 'expense' },
  { code: '6300', name: 'Packaging Expense', type: 'expense' },
  { code: '6400', name: 'Telephone Expense', type: 'expense' },
  { code: '6500', name: 'Marketing Expense', type: 'expense' },
  { code: '6600', name: 'Office Expense', type: 'expense' },
  { code: '6900', name: 'Other Expense', type: 'expense' },
]

const cashCodeByName: Record<string, string> = {
  Cash: '1100',
  'Bank BCA': '1110',
  'Bank Mandiri': '1120',
}

const openingBalances: Record<string, number> = { '1100': 5_000_000, '1110': 25_000_000, '1120': 10_000_000 }

export const accountByCode = (code: string) => chartOfAccounts.find((a) => a.code === code)

const cashCode = (name: string) => cashCodeByName[name] ?? '1100'

const dr = (accountCode: string, amount: number, description = ''): JournalLine => ({ accountCode, debit: amount, credit: 0, description })
const cr = (accountCode: string, amount: number, description = ''): JournalLine => ({ accountCode, debit: 0, credit: amount, description })

function build(): JournalEntry[] {
  const raw: Omit<JournalEntry, 'id'>[] = []

  const cashOpening = Object.entries(openingBalances)
  raw.push({
    date: '2026-09-01',
    kind: 'opening',
    reference: 'OPENING',
    description: 'Opening balance — cash and bank',
    lines: [
      ...cashOpening.map(([code, amount]) => dr(code, amount)),
      cr('3100', cashOpening.reduce((s, [, a]) => s + a, 0)),
    ],
  })

  const openingInventory = stockMovements
    .filter((m) => m.type === 'opening' && m.qty > 0)
    .reduce((s, m) => s + m.qty * (productById(m.productId)?.averageCost ?? 0), 0)
  raw.push({
    date: '2026-09-01',
    kind: 'opening',
    reference: 'OPENING',
    description: 'Opening balance — inventory',
    lines: [dr('1300', openingInventory), cr('3100', openingInventory)],
  })

  for (const o of orders.filter((o) => o.status !== 'cancelled')) {
    const total = orderTotal(o)
    const cogs = orderCogs(o)
    raw.push({
      date: o.date,
      kind: 'sale',
      reference: o.id,
      description: `Sale ${o.id}`,
      lines: [dr('1200', total), cr('4100', total)],
    })
    if (cogs > 0) {
      raw.push({
        date: o.date,
        kind: 'cogs',
        reference: o.id,
        description: `Cost of goods sold ${o.id}`,
        lines: [dr('5100', cogs), cr('1300', cogs)],
      })
    }
    if (o.delivery && o.delivery.transportCost > 0) {
      raw.push({
        date: o.delivery.date,
        kind: 'transport',
        reference: o.delivery.id,
        description: `Delivery transport ${o.delivery.id}`,
        lines: [dr('6100', o.delivery.transportCost), cr('1100', o.delivery.transportCost)],
      })
    }
    for (const p of o.payments) {
      raw.push({
        date: p.date,
        kind: 'customer-payment',
        reference: p.id,
        description: `Payment ${p.id} for ${o.id}`,
        lines: [dr(cashCode(p.account), p.amount), cr('1200', p.amount)],
      })
    }
  }

  for (const p of purchases) {
    const total = purchaseTotal(p)
    raw.push({
      date: p.date,
      kind: 'purchase',
      reference: p.id,
      description: `Purchase ${p.id}`,
      lines: [dr('1300', total), cr('2100', total)],
    })
    for (const pay of p.payments) {
      raw.push({
        date: pay.date,
        kind: 'supplier-payment',
        reference: pay.id,
        description: `Payment ${pay.id} for ${p.id}`,
        lines: [dr('2100', pay.amount), cr(cashCode(pay.account), pay.amount)],
      })
    }
  }

  for (const e of expenses) {
    raw.push({
      date: e.date,
      kind: 'expense',
      reference: e.id,
      description: `${e.category} — ${e.description}`,
      lines: [dr(expenseCodeByCategory[e.category] ?? '6900', e.amount), cr(cashCode(e.account), e.amount)],
    })
  }

  for (const r of replacements.filter((r) => r.delivered)) {
    const value = r.qty * (productById(r.productId)?.averageCost ?? 0)
    if (value > 0) {
      raw.push({
        date: r.date,
        kind: 'replacement',
        reference: r.id,
        description: `Replacement goods ${r.id}`,
        lines: [dr('5100', value), cr('1300', value)],
      })
    }
  }

  for (const m of stockMovements.filter((m) => m.type === 'adjustment' && m.qty < 0)) {
    const value = -m.qty * (productById(m.productId)?.averageCost ?? 0)
    raw.push({
      date: m.date,
      kind: 'adjustment',
      reference: m.reference,
      description: `Stock adjustment ${m.reference}`,
      lines: [dr('5200', value), cr('1300', value)],
    })
  }

  return raw
    .filter((e) => e.lines.every((l) => l.debit + l.credit > 0))
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1))
    .map((e, i) => ({ ...e, id: `JE-${String(i + 1).padStart(4, '0')}` }))
}

export const journalEntries: JournalEntry[] = build()

export const isBalanced = (e: JournalEntry) =>
  e.lines.reduce((s, l) => s + l.debit, 0) === e.lines.reduce((s, l) => s + l.credit, 0)

export function accountBalance(code: string, asOf: string = TODAY) {
  const account = accountByCode(code)
  if (!account) return 0
  const net = journalEntries
    .filter((e) => e.date <= asOf)
    .flatMap((e) => e.lines)
    .filter((l) => l.accountCode === code)
    .reduce((s, l) => s + l.debit - l.credit, 0)
  return account.type === 'asset' || account.type === 'expense' ? net : -net
}

export function balanceSheet(asOf: string = TODAY) {
  const sum = (type: AccountType) =>
    chartOfAccounts.filter((a) => a.type === type).map((a) => ({ account: a, balance: accountBalance(a.code, asOf) }))
  const assets = sum('asset')
  const liabilities = sum('liability')
  const equity = sum('equity')
  const revenue = sum('revenue').reduce((s, x) => s + x.balance, 0)
  const expense = sum('expense').reduce((s, x) => s + x.balance, 0)
  const currentEarnings = revenue - expense
  const totalAssets = assets.reduce((s, x) => s + x.balance, 0)
  const totalLiabilities = liabilities.reduce((s, x) => s + x.balance, 0)
  const totalEquity = equity.reduce((s, x) => s + x.balance, 0) + currentEarnings
  return { assets, liabilities, equity, currentEarnings, totalAssets, totalLiabilities, totalEquity }
}

export function cashFlow(range: [string, string]) {
  const cashCodes = new Set(chartOfAccounts.filter((a) => a.isCash).map((a) => a.code))
  const flow = (kind: EntryKind) =>
    journalEntries
      .filter((e) => e.kind === kind && inRange(e.date, range))
      .flatMap((e) => e.lines)
      .filter((l) => cashCodes.has(l.accountCode))
      .reduce((s, l) => s + l.debit - l.credit, 0)
  const customerPayments = flow('customer-payment')
  const supplierPayments = flow('supplier-payment')
  const expensesPaid = flow('expense') + flow('transport')
  return {
    customerPayments,
    supplierPayments,
    expensesPaid,
    net: customerPayments + supplierPayments + expensesPaid,
  }
}

export function inventoryValue() {
  return products.reduce((s, p) => s + Math.max(p.stock, 0) * p.averageCost, 0)
}
