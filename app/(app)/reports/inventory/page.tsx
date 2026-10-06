import type { Metadata } from 'next'
import { InventoryReportView } from '@/components/views/reports-views'

export const metadata: Metadata = { title: 'Inventory Report' }

export default function Page() {
  return <InventoryReportView />
}
