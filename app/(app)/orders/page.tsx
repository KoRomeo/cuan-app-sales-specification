import type { Metadata } from 'next'
import { OrdersView } from '@/components/views/orders-view'

export const metadata: Metadata = { title: 'Orders' }

export default function OrdersPage() {
  return <OrdersView />
}
