import type { Metadata } from 'next'
import { ProductsView } from '@/components/views/inventory-views'

export const metadata: Metadata = { title: 'Products' }

export default function Page() {
  return <ProductsView />
}
