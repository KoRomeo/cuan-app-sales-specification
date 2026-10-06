import type { Metadata } from 'next'
import { FinancialAccountsView } from '@/components/views/financial-accounts-view'

export const metadata: Metadata = { title: 'Financial Accounts' }

export default function Page() {
  return <FinancialAccountsView />
}
