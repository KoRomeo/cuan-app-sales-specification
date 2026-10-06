import type { Metadata } from 'next'
import { LedgerView } from '@/components/views/reports-views'

export const metadata: Metadata = { title: 'General Ledger' }

export default function Page() {
  return <LedgerView />
}
