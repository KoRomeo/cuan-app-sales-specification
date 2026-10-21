import type { Metadata } from 'next'
import { ReturnDetailView } from '@/components/views/return-detail-view'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return { title: id }
}

export default async function ReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ReturnDetailView returnId={id} />
}
