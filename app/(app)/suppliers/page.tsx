import type { Metadata } from 'next'
import { SuppliersView } from '@/components/views/purchasing-views'

export const metadata: Metadata = { title: 'Suppliers' }

export default function Page() {
  return <SuppliersView />
}
