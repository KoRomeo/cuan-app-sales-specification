
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

export type AccountType =
  | 'asset'
  | 'liability'
  | 'equity'
  | 'revenue'
  | 'expense'

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
  group?: 'cogs' | 'transport' | 'operating'
}

export interface JournalLine {
  accountCode: string
  account?: string
  debit: number
  credit: number
  description: string
}

export interface JournalEntry {
  id: string
  date: string
  source?: string
  memo?: string
  kind: EntryKind
  reference: string
  description: string
  lines: JournalLine[]
  /** Set on reversal entries: the id of the entry being reversed. */
  reverses?: string
}