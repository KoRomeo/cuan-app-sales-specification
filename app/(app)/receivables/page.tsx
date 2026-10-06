import type { Metadata } from 'next'
import { ReceivablesView } from '@/components/views/finance-views'

export const metadata: Metadata = { title: 'Receivables' }

export default function ReceivablesPage() {
  return <ReceivablesView />
}
