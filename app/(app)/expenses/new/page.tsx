import type { Metadata } from 'next'
import { ExpenseNewView } from '@/components/views/finance-extra-views'

export const metadata: Metadata = { title: 'Record Expense' }

export default function NewExpensePage() {
  return <ExpenseNewView />
}
