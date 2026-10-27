'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { ArrowLeft, FileText } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { SectionCard } from '@/components/common/section-card'
import { Button } from '@/components/ui/button'
import { useApp } from '@/components/providers'
import { formatDate, formatIDR } from '@/lib/format'
import { Detail, InvoiceFilePreview, StatusBadge, fetcher, type PurchaseDocument } from './purchase-invoice-shared'

export function PurchaseInvoiceView({ documentId }: { documentId: string }) {
  const { locale, t } = useApp()
  const label = (en: string, id: string) => locale === 'id' ? id : en
  const { data: business, error: businessError } = useSWR<{ id: string }>('/api/businesses/current', fetcher)
  const { data: documents, error: documentsError } = useSWR<PurchaseDocument[]>(business?.id ? '/api/purchase-documents?businessId=' + encodeURIComponent(business.id) : null, fetcher)
  const error = businessError || documentsError
  if (error) return <div role="alert" className="text-sm text-destructive">{error.message}</div>
  if (!business || !documents) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  const doc = documents.find(d => d.id === documentId)
  if (!doc) return <div className="space-y-3"><p className="text-sm text-muted-foreground">{label('Invoice document not found.', 'Dokumen faktur tidak ditemukan.')}</p><Button variant="outline" nativeButton={false} render={<Link href="/purchase-documents" />}>{label('Back to purchase invoices', 'Kembali ke faktur pembelian')}</Button></div>
  const invoice = doc.extractedData

  return <>
    <PageHeader breadcrumbs={[{ label: t('nav.purchasing') }, { label: label('Purchase Invoice', 'Faktur Pembelian'), href: '/purchase-documents' }, { label: doc.fileName }]} title={label('Invoice details', 'Detail faktur')} description={doc.fileName} actions={<>{doc.purchaseId && doc.status === 'confirmed' && <Button nativeButton={false} render={<Link href={'/purchases/' + encodeURIComponent(doc.purchaseId)} />}><FileText />{label('Purchase detail', 'Detail pembelian')}</Button>}<Button variant="outline" nativeButton={false} render={<Link href="/purchase-documents" />}><ArrowLeft />{label('Back to invoices', 'Kembali ke faktur')}</Button></>} />
    <div className="grid min-w-0 gap-5 xl:grid-cols-2">
      <SectionCard title={label('Stored invoice file', 'File faktur tersimpan')}>
        <InvoiceFilePreview documentId={doc.id} businessId={business.id} fileName={doc.fileName} mimeType={doc.mimeType} label={label} />
      </SectionCard>
      <div className="space-y-4">
        <SectionCard title={label('Extracted details', 'Detail hasil ekstraksi')}>
          {!invoice ? <p className="text-sm text-muted-foreground">{doc.errorMessage || label('No extracted invoice data is available.', 'Data hasil ekstraksi faktur belum tersedia.')}</p> : <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3 border-b pb-2"><span className="text-muted-foreground">{label('Status', 'Status')}</span><StatusBadge status={doc.status} label={label} /></div>
            <Detail label={label('Accuracy', 'Akurasi')} value={doc.confidence == null ? '—' : doc.confidence + '%'} />
            <Detail label={label('Supplier', 'Supplier')} value={invoice.supplierName || '—'} />
            <Detail label={label('Invoice number', 'Nomor faktur')} value={invoice.invoiceNumber || '—'} />
            <Detail label={label('Invoice date', 'Tanggal faktur')} value={invoice.date ? formatDate(invoice.date) : '—'} />
            <Detail label={label('Due date', 'Jatuh tempo')} value={invoice.dueDate ? formatDate(invoice.dueDate) : '—'} />
            <Detail label={label('Total', 'Total')} value={invoice.total == null ? '—' : formatIDR(Number(invoice.total))} />
            <div className="border-t pt-3"><h3 className="mb-2 font-medium">{label('Items', 'Item')}</h3>
              {(invoice.items || []).length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2 pr-3">{label('Product', 'Produk')}</th><th className="py-2 pr-3">{label('Unit', 'Satuan')}</th><th className="py-2 pr-3 text-right">{label('Qty', 'Jumlah')}</th><th className="py-2 pr-3 text-right">{label('Unit cost', 'Harga satuan')}</th><th className="py-2 pr-3 text-right">{label('Discount', 'Diskon')}</th><th className="py-2 text-right">{label('Line total', 'Subtotal')}</th></tr></thead><tbody>{invoice.items?.map((item, i) => <tr key={i} className="border-b last:border-0">
                <td className="py-2 pr-3">{item.productName}</td>
                <td className="py-2 pr-3 text-muted-foreground">{item.unit || '—'}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{item.quantity}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatIDR(Number(item.unitCost))}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{item.discount ? formatIDR(Number(item.discount)) : '—'}</td>
                <td className="py-2 text-right font-medium tabular-nums">{item.lineTotal != null ? formatIDR(Number(item.lineTotal)) : formatIDR(Number(item.quantity) * Number(item.unitCost) - Number(item.discount || 0))}</td>
              </tr>)}</tbody></table></div> : <p className="text-muted-foreground">{label('No items detected.', 'Tidak ada item terdeteksi.')}</p>}
            </div>
            {doc.status === "purchase_cancelled" && <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-300">{label('The linked purchase was cancelled because it was unpaid and deleted. The invoice record is kept for history.', 'Pembelian terkait dibatalkan karena belum dibayar dan dihapus. Catatan faktur tetap disimpan untuk riwayat.')}</p>}
          </div>}
        </SectionCard>
        {doc.reviewIssues?.length > 0 && <SectionCard title={label('Review notes', 'Catatan pemeriksaan')}><ul className="list-disc space-y-1 pl-5 text-sm text-amber-700 dark:text-amber-400">{doc.reviewIssues.map((issue, i) => <li key={i}>{issue}</li>)}</ul></SectionCard>}
      </div>
    </div>
  </>
}
