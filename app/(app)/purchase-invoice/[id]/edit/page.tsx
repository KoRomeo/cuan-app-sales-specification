import type { Metadata } from 'next'
import { PurchaseInvoiceEditView } from '@/components/views/purchase-invoice-edit-view'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return { title: id }
}

export default async function PurchaseInvoiceEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PurchaseInvoiceEditView documentId={id} />
}
