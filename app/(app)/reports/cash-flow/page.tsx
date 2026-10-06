import type { Metadata } from 'next'
import { CashFlowView } from '@/components/views/reports-views'

export const metadata: Metadata = { title: 'Cash Flow' }

export default function Page() {
  return <CashFlowView />
}
