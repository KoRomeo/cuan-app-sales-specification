import type { Metadata } from 'next'
import { StockMovementsView } from '@/components/views/inventory-views'

export const metadata: Metadata = { title: 'Stock Movements' }

export default function Page() {
  return <StockMovementsView />
}
