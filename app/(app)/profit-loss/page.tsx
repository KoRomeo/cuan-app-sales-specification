import type { Metadata } from 'next'
import { ProfitLossView } from '@/components/views/finance-views'

export const metadata: Metadata = { title: 'Profit & Loss' }

export default function ProfitAndLossPage() {
  return <ProfitLossView />
}
