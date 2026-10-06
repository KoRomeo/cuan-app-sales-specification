import {
  expenses,
  inRange,
  orders,
  orderTotal,
  productById,
  purchases,
  purchaseTotal,
  replacements,
  stockMovements,
} from '@/lib/data'

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'

export interface LedgerAccount {
  code: string
  name: string
  type: AccountType
  group?: 'cogs' | 'transport' | 'operating'
}

export interface JournalLine {
  account: string
  debit: number
  credit: number
}

export interface JournalEntry {
  id: string
  date: string
  source: string
  memo: string
  reverses?: string
  lines: JournalLine[]
}

export const CASH = '1100'
export const BANK = '1200'
export const INVENTORY = '1300'
export const RECEIVABLES = '1400'
export const PAYABLES = '2100'
export const OWNER_EQUITY = '3100'
export const REVENUE = '4100'
export const COGS = '5100'
export const REPLACEMENT_COST = '5200'
export const ADJUSTMENT_COST = '5300'
export const TRANSPORT = '6100'

const staticAccounts: LedgerAccount[] = [
  { code: CASH, name: 'Cash', type: 'asset' },
  { code: BANK, name: 'Bank BCA', type: 'asset' },
  { code: INVENTORY, name: 'Inventory', type: 'asset' },
  { code: RECEIVABLES, name: 'Accounts Receivable', type: 'asset' },
  { code: PAYABLES, name: 'Accounts Payable', type: 'liability' },
  { code: OWNER_EQUITY, name: 'Owner Equity', type: 'equity' },
  { code: REVENUE, name: 'Sales Revenue', type: 'revenue' },
  { code: COGS, name: 'Cost of Goods Sold', type: 'expense', group: 'cogs' },
  { code: REPLACEMENT_COST, name: 'Replacement Cost', type: 'expense', group: 'cogs' },
  { code: ADJUSTMENT_COST, name: 'Inventory Adjustment', type: 'expense', group: 'cogs' },
  { code: TRANSPORT, name: 'Delivery Transport', type: 'expense', group: 'transport' },
]

const expenseAccountCode = (category: string) => {
  const index = [...new Set(expenses.map((e) => e.category))].sort().indexOf(category)
  return String(6200 + Math.max(index, 0) * 10)
}

export const chartOfAccounts: LedgerAccount[] = [
  ...staticAccounts,
  ...[...new Set(expenses.map((e) => e.category))].sort().map<LedgerAccount>((category) => ({
    code: expenseAccountCode(category),
    name: category,
    type: 'expense',
    group: 'operating',
  })),
]

const accountByCode = new Map(chartOfAccounts.map((a) => [a.code, a]))
export const accountOf = (code: string) => accountByCode.get(code)

const settlementAccount = (name: string) => (name === 'Cash' ? CASH : BANK)

const isBalanced = (lines: JournalLine[]) =>
  lines.reduce((s, l) => s + l.debit, 0) === lines.reduce((s, l) => s + l.credit, 0)

function debit(account: string, amount: number): JournalLine {
  return { account, debit: amount, credit: 0 }
}

function credit(account: string, amount: number): JournalLine {
  return { account, debit: 0, credit: amount }
}

function entry(id: string, date: string, source: string, memo: string, lines: JournalLine[]): JournalEntry | null {
  const nonZero = lines.filter((l) => l.debit !== 0 || l.credit !== 0)
  return nonZero.length === 0 ? null : { id, date, source, memo, lines: nonZero }
}

/**
 * Single source of journal generation. Each business document maps to exactly
 * one deterministic entry id, so a transaction can never be posted twice.
 * Journals are append-only: corrections are expressed as reversal entries.
 */
function buildJournals(): JournalEntry[] {
  const candidates: (JournalEntry | null)[] = []

  for (const o of orders) {
    if (o.status === 'cancelled') continue
    const total = orderTotal(o)
    const cost = o.items.reduce((s, it) => s + it.qty * it.unitCost, 0)
    candidates.push(
      entry(`JE-${o.id}-SALE`, o.date, o.id, 'Sales order', [
        debit(RECEIVABLES, total),
        credit(REVENUE, total),
        debit(COGS, cost),
        credit(INVENTORY, cost),
      ]),
    )
    for (const p of o.payments) {
      candidates.push(
        entry(`JE-${p.id}`, p.date, o.id, 'Customer payment', [debit(settlementAccount(p.account), p.amount), credit(RECEIVABLES, p.amount)]),
      )
    }
    if (o.delivery && o.delivery.transportCost > 0) {
      candidates.push(
        entry(`JE-${o.delivery.id}-TRANSPORT`, o.delivery.date, o.id, 'Delivery transport', [
          debit(TRANSPORT, o.delivery.transportCost),
          credit(CASH, o.delivery.transportCost),
        ]),
      )
    }
  }

  for (const p of purchases) {
    const total = purchaseTotal(p)
    candidates.push(entry(`JE-${p.id}-PURCHASE`, p.date, p.id, 'Purchase', [debit(INVENTORY, total), credit(PAYABLES, total)]))
    for (const pay of p.payments) {
      candidates.push(
        entry(`JE-${pay.id}`, pay.date, p.id, 'Supplier payment', [debit(PAYABLES, pay.amount), credit(settlementAccount(pay.account), pay.amount)]),
      )
    }
  }

  for (const e of expenses) {
    candidates.push(
      entry(`JE-${e.id}`, e.date, e.id, e.description, [debit(expenseAccountCode(e.category), e.amount), credit(settlementAccount(e.account), e.amount)]),
    )
  }

  for (const m of stockMovements) {
    const product = productById(m.productId)
    if (!product || m.qty === 0) continue
    const value = Math.abs(m.qty) * product.averageCost
    if (m.type === 'opening') {
      candidates.push(
        entry(`JE-${m.id}`, m.date, m.reference, `Opening stock · ${product.name}`, [
          m.qty > 0 ? debit(INVENTORY, value) : credit(INVENTORY, value),
          m.qty > 0 ? credit(OWNER_EQUITY, value) : debit(OWNER_EQUITY, value),
        ]),
      )
    }
    if (m.type === 'adjustment') {
      candidates.push(
        entry(`JE-${m.id}`, m.date, m.reference, `Stock adjustment · ${product.name}`, [
          m.qty > 0 ? debit(INVENTORY, value) : debit(ADJUSTMENT_COST, value),
          m.qty > 0 ? credit(ADJUSTMENT_COST, value) : credit(INVENTORY, value),
        ]),
      )
    }
  }

  for (const r of replacements.filter((r) => r.delivered)) {
    const product = productById(r.productId)
    if (!product) continue
    const value = r.qty * product.averageCost
    candidates.push(entry(`JE-${r.id}`, r.date, r.id, `Replacement · ${product.name}`, [debit(REPLACEMENT_COST, value), credit(INVENTORY, value)]))
  }

  const journals = candidates.filter((j): j is JournalEntry => j !== null)

  const seen = new Set<string>()
  for (const j of journals) {
    if (seen.has(j.id)) throw new Error(`Duplicate journal entry: ${j.id}`)
    seen.add(j.id)
    if (!isBalanced(j.lines)) throw new Error(`Unbalanced journal entry: ${j.id}`)
    for (const l of j.lines) {
      if (!accountByCode.has(l.account)) throw new Error(`Unknown account ${l.account} in ${j.id}`)
    }
  }
  return journals.sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date < b.date ? -1 : 1))
}

export function reverseEntry(original: JournalEntry, id: string, date: string): JournalEntry {
  return {
    id,
    date,
    source: original.source,
    memo: `Reversal of ${original.id}`,
    reverses: original.id,
    lines: original.lines.map((l) => ({ account: l.account, debit: l.credit, credit: l.debit })),
  }
}

export const journals: JournalEntry[] = buildJournals()

const naturalBalance = (type: AccountType, debitTotal: number, creditTotal: number) =>
  type === 'asset' || type === 'expense' ? debitTotal - creditTotal : creditTotal - debitTotal

function totalsByAccount(from: string, to: string) {
  const totals = new Map<string, { debit: number; credit: number }>()
  for (const j of journals) {
    if (!inRange(j.date, [from, to])) continue
    for (const l of j.lines) {
      const t = totals.get(l.account) ?? { debit: 0, credit: 0 }
      t.debit += l.debit
      t.credit += l.credit
      totals.set(l.account, t)
    }
  }
  return totals
}

export function accountBalance(code: string, range: [string, string] = ['0000-01-01', '9999-12-31']) {
  const account = accountByCode.get(code)
  const t = totalsByAccount(range[0], range[1]).get(code)
  if (!account || !t) return 0
  return naturalBalance(account.type, t.debit, t.credit)
}

export function profitAndLoss(range: [string, string]) {
  const totals = totalsByAccount(range[0], range[1])
  const sum = (predicate: (a: LedgerAccount) => boolean) =>
    chartOfAccounts
      .filter(predicate)
      .reduce((s, a) => {
        const t = totals.get(a.code)
        return t ? s + naturalBalance(a.type, t.debit, t.credit) : s
      }, 0)

  const revenue = sum((a) => a.type === 'revenue')
  const cogs = sum((a) => a.group === 'cogs')
  const transport = sum((a) => a.group === 'transport')
  const expenseByCategory = chartOfAccounts
    .filter((a) => a.group === 'operating')
    .map<[string, number]>((a) => {
      const t = totals.get(a.code)
      return [a.name, t ? t.debit - t.credit : 0]
    })
    .filter(([, v]) => v !== 0)
    .sort((a, b) => b[1] - a[1])
  const operating = transport + expenseByCategory.reduce((s, [, v]) => s + v, 0)
  const grossProfit = revenue - cogs
  return { revenue, cogs, grossProfit, transport, expenseByCategory, operating, netProfit: grossProfit - operating }
}

export function balanceSheet(asOf: string) {
  const totals = totalsByAccount('0000-01-01', asOf)
  const balanceOf = (code: string) => {
    const a = accountByCode.get(code)
    const t = totals.get(code)
    return a && t ? naturalBalance(a.type, t.debit, t.credit) : 0
  }
  const cash = balanceOf(CASH) + balanceOf(BANK)
  const inventory = balanceOf(INVENTORY)
  const receivables = balanceOf(RECEIVABLES)
  const payables = balanceOf(PAYABLES)
  const contributed = balanceOf(OWNER_EQUITY)
  const retained = profitAndLoss(['0000-01-01', asOf]).netProfit
  const assets = cash + inventory + receivables
  const liabilities = payables
  const equity = contributed + retained
  return { cash, inventory, receivables, payables, contributed, retained, assets, liabilities, equity, balanced: assets === liabilities + equity }
}

export function cashFlow(range: [string, string]) {
  let customerPayments = 0
  let supplierPayments = 0
  let expensePayments = 0
  for (const j of journals) {
    if (!inRange(j.date, range)) continue
    const cashDelta = j.lines.filter((l) => l.account === CASH || l.account === BANK).reduce((s, l) => s + l.debit - l.credit, 0)
    if (cashDelta === 0) continue
    if (j.lines.some((l) => l.account === RECEIVABLES)) customerPayments += cashDelta
    else if (j.lines.some((l) => l.account === PAYABLES)) supplierPayments += -cashDelta
    else expensePayments += -cashDelta
  }
  return { cashIn: customerPayments, cashOutSuppliers: supplierPayments, cashOutExpenses: expensePayments, net: customerPayments - supplierPayments - expensePayments }
}

export function generalLedger(code: string, range: [string, string]) {
  const account = accountByCode.get(code)
  if (!account) return []
  let running = 0
  const rows: { date: string; entryId: string; memo: string; debit: number; credit: number; balance: number }[] = []
  for (const j of journals) {
    if (j.date > range[1]) continue
    for (const l of j.lines.filter((l) => l.account === code)) {
      running += naturalBalance(account.type, l.debit, l.credit)
      if (j.date >= range[0]) rows.push({ date: j.date, entryId: j.id, memo: j.memo, debit: l.debit, credit: l.credit, balance: running })
    }
  }
  return rows
}

export const trialBalanceTotals = () => ({
  debit: journals.reduce((s, j) => s + j.lines.reduce((a, l) => a + l.debit, 0), 0),
  credit: journals.reduce((s, j) => s + j.lines.reduce((a, l) => a + l.credit, 0), 0),
})
