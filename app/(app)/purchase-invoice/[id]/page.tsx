import type { Metadata } from 'next'
import { PurchaseInvoiceView } from '@/components/views/purchase-invoice-view'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return { title: id }
}

export default async function PurchaseInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PurchaseInvoiceView documentId={id} />
}
