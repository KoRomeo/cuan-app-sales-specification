import type { Metadata } from 'next'
import { PurchasesView } from '@/components/views/purchasing-views'

export const metadata: Metadata = { title: 'Purchases' }

export default function PurchasesPage() {
  return <PurchasesView />
}
