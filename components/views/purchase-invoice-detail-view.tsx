'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { ArrowLeft, FileText } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { SectionCard } from '@/components/common/section-card'
import { Button } from '@/components/ui/button'
import { useApp } from '@/components/providers'
import { formatDate, formatIDR } from '@/lib/format'

type InvoiceLine = { productName: string; unit?: string | null; quantity: number; unitCost: number; discount?: number; lineTotal?: number }
type InvoiceData = { invoiceNumber?: string | null; date?: string | null; dueDate?: string | null; supplierName?: string | null; supplierCity?: string | null; total?: number | null; items?: InvoiceLine[] }
type PurchaseDocument = { id: string; fileName: string; fileSize: number; mimeType: string; status: string; createdAt: string; confidence: number | null; reviewIssues: string[]; errorMessage?: string | null; extractedData?: InvoiceData | null; purchaseId?: string | null }
const fetcher = async (url: string) => { const response = await fetch(url); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to load invoice'); return data }
export function PurchaseInvoiceDetailView({ documentId }: { documentId: string }) {
  const { locale, t } = useApp()
  const { data: business, error: businessError } = useSWR<{id:string}>('/api/businesses/current', fetcher)
  const { data: documents, error: documentsError } = useSWR<PurchaseDocument[]>(business?.id ? '/api/purchase-documents?businessId='+encodeURIComponent(business.id) : null, fetcher)
  const error = businessError || documentsError
  if (error) return <div role="alert" className="text-sm text-destructive">{error.message}</div>
  if (!business || !documents) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  const doc = documents.find(d => d.id === documentId)
  if (!doc) return <div className="space-y-3"><p className="text-sm text-muted-foreground">{locale === 'id' ? 'Dokumen faktur tidak ditemukan.' : 'Invoice document not found.'}</p><Button variant="outline" nativeButton={false} render={<Link href="/purchase-documents" />}>{locale === 'id' ? 'Kembali ke faktur pembelian' : 'Back to purchase invoices'}</Button></div>
  const invoice = doc.extractedData
  const label = (en: string, id: string) => locale === 'id' ? id : en
  const fileUrl = '/api/purchase-documents/'+encodeURIComponent(doc.id)+'/file?businessId='+encodeURIComponent(business.id)
  return <>
    <PageHeader breadcrumbs={[{label:t('nav.purchasing')},{label:label('Purchase Invoice','Faktur Pembelian'),href:'/purchase-documents'},{label:doc.fileName}]} title={label('Invoice details','Detail faktur')} description={doc.fileName} actions={<Button variant="outline" nativeButton={false} render={<Link href="/purchase-invoice" />}><ArrowLeft />{label('Back to invoices','Kembali ke faktur')}</Button>} />
    <div className="grid min-w-0 gap-5 xl:grid-cols-2">
      <SectionCard title={label('Stored invoice file','File faktur tersimpan')}>
        <p className="mb-3 text-xs text-muted-foreground">{new Date(doc.createdAt).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US')} · {(doc.fileSize/1048576).toFixed(2)} MB</p>
        <iframe title={doc.fileName} src={fileUrl} className="h-[70vh] min-h-[420px] w-full rounded-md border bg-muted" />
      </SectionCard>
      <div className="space-y-4">
        <SectionCard title={label('Extracted details','Detail hasil ekstraksi')}>
          {!invoice ? <p className="text-sm text-muted-foreground">{doc.errorMessage || label('No extracted invoice data is available.','Data hasil ekstraksi faktur belum tersedia.')}</p> : <div className="space-y-3 text-sm">
            <Detail label={label('Status','Status')} value={doc.status} />
            <Detail label={label('Accuracy','Akurasi')} value={doc.confidence == null ? '—' : doc.confidence+'%'} />
            <Detail label={label('Supplier','Supplier')} value={invoice.supplierName || '—'} />
            <Detail label={label('Invoice number','Nomor faktur')} value={invoice.invoiceNumber || '—'} />
            <Detail label={label('Invoice date','Tanggal faktur')} value={invoice.date ? formatDate(invoice.date) : '—'} />
            <Detail label={label('Due date','Jatuh tempo')} value={invoice.dueDate ? formatDate(invoice.dueDate) : '—'} />
            <Detail label={label('Total','Total')} value={invoice.total == null ? '—' : formatIDR(Number(invoice.total))} />
            <div className="border-t pt-3"><h3 className="mb-2 font-medium">{label('Items','Item')}</h3>
              {(invoice.items || []).length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2 pr-3">{label('Product','Produk')}</th><th className="py-2 pr-3 text-right">{label('Qty','Jumlah')}</th><th className="py-2 text-right">{label('Unit cost','Harga satuan')}</th></tr></thead><tbody>{invoice.items?.map((item,i)=><tr key={i} className="border-b last:border-0"><td className="py-2 pr-3">{item.productName}{item.unit ? ' ('+item.unit+')' : ''}</td><td className="py-2 pr-3 text-right tabular-nums">{item.quantity}</td><td className="py-2 text-right tabular-nums">{formatIDR(Number(item.unitCost))}</td></tr>)}</tbody></table></div> : <p className="text-muted-foreground">{label('No items detected.','Tidak ada item terdeteksi.')}</p>}
            </div>
            {doc.purchaseId && <Button nativeButton={false} render={<Link href={'/purchases/'+encodeURIComponent(doc.purchaseId)} />}><FileText />{label('Open recorded purchase','Buka pembelian tercatat')}</Button>}
          </div>}
        </SectionCard>
        {doc.reviewIssues?.length > 0 && <SectionCard title={label('Review notes','Catatan pemeriksaan')}><ul className="list-disc space-y-1 pl-5 text-sm">{doc.reviewIssues.map((issue,i)=><li key={i}>{issue}</li>)}</ul></SectionCard>}
      </div>
    </div>
  </>
}
function Detail({label,value}:{label:string;value:string}) { return <div className="flex flex-wrap justify-between gap-3 border-b pb-2 last:border-0"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div> }
