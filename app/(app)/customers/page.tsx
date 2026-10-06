import type { Metadata } from 'next'
import { CustomersView } from '@/components/views/sales-views'

export const metadata: Metadata = { title: 'Customers' }

export default function Page() {
  return <CustomersView />
}
