import type { Metadata } from 'next'
import { PayablesView } from '@/components/views/finance-views'

export const metadata: Metadata = { title: 'Payables' }

export default function PayablesPage() {
  return <PayablesView />
}
