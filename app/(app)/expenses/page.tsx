import type { Metadata } from 'next'
import { ExpensesView } from '@/components/views/finance-views'

export const metadata: Metadata = { title: 'Expenses' }

export default function Page() {
  return <ExpensesView />
}
