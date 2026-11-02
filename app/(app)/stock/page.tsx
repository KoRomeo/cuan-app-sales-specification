import type { Metadata } from 'next'
import { StockView } from '@/components/views/inventory-views'

export const metadata: Metadata = { title: 'Stock' }

export default function StockPage() {
  return <StockView />
}
