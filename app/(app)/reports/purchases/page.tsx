import type { Metadata } from 'next'
import { PurchaseReportView } from '@/components/views/reports-views'

export const metadata: Metadata = { title: 'Purchase Report' }

export default function Page() {
  return <PurchaseReportView />
}
