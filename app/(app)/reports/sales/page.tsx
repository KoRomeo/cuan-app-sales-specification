import type { Metadata } from 'next'
import { SalesReportView } from '@/components/views/reports-views'

export const metadata: Metadata = { title: 'Sales Report' }

export default function Page() {
  return <SalesReportView />
}
