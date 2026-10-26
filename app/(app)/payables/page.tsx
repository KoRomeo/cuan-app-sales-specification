import type { Metadata } from 'next'
import { PayablesView } from '@/components/views/payables-view'

export const metadata: Metadata = { title: 'Payables' }

export default function PayablesPage() {
  return <PayablesView />
}
