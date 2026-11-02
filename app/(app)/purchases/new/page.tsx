import type { Metadata } from 'next'
import { NewPurchaseView } from '@/components/views/new-purchase-view'

export const metadata: Metadata = { title: 'New Purchase' }

export default function NewPurchasePage() {
  return <NewPurchaseView />
}
