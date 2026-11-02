import type { Metadata } from 'next'
import { PurchaseInvoiceReviewView } from '@/components/views/purchase-invoice-review-view'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return { title: id }
}

export default async function PurchaseInvoiceReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PurchaseInvoiceReviewView documentId={id} />
}
