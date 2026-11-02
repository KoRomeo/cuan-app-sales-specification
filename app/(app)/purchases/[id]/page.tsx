import type { Metadata } from 'next'
import { PurchaseDetailView } from '@/components/views/purchase-detail-view'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return { title: id }
}

export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PurchaseDetailView purchaseId={id} />
}
