import type { Metadata } from 'next'
import { NewOrderView } from '@/components/views/new-order-view'

export const metadata: Metadata = { title: 'New Order' }

export default function Page() {
  return <NewOrderView />
}
