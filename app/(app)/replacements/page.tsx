import type { Metadata } from 'next'
import { ReturnsView } from '@/components/views/sales-views'

export const metadata: Metadata = { title: 'Replacements' }

export default function Page() {
  return <ReturnsView />
}
