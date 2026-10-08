import type { Metadata } from 'next'
import { ReturnsView } from '@/components/views/sales-views'

export const metadata: Metadata = { title: 'Returns' }

export default function ReturnsPage() {
  return <ReturnsView />
}
