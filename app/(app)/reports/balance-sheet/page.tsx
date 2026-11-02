import type { Metadata } from 'next'
import { BalanceSheetView } from '@/components/views/reports-views'

export const metadata: Metadata = { title: 'Balance Sheet' }

export default function Page() {
  return <BalanceSheetView />
}
