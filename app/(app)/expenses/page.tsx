import type { Metadata } from 'next'
import { ExpensesView } from '@/components/views/finance-extra-views'

export const metadata: Metadata = { title: 'Expenses' }

export default function ExpensesPage() {
  return <ExpensesView />
}
