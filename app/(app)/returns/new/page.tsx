import type { Metadata } from 'next'
import { NewReturnView } from '@/components/views/new-return-view'

export const metadata: Metadata = { title: 'Record Return' }

export default function NewReturnPage() {
  return <NewReturnView />
}
