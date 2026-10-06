import type { Metadata } from 'next'
import { InvoicesView } from '@/components/views/sales-views'

export const metadata: Metadata = { title: 'Invoices' }

export default function Page() {
  return <InvoicesView />
}
