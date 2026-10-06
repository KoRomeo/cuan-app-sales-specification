import {
  type Expense,
  expenses,
  inRange,
  type Order,
  orders,
  orderCogs,
  orderTotal,
  type Payment,
  productById,
  products,
  type Purchase,
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
  | 'reversal'

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
  /** Set on reversal entries: the id of the entry being reversed. */
  reverses?: string
}

export type JournalDraft = Omit<JournalEntry, 'id'>

export const expenseCodeByCategory: Record<string, string> = {
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

export const cashAccountNames = Object.keys(cashCodeByName)

const openingBalances: Record<string, number> = { '1100': 5_000_000, '1110': 25_000_000, '1120': 10_000_000 }

export const accountByCode = (code: string) => chartOfAccounts.find((a) => a.code === code)

export const cashCode = (name: string) => cashCodeByName[name] ?? '1100'

const dr = (accountCode: string, amount: number, description = ''): JournalLine => ({ accountCode, debit: amount, credit: 0, description })
const cr = (accountCode: string, amount: number, description = ''): JournalLine => ({ accountCode, debit: 0, credit: amount, description })

/* ------------------------------------------------------------------ */
/* Journal builders — one per business document. Every builder returns */
/* balanced drafts; postJournal() enforces Debit = Credit on write.    */
/* ------------------------------------------------------------------ */

export function saleJournals(o: Order): JournalDraft[] {
  const total = orderTotal(o)
  const cogs = orderCogs(o)
  const out: JournalDraft[] = [
    { date: o.date, kind: 'sale', reference: o.id, description: `Sale ${o.id}`, lines: [dr('1200', total), cr('4100', total)] },
  ]
  if (cogs > 0) {
    out.push({ date: o.date, kind: 'cogs', reference: o.id, description: `Cost of goods sold ${o.id}`, lines: [dr('5100', cogs), cr('1300', cogs)] })
  }
  return out
}

export const customerPaymentJournal = (o: Order, p: Payment): JournalDraft => ({
  date: p.date,
  kind: 'customer-payment',
  reference: p.id,
  description: `Payment ${p.id} for ${o.id}`,
  lines: [dr(cashCode(p.account), p.amount), cr('1200', p.amount)],
})

export const transportJournal = (o: Order): JournalDraft | null =>
  o.delivery && o.delivery.transportCost > 0
    ? {
        date: o.delivery.date,
        kind: 'transport',
        reference: o.delivery.id,
        description: `Delivery transport ${o.delivery.id}`,
        lines: [dr('6100', o.delivery.transportCost), cr('1100', o.delivery.transportCost)],
      }
    : null

export const purchaseJournal = (p: Purchase): JournalDraft => {
  const total = purchaseTotal(p)
  return { date: p.date, kind: 'purchase', reference: p.id, description: `Purchase ${p.id}`, lines: [dr('1300', total), cr('2100', total)] }
}

export const supplierPaymentJournal = (p: Purchase, pay: Payment): JournalDraft => ({
  date: pay.date,
  kind: 'supplier-payment',
  reference: pay.id,
  description: `Payment ${pay.id} for ${p.id}`,
  lines: [dr('2100', pay.amount), cr(cashCode(pay.account), pay.amount)],
})

export const expenseJournal = (e: Expense): JournalDraft => ({
  date: e.date,
  kind: 'expense',
  reference: e.id,
  description: `${e.category} — ${e.description}`,
  lines: [dr(expenseCodeByCategory[e.category] ?? '6900', e.amount), cr(cashCode(e.account), e.amount)],
})

export function adjustmentJournal(date: string, reference: string, value: number, reason: string): JournalDraft {
  return value < 0
    ? { date, kind: 'adjustment', reference, description: `Stock adjustment ${reference} — ${reason}`, lines: [dr('5200', -value), cr('1300', -value)] }
    : { date, kind: 'adjustment', reference, description: `Stock adjustment ${reference} — ${reason}`, lines: [dr('1300', value), cr('5200', value)] }
}

export const isBalanced = (e: Pick<JournalEntry, 'lines'>) => {
  const debit = e.lines.reduce((s, l) => s + l.debit, 0)
  const credit = e.lines.reduce((s, l) => s + l.credit, 0)
  return debit > 0 && debit === credit
}

/* ------------------------------------------------------------------ */
/* Seed ledger — the opening state built from the seeded documents.    */
/* ------------------------------------------------------------------ */

function build(): JournalEntry[] {
  const raw: JournalDraft[] = []

  const cashOpening = Object.entries(openingBalances)
  raw.push({
    date: '2026-09-01',
    kind: 'opening',
    reference: 'OPENING',
    description: 'Opening balance — cash and bank',
    lines: [...cashOpening.map(([code, amount]) => dr(code, amount)), cr('3100', cashOpening.reduce((s, [, a]) => s + a, 0))],
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
    raw.push(...saleJournals(o))
    const transport = transportJournal(o)
    if (transport) raw.push(transport)
    for (const p of o.payments) raw.push(customerPaymentJournal(o, p))
  }

  for (const p of purchases) {
    raw.push(purchaseJournal(p))
    for (const pay of p.payments) raw.push(supplierPaymentJournal(p, pay))
  }

  for (const e of expenses) raw.push(expenseJournal(e))

  for (const r of replacements.filter((r) => r.delivered)) {
    const value = r.qty * (productById(r.productId)?.averageCost ?? 0)
    if (value > 0) {
      raw.push({ date: r.date, kind: 'replacement', reference: r.id, description: `Replacement goods ${r.id}`, lines: [dr('5100', value), cr('1300', value)] })
    }
  }

  for (const m of stockMovements.filter((m) => m.type === 'adjustment' && m.qty < 0)) {
    const value = -m.qty * (productById(m.productId)?.averageCost ?? 0)
    raw.push(adjustmentJournal(m.date, m.reference, -value, 'opening adjustment'))
  }

  return raw
    .filter((e) => e.lines.every((l) => l.debit + l.credit > 0))
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1))
    .map((e, i) => ({ ...e, id: `JE-${String(i + 1).padStart(4, '0')}` }))
}

/** The general journal. Append-only: entries are never edited or removed — corrections are reversals. */
export const journalEntries: JournalEntry[] = build()

export class UnbalancedJournalError extends Error {
  constructor(public entry: JournalDraft) {
    super(`Unbalanced journal: ${entry.description}`)
  }
}

/** Posts a journal entry. Throws (and so aborts the surrounding transaction) unless Debit = Credit. */
export function postJournal(draft: JournalDraft): JournalEntry {
  if (!isBalanced(draft) || draft.lines.some((l) => l.debit < 0 || l.credit < 0 || !Number.isInteger(l.debit + l.credit))) {
    throw new UnbalancedJournalError(draft)
  }
  const entry: JournalEntry = { ...draft, id: `JE-${String(journalEntries.length + 1).padStart(4, '0')}` }
  journalEntries.push(entry)
  return entry
}

/** Posts mirror-image entries for every unreversed entry of the given kinds on a reference. */
export function reverseJournals(reference: string, kinds: EntryKind[], date: string, reason: string) {
  const reversed = new Set(journalEntries.filter((e) => e.reverses).map((e) => e.reverses))
  const targets = journalEntries.filter((e) => e.reference === reference && kinds.includes(e.kind) && !reversed.has(e.id))
  return targets.map((e) =>
    postJournal({
      date,
      kind: 'reversal',
      reference,
      reverses: e.id,
      description: `Reversal of ${e.id} — ${reason}`,
      lines: e.lines.map((l) => ({ ...l, debit: l.credit, credit: l.debit })),
    }),
  )
}

/* ------------------------------------------------------------------ */
/* Read models — every report and balance is derived from the journal. */
/* ------------------------------------------------------------------ */

function linesInRange(range: [string, string]) {
  return journalEntries.filter((e) => inRange(e.date, range))
}

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
  const flow = (kinds: EntryKind[]) =>
    linesInRange(range)
      .filter((e) => kinds.includes(e.kind) || (e.kind === 'reversal' && kinds.includes(kindOf(e.reverses))))
      .flatMap((e) => e.lines)
      .filter((l) => cashCodes.has(l.accountCode))
      .reduce((s, l) => s + l.debit - l.credit, 0)
  const customerPayments = flow(['customer-payment'])
  const supplierPayments = flow(['supplier-payment'])
  const expensesPaid = flow(['expense', 'transport'])
  return { customerPayments, supplierPayments, expensesPaid, net: customerPayments + supplierPayments + expensesPaid }
}

function kindOf(id?: string): EntryKind {
  return journalEntries.find((e) => e.id === id)?.kind ?? 'opening'
}

const categoryByExpenseCode = Object.fromEntries(Object.entries(expenseCodeByCategory).map(([c, code]) => [code, c]))

/** Profit & Loss straight from the ledger (revenue, COGS, transport and expense accounts). */
export function profitAndLoss(range: [string, string]) {
  const entries = linesInRange(range)
  const net = (code: string, filter: (e: JournalEntry) => boolean = () => true) =>
    entries
      .filter(filter)
      .flatMap((e) => e.lines)
      .filter((l) => l.accountCode === code)
      .reduce((s, l) => s + l.debit - l.credit, 0)

  const isDeliveryTransport = (e: JournalEntry) => e.kind === 'transport' || (e.kind === 'reversal' && kindOf(e.reverses) === 'transport')
  const revenue = -net('4100')
  const cogs = net('5100')
  const transport = net('6100', isDeliveryTransport)

  const byCategory = new Map<string, number>()
  for (const [code, category] of Object.entries(categoryByExpenseCode)) {
    const v = net(code, (e) => !isDeliveryTransport(e))
    if (v !== 0) byCategory.set(category, v)
  }
  const adjustment = net('5200')
  if (adjustment !== 0) byCategory.set('Stock Adjustment', adjustment)

  const operating = [...byCategory.values()].reduce((s, v) => s + v, 0) + transport
  const grossProfit = revenue - cogs
  return {
    revenue,
    cogs,
    grossProfit,
    transport,
    expenseByCategory: [...byCategory.entries()].sort((a, b) => b[1] - a[1]),
    operating,
    netProfit: grossProfit - operating,
  }
}

export function inventoryValue() {
  return products.reduce((s, p) => s + Math.max(p.stock, 0) * p.averageCost, 0)
}
