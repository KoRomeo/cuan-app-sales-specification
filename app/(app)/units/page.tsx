import type { Metadata } from 'next'
import { UnitsView } from '@/components/views/unit-views'

export const metadata: Metadata = { title: 'Units' }

export default function UnitsPage() {
  return <UnitsView />
}
