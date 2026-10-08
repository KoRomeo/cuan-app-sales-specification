import type { Metadata } from 'next'
import { DeliveriesView } from '@/components/views/sales-views'

export const metadata: Metadata = { title: 'Deliveries' }

export default function DeliveriesPage() {
  return <DeliveriesView />
}
