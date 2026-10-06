import type { Metadata } from 'next'
import { ReportsHubView } from '@/components/views/reports-views'

export const metadata: Metadata = { title: 'Reports' }

export default function Page() {
  return <ReportsHubView />
}
