'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { SectionCard } from '@/components/common/section-card'
import { Button } from '@/components/ui/button'
import { useApp } from '@/components/providers'
import { fetcher, type PurchaseDocument } from './purchase-invoice-shared'

export function PurchaseInvoiceEditView({ documentId }: { documentId: string }) {
  const { locale } = useApp()
  const label = (en: string, id: string) => locale === 'id' ? id : en
  const { data: business } = useSWR<{ id: string }>('/api/businesses/current', fetcher)
  const { data: documents } = useSWR<PurchaseDocument[]>(business?.id ? '/api/purchase-documents?businessId=' + encodeURIComponent(business.id) : null, fetcher)
  const doc = documents?.find(item => item.id === documentId)
  return (
    <div className="space-y-4">
      <PageHeader breadcrumbs={[{ label: label('Purchasing', 'Pembelian') }, { label: label('Purchase Invoice', 'Faktur Pembelian'), href: '/purchase-documents' }]} title={label('Invoice editing disabled', 'Edit faktur dinonaktifkan')} description={doc?.fileName || ''} actions={<Button variant="outline" nativeButton={false} render={<Link href="/purchase-documents" />}><ArrowLeft />{label('Back to invoices', 'Kembali ke faktur')}</Button>} />
      <SectionCard title={label('Confirmed invoices cannot be edited', 'Faktur yang sudah dikonfirmasi tidak dapat diedit')}>
        <p className="text-sm text-muted-foreground">{label('To protect recorded purchases, stock balances and accounting history, invoice editing is unavailable. The original invoice and its recorded purchase remain available for viewing.', 'Untuk melindungi catatan pembelian, saldo stok, dan riwayat akuntansi, pengeditan faktur tidak tersedia. Faktur asli dan pembelian tercatat tetap dapat dilihat.')}</p>
      </SectionCard>
    </div>
  )
}
