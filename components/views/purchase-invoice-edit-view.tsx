'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { useState } from 'react'
import { ArrowLeft, Save } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { SectionCard } from '@/components/common/section-card'
import { Button } from '@/components/ui/button'
import { useApp } from '@/components/providers'
import { Detail, InvoiceFilePreview, StatusBadge, fetcher, type InvoiceData, type PurchaseDocument } from './purchase-invoice-shared'

export function PurchaseInvoiceEditView({ documentId }: { documentId: string }) {
  const { locale, t } = useApp()
  const label = (en: string, id: string) => locale === 'id' ? id : en
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [draft, setDraft] = useState<InvoiceData | null>(null)
  const { data: business, error: businessError } = useSWR<{ id: string }>('/api/businesses/current', fetcher)
  const { data: documents, error: documentsError, mutate: mutateDocuments } = useSWR<PurchaseDocument[]>(business?.id ? '/api/purchase-documents?businessId=' + encodeURIComponent(business.id) : null, fetcher)
  const error = businessError || documentsError
  if (error) return <div role="alert" className="text-sm text-destructive">{error.message}</div>
  if (!business || !documents) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  const doc = documents.find(d => d.id === documentId)
  if (!doc) return <div className="space-y-3"><p className="text-sm text-muted-foreground">{label('Invoice document not found.', 'Dokumen faktur tidak ditemukan.')}</p><Button variant="outline" nativeButton={false} render={<Link href="/purchase-documents" />}>{label('Back to purchase invoices', 'Kembali ke faktur pembelian')}</Button></div>
  if (doc.status !== 'confirmed') {
    return <div className="space-y-4">
      <PageHeader breadcrumbs={[{ label: t('nav.purchasing') }, { label: label('Purchase Invoice', 'Faktur Pembelian'), href: '/purchase-documents' }, { label: doc.fileName }]} title={label('Edit invoice', 'Edit faktur')} description={doc.fileName} actions={<Button variant="outline" nativeButton={false} render={<Link href="/purchase-documents" />}><ArrowLeft />{label('Back to invoices', 'Kembali ke faktur')}</Button>} />
      <SectionCard title={label('Editing unavailable', 'Edit tidak tersedia')}>
        <p className="text-sm text-muted-foreground">{label('This invoice has not been confirmed yet. Use the inspect page to extract and review it first.', 'Faktur ini belum dikonfirmasi. Gunakan halaman periksa untuk mengekstrak dan meninjaunya terlebih dahulu.')}</p>
        {doc.status !== 'purchase_cancelled' && <div className="mt-3"><Button nativeButton={false} render={<Link href={'/purchase-invoice/' + encodeURIComponent(doc.id) + '/review'} />}>{label('Open inspect page', 'Buka halaman periksa')}</Button></div>}
      </SectionCard>
    </div>
  }
  const extracted = doc.extractedData
  const current: InvoiceData | null = draft || extracted || null
  const update = (patch: Partial<InvoiceData>) => setDraft(old => ({ ...(old || extracted!), ...patch }))

  async function saveChanges() {
    if (!business?.id || !current) return
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/purchase-documents/' + encodeURIComponent(doc!.id) + '/review', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId: business.id, extractedData: current }) })
      const data = await response.json()
      if (!response.ok) throw new Error((data.issues || [data.error]).join('; '))
      setDraft(null)
      await mutateDocuments()
      setMessage(label('Invoice details saved.', 'Detail faktur berhasil disimpan.'))
    } catch (e) { setMessage(e instanceof Error ? e.message : label('Unable to save changes', 'Tidak dapat menyimpan perubahan')) } finally { setBusy(false) }
  }

  return <>
    <PageHeader breadcrumbs={[{ label: t('nav.purchasing') }, { label: label('Purchase Invoice', 'Faktur Pembelian'), href: '/purchase-documents' }, { label: doc.fileName }]} title={label('Edit invoice', 'Edit faktur')} description={doc.fileName} actions={<><Button variant="outline" nativeButton={false} render={<Link href={'/purchase-invoice/' + encodeURIComponent(doc.id)} />}>{label('View details', 'Lihat detail')}</Button><Button variant="outline" nativeButton={false} render={<Link href="/purchase-documents" />}><ArrowLeft />{label('Back to invoices', 'Kembali ke faktur')}</Button></>} />
    <div className="grid min-w-0 gap-5 xl:grid-cols-2">
      <SectionCard title={label('Stored invoice file', 'File faktur tersimpan')}>
        <InvoiceFilePreview documentId={doc.id} businessId={business.id} fileName={doc.fileName} mimeType={doc.mimeType} label={label} />
      </SectionCard>
      <div className="space-y-4">
        <SectionCard title={label('Edit extracted details', 'Edit detail hasil ekstraksi')} action={<StatusBadge status={doc.status} label={label} />}>
          {!current ? <p className="text-sm text-muted-foreground">{label('No extracted invoice data is available.', 'Data hasil ekstraksi faktur belum tersedia.')}</p> : <div className="space-y-4 text-sm">
            {message && <p role="status" className="rounded-md border bg-muted/30 p-3">{message}</p>}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="space-y-1">{label('Invoice number', 'Nomor faktur')}<input className="w-full rounded-md border bg-background px-3 py-2" value={current.invoiceNumber || ''} onChange={e => update({ invoiceNumber: e.target.value })} /></label>
              <label className="space-y-1">{label('Invoice date', 'Tanggal faktur')}<input type="date" className="w-full rounded-md border bg-background px-3 py-2" value={current.date || ''} onChange={e => update({ date: e.target.value })} /></label>
              <label className="space-y-1">{label('Due date', 'Jatuh tempo')}<input type="date" className="w-full rounded-md border bg-background px-3 py-2" value={current.dueDate || ''} onChange={e => update({ dueDate: e.target.value })} /></label>
              <label className="space-y-1">{label('Invoice total', 'Total faktur')}<input type="number" min="0" className="w-full rounded-md border bg-background px-3 py-2" value={current.total ?? ''} onChange={e => update({ total: e.target.value === '' ? null : Number(e.target.value) })} /></label>
            </div>
            <div className="rounded-lg border p-3 space-y-2"><h3 className="font-medium">{label('Supplier', 'Supplier')}</h3>
              <label className="block space-y-1">{label('Supplier name', 'Nama supplier')}<input className="w-full rounded-md border bg-background px-3 py-2" value={current.supplierName || ''} onChange={e => update({ supplierName: e.target.value })} /></label>
              <label className="block space-y-1">{label('Supplier city', 'Kota supplier')}<input className="w-full rounded-md border bg-background px-3 py-2" value={current.supplierCity || ''} onChange={e => update({ supplierCity: e.target.value })} /></label>
            </div>
            <div className="space-y-4"><h3 className="font-medium">{label('Invoice items', 'Item faktur')}</h3>{current.items.map((line, i) => (<div key={i} className="rounded-lg border p-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="space-y-1">{label('Product name', 'Nama produk')}<input className="w-full rounded-md border bg-background px-3 py-2" value={line.productName || ''} onChange={e => update({ items: current.items.map((x, j) => j === i ? { ...x, productName: e.target.value } : x) })} /></label>
              <label className="space-y-1">{label('Unit', 'Satuan')}<input className="w-full rounded-md border bg-background px-3 py-2" value={line.unit || ''} onChange={e => update({ items: current.items.map((x, j) => j === i ? { ...x, unit: e.target.value } : x) })} placeholder="pcs / box / kg" /></label>
              <label className="space-y-1">Qty<input type="number" min="1" className="w-full rounded-md border bg-background px-3 py-2" value={line.quantity ?? ''} onChange={e => update({ items: current.items.map((x, j) => j === i ? { ...x, quantity: Number(e.target.value) } : x) })} /></label>
              <label className="space-y-1">{label('Unit cost', 'Harga satuan')}<input type="number" min="0" className="w-full rounded-md border bg-background px-3 py-2" value={line.unitCost ?? ''} onChange={e => update({ items: current.items.map((x, j) => j === i ? { ...x, unitCost: Number(e.target.value) } : x) })} /></label>
            </div></div>))})</div>
            <div className="space-y-2"><button type="button" disabled={busy} onClick={() => void saveChanges()} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"><Save className="size-4" />{busy ? label('Saving…', 'Menyimpan…') : label('Save changes', 'Simpan perubahan')}</button>
              <p className="text-xs text-muted-foreground">{label('These changes update the invoice record only. The recorded purchase, stock and accounting entries stay untouched.', 'Perubahan ini hanya memperbarui catatan faktur. Pembelian tercatat, stok, dan catatan akuntansi tidak diubah.')}</p></div>
            <div className="space-y-1 border-t pt-3">
              <Detail label={label('Recorded purchase', 'Pembelian tercatat')} value={doc.purchaseId ?? '—'} />
              <Detail label={label('Accuracy', 'Akurasi')} value={doc.confidence == null ? '—' : doc.confidence + '%'} />
            </div>
            {doc.purchaseId && <Button variant="outline" nativeButton={false} render={<Link href={'/purchases/' + encodeURIComponent(doc.purchaseId)} />}>{label('Open recorded purchase', 'Buka pembelian tercatat')}</Button>}
          </div>}
        </SectionCard>
      </div>
    </div>
  </>
}
