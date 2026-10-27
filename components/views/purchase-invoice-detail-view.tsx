'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { useState } from 'react'
import { ArrowLeft, CheckCircle2, FileText, Pencil, RefreshCw, Save, Trash2, X } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { SectionCard } from '@/components/common/section-card'
import { SearchableSelect } from '@/components/common/searchable-select'
import { Button } from '@/components/ui/button'
import { useApp } from '@/components/providers'
import { formatDate, formatIDR } from '@/lib/format'

type Line = { productName: string; unit?: string | null; quantity: number; unitCost: number; discount?: number; lineTotal?: number; productId?: string }
type InvoiceData = { invoiceNumber?: string | null; date?: string | null; dueDate?: string | null; supplierName?: string | null; supplierCity?: string | null; total?: number | null; items: Line[] }
type PurchaseDocument = { id: string; fileName: string; fileSize: number; mimeType: string; status: string; createdAt: string; confidence: number | null; reviewIssues: string[]; errorMessage?: string | null; extractedData?: InvoiceData | null; purchaseId?: string | null }
type Product = { id: string; name: string; sellingPrice: string; costReference: string; averageCost: string }
type Supplier = { id: string; name: string; contact?: string | null }
type FinancialAccount = { id: string; name: string; type: 'cash' | 'bank'; active: boolean }
const fetcher = async (url: string) => { const response = await fetch(url); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to load invoice'); return data }
const normalize = (s: string) => s.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim()
function similarity(a: string, b: string) { const x = normalize(a), y = normalize(b); if (!x || !y) return 0; if (x === y) return 1; if (x.includes(y) || y.includes(x)) return Math.min(x.length, y.length) / Math.max(x.length, y.length) + 0.25; const A = new Set(x.split(" ")), B = new Set(y.split(" ")); return 2 * [...A].filter(v => B.has(v)).length / (A.size + B.size) }
const statusBadge = (status: string) =>
  status === "confirmed" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300"
  : status === "purchase_cancelled" ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-300"
  : status === "failed" ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-300"
  : status === "review" ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300"
  : status === "processing" || status === "confirming" ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-950/40 dark:text-blue-300"
  : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/40 dark:bg-slate-900/60 dark:text-slate-300"

export function PurchaseInvoiceDetailView({ documentId }: { documentId: string }) {
  const { locale, t } = useApp()
  const label = (en: string, id: string) => locale === 'id' ? id : en
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [reviewMsg, setReviewMsg] = useState('')
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [supplierChoice, setSupplierChoice] = useState('')
  const [createSupplier, setCreateSupplier] = useState(false)
  const [productChoice, setProductChoice] = useState<Record<number, string>>({})
  const [createProducts, setCreateProducts] = useState<number[]>([])
  const [productMatchMode, setProductMatchMode] = useState<Record<number, 'existing' | 'new'>>({})
  const [productMatchConfirmed, setProductMatchConfirmed] = useState<Record<number, boolean>>({})
  const [paidAmount, setPaidAmount] = useState('0')
  const [paymentAccount, setPaymentAccount] = useState('')
  const { data: business, error: businessError } = useSWR<{ id: string }>('/api/businesses/current', fetcher)
  const { data: documents, error: documentsError, mutate: mutateDocuments } = useSWR<PurchaseDocument[]>(business?.id ? '/api/purchase-documents?businessId=' + encodeURIComponent(business.id) : null, fetcher)
  const { data: products = [] } = useSWR<Product[]>(business?.id ? '/api/products?businessId=' + encodeURIComponent(business.id) : null, fetcher)
  const { data: suppliers = [] } = useSWR<Supplier[]>(business?.id ? '/api/suppliers?businessId=' + encodeURIComponent(business.id) : null, fetcher)
  const { data: financialAccounts = [] } = useSWR<FinancialAccount[]>(business?.id ? '/api/financial-accounts?businessId=' + encodeURIComponent(business.id) : null, fetcher)
  const error = businessError || documentsError
  if (error) return <div role="alert" className="text-sm text-destructive">{error.message}</div>
  if (!business || !documents) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  const doc = documents.find(d => d.id === documentId)
  if (!doc) return <div className="space-y-3"><p className="text-sm text-muted-foreground">{locale === 'id' ? 'Dokumen faktur tidak ditemukan.' : 'Invoice document not found.'}</p><Button variant="outline" nativeButton={false} render={<Link href="/purchase-documents" />}>{locale === 'id' ? 'Kembali ke faktur pembelian' : 'Back to purchase invoices'}</Button></div>
  const extracted = doc.extractedData
  const current: InvoiceData | null = invoice || extracted || null
  const update = (patch: Partial<InvoiceData>) => setInvoice(old => ({ ...(old || extracted!), ...patch }))
  const fileUrl = '/api/purchase-documents/' + encodeURIComponent(doc.id) + '/file?businessId=' + encodeURIComponent(business.id)
  const statusText = (s: string) => s === "purchase_cancelled" ? label('Purchase cancelled', 'Pembelian dibatalkan') : s === "confirmed" ? label('Confirmed', 'Dikonfirmasi') : s === "review" ? label('Needs review', 'Perlu ditinjau') : s === "failed" ? label('Failed', 'Gagal') : s === "queued" ? label('Queued', 'Antrean') : s === "processing" ? label('Processing', 'Memproses') : s === "confirming" ? label('Confirming', 'Mengonfirmasi') : s

  async function extractWithAI() {
    if (!business?.id) return
    setBusy(true); setReviewMsg('')
    try {
      const response = await fetch('/api/purchase-documents/' + encodeURIComponent(doc!.id) + '/process?businessId=' + encodeURIComponent(business.id), { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || label('Extraction failed', 'Ekstraksi gagal'))
      await mutateDocuments()
      setReviewMsg(label('Extraction finished. Review the extracted fields below.', 'Ekstraksi selesai. Tinjau hasil ekstraksi di bawah.'))
    } catch (e) { setReviewMsg(e instanceof Error ? e.message : label('Extraction failed', 'Ekstraksi gagal')); await mutateDocuments() } finally { setBusy(false) }
  }

  async function saveReview() {
    if (!business?.id || !current) return
    setBusy(true)
    try {
      const response = await fetch('/api/purchase-documents/' + encodeURIComponent(doc!.id) + '/review', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId: business.id, extractedData: current }) })
      const data = await response.json()
      if (!response.ok) throw new Error((data.issues || [data.error]).join('; '))
      setInvoice(null)
      await mutateDocuments()
      setReviewMsg(label('Review saved', 'Peninjauan disimpan'))
    } catch (e) { setReviewMsg(e instanceof Error ? e.message : label('Save failed', 'Gagal menyimpan')) } finally { setBusy(false) }
  }

  async function deleteDocument() {
    if (!business?.id) return
    setBusy(true)
    try {
      const response = await fetch('/api/purchase-documents/' + encodeURIComponent(doc!.id) + '?businessId=' + encodeURIComponent(business.id), { method: 'DELETE' })
      if (!response.ok) throw new Error(label('Unable to delete document', 'Tidak dapat menghapus dokumen'))
      window.location.href = '/purchase-documents'
    } catch (e) { setReviewMsg(e instanceof Error ? e.message : label('Unable to delete document', 'Tidak dapat menghapus dokumen')); setBusy(false) }
  }

  async function confirmPurchase() {
    if (!business?.id || !current) return
    const newSupplier = createSupplier
    const supplierId = supplierChoice
    if (!current.supplierName?.trim()) { setReviewMsg(label('Supplier name is required.', 'Nama supplier wajib diisi.')); return }
    if (!newSupplier && !supplierId) { setReviewMsg(label('Select a supplier first', 'Pilih supplier terlebih dahulu')); return }
    const choices = productChoice
    const newIndexes = createProducts
    const unresolved = current.items.map((_, i) => i).filter(i => !newIndexes.includes(i) && !choices[i])
    if (unresolved.length) { setReviewMsg(label('Match each item with an existing product or choose Add as new product.', 'Cocokkan setiap item dengan produk yang ada atau pilih Tambahkan sebagai produk baru.')); return }
    const paid = Math.max(0, Number(paidAmount || 0))
    const account = paymentAccount || financialAccounts.find(a => a.active && a.name.toLowerCase() === 'cash')?.name || financialAccounts.find(a => a.active)?.name || ''
    if (paid > Number(current.total ?? current.items.reduce((sum, line) => sum + Number(line.quantity) * Number(line.unitCost), 0))) { setReviewMsg(label('Payment cannot exceed the invoice total.', 'Pembayaran tidak boleh melebihi total faktur.')); return }
    if (paid > 0 && !account) { setReviewMsg(label('Choose an active cash or bank account for this payment.', 'Pilih akun kas atau bank yang aktif untuk pembayaran ini.')); return }
    setBusy(true); setReviewMsg('')
    try {
      const save = await fetch('/api/purchase-documents/' + encodeURIComponent(doc!.id) + '/review', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId: business.id, extractedData: current }) })
      const saved = await save.json()
      if (!save.ok) throw new Error(saved.error || label('Review save failed', 'Gagal menyimpan peninjauan'))
      const response = await fetch('/api/purchase-documents/' + encodeURIComponent(doc!.id) + '/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId: business.id, supplierId: newSupplier ? undefined : supplierId, createSupplier: newSupplier, itemProductIds: choices, createProductIndexes: newIndexes, date: current.date, dueDate: current.dueDate, paidAmount: paid, paymentAccount: account, paymentId: paid > 0 ? 'PAY-AI-' + crypto.randomUUID() : undefined, paymentDate: current.date, notes: 'AI invoice ' + (current.invoiceNumber || doc!.fileName) }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || label('Confirmation failed', 'Konfirmasi gagal'))
      setInvoice(null)
      await mutateDocuments()
      setReviewMsg(label('Purchase recorded: ', 'Pembelian tercatat: ') + data.purchaseId)
    } catch (e) { setReviewMsg(e instanceof Error ? e.message : label('Confirmation failed', 'Konfirmasi gagal')); await mutateDocuments() } finally { setBusy(false) }
  }

  const newSupplier = createSupplier
  const supplierReady = !!current?.supplierName?.trim() && (newSupplier || !!supplierChoice)
  const productsReady = current ? current.items.every((_, index) => createProducts.includes(index) || !!productChoice[index]) : false
  const canConfirm = supplierReady && productsReady

  return <>
    <PageHeader breadcrumbs={[{ label: t('nav.purchasing') }, { label: label('Purchase Invoice', 'Faktur Pembelian'), href: '/purchase-documents' }, { label: doc.fileName }]} title={label('Invoice details', 'Detail faktur')} description={doc.fileName} actions={<Button variant="outline" nativeButton={false} render={<Link href="/purchase-documents" />}><ArrowLeft />{label('Back to invoices', 'Kembali ke faktur')}</Button>} />
    <div className="grid min-w-0 gap-5 xl:grid-cols-2">
      <SectionCard title={label('Stored invoice file', 'File faktur tersimpan')}>
        <p className="mb-3 text-xs text-muted-foreground">{new Date(doc.createdAt).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US')} · {(doc.fileSize / 1048576).toFixed(2)} MB</p>
        <iframe title={doc.fileName} src={fileUrl} className="h-[70vh] min-h-[420px] w-full rounded-md border bg-muted" />
      </SectionCard>
      <div className="space-y-4">
        <SectionCard title={label('Extracted details', 'Detail hasil ekstraksi')} action={(doc.status === 'confirmed' || doc.status === 'review') && extracted ? <Button variant="outline" size="sm" onClick={() => { setInvoiceNumber(extracted.invoiceNumber || ''); setInvoiceDate(extracted.date || ''); setDueDate(extracted.dueDate || ''); setMessage(''); setEditing(v => !v) }}>{editing ? <X /> : <Pencil />}{editing ? label('Cancel edit', 'Batal mengedit') : label('Edit details', 'Edit detail')}</Button> : undefined}>
          {(message || reviewMsg) && <p role="status" className="mb-3 text-sm">{message || reviewMsg}</p>}
          {doc.status === 'queued' || doc.status === 'failed' ? <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 border-b pb-2"><span className="text-muted-foreground">{label('Status', 'Status')}</span><span className={'inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ' + statusBadge(doc.status)}>{statusText(doc.status)}</span></div>
            <p className="text-sm text-muted-foreground">{doc.status === 'queued' ? label('This document is waiting for AI extraction. Start it now or process the queue from the invoice list.', 'Dokumen ini menunggu ekstraksi AI. Mulai sekarang atau proses antrean dari daftar faktur.') : label('The previous extraction attempt failed. Try again below.', 'Percobaan ekstraksi sebelumnya gagal. Coba lagi di bawah.')}</p>
            {doc.errorMessage && <p className="text-sm text-destructive">{doc.errorMessage}</p>}
            <Button disabled={busy} onClick={() => void extractWithAI()}><RefreshCw className={busy ? 'animate-spin' : ''} />{busy ? label('Extracting…', 'Mengekstrak…') : label('Extract with AI', 'Ekstrak dengan AI')}</Button>
          </div> : null}
          {editing && extracted && (doc.status === 'confirmed' || doc.status === 'review') && <form className="mb-4 space-y-3 rounded-lg border bg-muted/20 p-3" onSubmit={async event => {
            event.preventDefault()
            setSaving(true)
            setMessage('')
            try {
              const response = await fetch('/api/purchase-documents/' + encodeURIComponent(doc.id) + '/review', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ businessId: business.id, extractedData: { ...extracted, invoiceNumber, date: invoiceDate, dueDate: dueDate || null } }),
              })
              const result = await response.json()
              if (!response.ok) throw new Error(result.error || label('Unable to save changes', 'Tidak dapat menyimpan perubahan'))
              setInvoice(null)
              await mutateDocuments()
              setMessage(label('Invoice details saved.', 'Detail faktur berhasil disimpan.'))
              setEditing(false)
            } catch (error) {
              setMessage(error instanceof Error ? error.message : label('Unable to save changes', 'Tidak dapat menyimpan perubahan'))
            } finally {
              setSaving(false)
            }
          }}>
            <label className="block space-y-1 text-sm"><span>{label('Invoice number', 'Nomor faktur')}</span><input value={invoiceNumber} onChange={event => setInvoiceNumber(event.target.value)} className="w-full rounded-md border bg-background px-3 py-2" /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm"><span>{label('Invoice date', 'Tanggal faktur')}</span><input required type="date" value={invoiceDate} onChange={event => setInvoiceDate(event.target.value)} className="w-full rounded-md border bg-background px-3 py-2" /></label>
              <label className="block space-y-1 text-sm"><span>{label('Due date', 'Jatuh tempo')}</span><input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} className="w-full rounded-md border bg-background px-3 py-2" /></label>
            </div>
            <div className="flex justify-end"><Button type="submit" disabled={saving}>{saving ? label('Saving…', 'Menyimpan…') : <><Save />{label('Save changes', 'Simpan perubahan')}</>}</Button></div>
          </form>}
          {!extracted && (doc.status === 'processing' || doc.status === 'confirming') ? <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 border-b pb-2"><span className="text-muted-foreground">{label('Status', 'Status')}</span><span className={'inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ' + statusBadge(doc.status)}>{statusText(doc.status)}</span></div>
            <p className="text-sm text-muted-foreground">{label('AI extraction is in progress. Reload in a moment.', 'Ekstraksi AI sedang berjalan. Muat ulang sebentar lagi.')}</p>
          </div> : null}
          {!extracted && doc.status !== 'queued' && doc.status !== 'failed' && doc.status !== 'processing' && doc.status !== 'confirming' ? <p className="text-sm text-muted-foreground">{doc.errorMessage || label('No extracted invoice data is available.', 'Data hasil ekstraksi faktur belum tersedia.')}</p> : null}
          {extracted && doc.status !== 'queued' && doc.status !== 'failed' && <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3 border-b pb-2"><span className="text-muted-foreground">{label('Status', 'Status')}</span><span className={'inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ' + statusBadge(doc.status)}>{statusText(doc.status)}</span></div>
            <Detail label={label('Accuracy', 'Akurasi')} value={doc.confidence == null ? '—' : doc.confidence + '%'} />
            <Detail label={label('Supplier', 'Supplier')} value={extracted.supplierName || '—'} />
            <Detail label={label('Invoice number', 'Nomor faktur')} value={extracted.invoiceNumber || '—'} />
            <Detail label={label('Invoice date', 'Tanggal faktur')} value={extracted.date ? formatDate(extracted.date) : '—'} />
            <Detail label={label('Due date', 'Jatuh tempo')} value={extracted.dueDate ? formatDate(extracted.dueDate) : '—'} />
            <Detail label={label('Total', 'Total')} value={extracted.total == null ? '—' : formatIDR(Number(extracted.total))} />
            <div className="border-t pt-3"><h3 className="mb-2 font-medium">{label('Items', 'Item')}</h3>
              {(extracted.items || []).length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2 pr-3">{label('Product', 'Produk')}</th><th className="py-2 pr-3 text-right">{label('Qty', 'Jumlah')}</th><th className="py-2 text-right">{label('Unit cost', 'Harga satuan')}</th></tr></thead><tbody>{extracted.items?.map((item, i) => <tr key={i} className="border-b last:border-0"><td className="py-2 pr-3">{item.productName}{item.unit ? ' (' + item.unit + ')' : ''}</td><td className="py-2 pr-3 text-right tabular-nums">{item.quantity}</td><td className="py-2 text-right tabular-nums">{formatIDR(Number(item.unitCost))}</td></tr>)}</tbody></table></div> : <p className="text-muted-foreground">{label('No items detected.', 'Tidak ada item terdeteksi.')}</p>}
            </div>
            {doc.purchaseId && doc.status === "confirmed" && <Button nativeButton={false} render={<Link href={'/purchases/' + encodeURIComponent(doc.purchaseId)} />}><FileText />{label('Open recorded purchase', 'Buka pembelian tercatat')}</Button>}{doc.status === "purchase_cancelled" && <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-300">{label('The linked purchase was cancelled because it was unpaid and deleted. The invoice record is kept for history.', 'Pembelian terkait dibatalkan karena belum dibayar dan dihapus. Catatan faktur tetap disimpan untuk riwayat.')}</p>}
          </div>}
        </SectionCard>
        {doc.status === 'review' && current && <SectionCard title={label('Review and match', 'Tinjau dan cocokkan')}>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="space-y-1 text-sm">{label('Invoice number', 'Nomor faktur')}<input className="w-full rounded-md border bg-background px-3 py-2" value={current.invoiceNumber || ''} onChange={e => update({ invoiceNumber: e.target.value })} /></label>
              <label className="space-y-1 text-sm">{label('Invoice date', 'Tanggal faktur')}<input type="date" className="w-full rounded-md border bg-background px-3 py-2" value={current.date || ''} onChange={e => update({ date: e.target.value })} /></label>
              <label className="space-y-1 text-sm">{label('Due date', 'Jatuh tempo')}<input type="date" className="w-full rounded-md border bg-background px-3 py-2" value={current.dueDate || ''} onChange={e => update({ dueDate: e.target.value })} /></label>
              <label className="space-y-1 text-sm">{label('Invoice total', 'Total faktur')}<input type="number" min="0" className="w-full rounded-md border bg-background px-3 py-2" value={current.total ?? ''} onChange={e => update({ total: e.target.value === '' ? null : Number(e.target.value) })} /></label>
            </div>
            <div className="rounded-lg border p-3 space-y-2"><h3 className="font-medium">{label('Supplier matching', 'Pencocokan supplier')}</h3><label className="block text-sm">{label('Detected supplier', 'Supplier terdeteksi')}<input className="mt-1 w-full rounded-md border bg-background px-3 py-2" value={current.supplierName || ''} onChange={e => update({ supplierName: e.target.value })} /></label>
              {(() => { const norm = normalize(current.supplierName || ''); const suggested = [...suppliers].map(s => ({ ...s, score: similarity(norm, s.name) })).sort((a, b) => b.score - a.score)[0]; return suggested && suggested.score >= 0.4 ? <p className="rounded-md bg-muted p-3 text-sm">{label('Possible match: ', 'Kemungkinan cocok: ')}<b>{suggested.name}</b> <button type="button" className="ml-2 underline" onClick={() => { setSupplierChoice(suggested.id); setCreateSupplier(false) }}>{label('Use existing supplier', 'Gunakan supplier yang ada')}</button></p> : null })()}
              <div className="space-y-3"><label className="flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm"><input type="radio" name="supplier-choice" checked={!createSupplier} onChange={() => setCreateSupplier(false)} className="mt-1" /><span className="flex-1"><span className="font-medium">{label('Use existing supplier', 'Gunakan supplier yang ada')}</span><div className="mt-2"><SearchableSelect id="supplier-match" value={supplierChoice || ''} onChange={value => { setSupplierChoice(String(value)); setCreateSupplier(false) }} options={suppliers.map(s => ({ value: s.id, label: s.name }))} placeholder={label('Select existing supplier…', 'Pilih supplier yang ada…')} searchPlaceholder={label('Search supplier', 'Cari supplier')} emptyText={label('No suppliers found', 'Supplier tidak ditemukan')} /></div></span></label><label className="flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm"><input type="radio" name="supplier-choice" checked={createSupplier} onChange={() => { setCreateSupplier(true); setSupplierChoice('') }} className="mt-1" /><span className="flex-1"><span className="font-medium">{label('Add as a new supplier', 'Tambahkan sebagai supplier baru')}</span><span className="mt-1 block text-muted-foreground">{label('The detected supplier name above will be used. You can edit it before confirming.', 'Nama supplier terdeteksi di atas akan digunakan. Kamu bisa mengubahnya sebelum konfirmasi.')}</span></span></label></div></div>
            <div className="space-y-5"><h3 className="font-medium">{label('Invoice items and product matching', 'Item faktur dan pencocokan produk')}</h3>{current.items.map((line, i) => { const suggestions = products.map(p => ({ ...p, score: similarity((line.productName || '') + (line.unit ? ' ' + line.unit : ''), p.name) })).sort((a, b) => b.score - a.score); const best = suggestions[0]; return <div key={i} className="space-y-4 rounded-lg border p-4 sm:p-5"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><label className="space-y-1 text-sm">{label('Product name', 'Nama produk')}<input className="w-full rounded-md border bg-background px-3 py-2" value={line.productName || ''} onChange={e => update({ items: current.items.map((x, j) => j === i ? { ...x, productName: e.target.value } : x) })} /></label><label className="space-y-1 text-sm">{label('Unit (stored in product name)', 'Unit (disimpan di nama produk)')}<input className="w-full rounded-md border bg-background px-3 py-2" value={line.unit || ''} onChange={e => update({ items: current.items.map((x, j) => j === i ? { ...x, unit: e.target.value } : x) })} placeholder="pcs / box / kg" /></label><label className="space-y-1 text-sm">Qty<input type="number" min="1" className="w-full rounded-md border bg-background px-3 py-2" value={line.quantity ?? ''} onChange={e => update({ items: current.items.map((x, j) => j === i ? { ...x, quantity: Number(e.target.value) } : x) })} /></label><label className="space-y-1 text-sm">{label('Unit cost', 'Harga satuan')}<input type="number" min="0" className="w-full rounded-md border bg-background px-3 py-2" value={line.unitCost ?? ''} onChange={e => update({ items: current.items.map((x, j) => j === i ? { ...x, unitCost: Number(e.target.value) } : x) })} /></label></div>
              {(() => { const mode = productMatchMode[i] || (best && best.score >= 0.5 ? 'existing' : 'new'); const confirmed = !!productMatchConfirmed[i]; const suggestedId = best && best.score >= 0.5 ? best.id : ''; const selectedId = productChoice[i] || suggestedId; return <div className="space-y-4 py-1"><div className="flex flex-wrap items-center gap-x-6 gap-y-2"><label className="flex cursor-pointer items-center gap-2 text-sm"><input type="radio" name={`product-match-${i}`} checked={mode === 'existing'} onChange={() => { setProductMatchMode(v => ({ ...v, [i]: 'existing' })); setProductMatchConfirmed(v => ({ ...v, [i]: false })); setCreateProducts(v => v.filter(n => n !== i)) }} />{label('Existing product', 'Produk sudah ada')}</label><label className="flex cursor-pointer items-center gap-2 text-sm"><input type="radio" name={`product-match-${i}`} checked={mode === 'new'} onChange={() => { setProductMatchMode(v => ({ ...v, [i]: 'new' })); setProductMatchConfirmed(v => ({ ...v, [i]: false })); setCreateProducts(v => [...new Set([...v, i])]); setProductChoice(v => ({ ...v, [i]: '' })) }} />{label('Add as new product', 'Tambahkan sebagai produk baru')}</label></div>{mode === 'existing' ? <div className="max-w-3xl space-y-3 py-1">{!confirmed && <><p className="text-sm">{label('Same as', 'Produk sama dengan')} <span className="font-semibold">{best && best.score >= 0.35 ? best.name : label('an existing product', 'produk yang sudah ada')}</span>?</p><label className="block space-y-1.5 text-sm"><span>{label('Choose product', 'Pilih produk')}</span><SearchableSelect id={`invoice-product-${i}`} value={selectedId} onChange={value => { setProductChoice(v => ({ ...v, [i]: String(value) })); setCreateProducts(v => v.filter(n => n !== i)) }} options={[{ value: '', label: label('Choose product…', 'Pilih produk…') }, ...suggestions.map(p => ({ value: p.id, label: p.name, description: p.id }))]} placeholder={label('Choose product…', 'Pilih produk…')} searchPlaceholder={label('Search products', 'Cari produk')} emptyText={label('No products found', 'Produk tidak ditemukan')} /></label><div className="flex gap-2 pt-1"><button type="button" disabled={!selectedId} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50" onClick={() => { setProductChoice(v => ({ ...v, [i]: selectedId })); setCreateProducts(v => v.filter(n => n !== i)); setProductMatchConfirmed(v => ({ ...v, [i]: true })) }}>{label('Yes', 'Ya')}</button><button type="button" className="rounded-md border px-4 py-2 text-sm" onClick={() => { setProductMatchMode(v => ({ ...v, [i]: 'new' })); setProductMatchConfirmed(v => ({ ...v, [i]: false })); setCreateProducts(v => [...new Set([...v, i])]); setProductChoice(v => ({ ...v, [i]: '' })) }}>{label('No', 'Tidak')}</button></div></>}{confirmed && <p className="text-sm text-green-700 dark:text-green-400">{label('Matched product: ', 'Produk cocok: ')}<span className="font-semibold">{products.find(p => p.id === productChoice[i])?.name || selectedId}</span></p>}</div> : <div className="max-w-3xl py-1">{!confirmed ? <div className="space-y-3"><p className="text-sm">{label('Add', 'Tambahkan')} <span className="font-semibold">{line.productName}</span> {label('as a new product?', 'sebagai produk baru?')}</p><p className="text-sm text-muted-foreground">{label('Unit: ', 'Unit: ')}{line.unit || '—'} · Qty: {line.quantity} · {label('Unit cost: ', 'Harga satuan: ')}{line.unitCost}</p><div className="flex gap-2 pt-1"><button type="button" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" onClick={() => { setCreateProducts(v => [...new Set([...v, i])]); setProductChoice(v => ({ ...v, [i]: '' })); setProductMatchConfirmed(v => ({ ...v, [i]: true })) }}>{label('Yes', 'Ya')}</button><button type="button" className="rounded-md border px-4 py-2 text-sm" onClick={() => { setProductMatchMode(v => ({ ...v, [i]: 'existing' })); setProductMatchConfirmed(v => ({ ...v, [i]: false })); setCreateProducts(v => v.filter(n => n !== i)) }}>{label('No', 'Tidak')}</button></div></div> : <p className="text-sm text-green-700 dark:text-green-400">{label('Marked as a new product: ', 'Ditandai sebagai produk baru: ')}<span className="font-semibold">{line.productName}</span></p>}</div>}</div> })()}
            </div> })}</div>
            <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2"><label className="space-y-1 text-sm"><span>{label('Amount paid now (Rp)', 'Jumlah dibayar sekarang (Rp)')}</span><input type="number" min="0" max={current.total ?? undefined} value={paidAmount} onChange={e => setPaidAmount(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2" /></label>{Number(paidAmount || 0) > 0 && <label className="space-y-1 text-sm"><span>{label('Pay from cash/bank', 'Bayar dari kas/bank')}</span><SearchableSelect id="invoice-payment-account" value={paymentAccount || financialAccounts.find(a => a.active && a.name.toLowerCase() === 'cash')?.name || financialAccounts.find(a => a.active)?.name || ''} onChange={value => setPaymentAccount(String(value))} options={financialAccounts.filter(a => a.active).map(a => ({ value: a.name, label: a.name, description: a.type === 'cash' ? label('Cash', 'Kas') : label('Bank', 'Bank') }))} placeholder={label('Select account', 'Pilih akun')} searchPlaceholder={label('Search accounts', 'Cari akun')} emptyText={label('No active accounts', 'Tidak ada akun aktif')} required /></label>}<p className="text-xs text-muted-foreground sm:col-span-2">{label('Leave at Rp0 for an unpaid purchase. Any amount paid here is recorded in the selected account and the general ledger.', 'Biarkan Rp0 jika pembelian belum dibayar. Pembayaran di sini dicatat pada akun terpilih dan buku besar.')}</p></div>
            <div className="space-y-2"><div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => void saveReview()} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:border-muted disabled:bg-muted disabled:text-muted-foreground"><Save className="size-4" />{label('Save review', 'Simpan tinjauan')}</button>
              {!doc.purchaseId && <button type="button" disabled={busy} onClick={() => void deleteDocument()} className="inline-flex items-center gap-2 rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"><Trash2 className="size-4" />{label('Delete invoice', 'Hapus faktur')}</button>}
              <button type="button" disabled={busy || !canConfirm} onClick={() => void confirmPurchase()} title={!current.supplierName?.trim() ? label('Supplier name is required.', 'Nama supplier wajib diisi.') : !supplierReady ? label('Choose a supplier option.', 'Pilih opsi supplier.') : !productsReady ? label('Confirm every product match.', 'Konfirmasikan semua pencocokan produk.') : undefined} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:border disabled:border-muted disabled:bg-muted disabled:text-muted-foreground">{busy ? <RefreshCw className="size-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="size-4" />}{busy ? label('Working…', 'Memproses…') : label('Confirm and record purchase', 'Konfirmasi dan catat pembelian')}</button>
            </div>{!current.supplierName?.trim() ? <p className="text-xs text-destructive">{label('Supplier name is required.', 'Nama supplier wajib diisi.')}</p> : !supplierReady ? <p className="text-xs text-destructive">{label('Select an existing supplier or choose Add as new supplier.', 'Pilih supplier yang ada atau Tambahkan sebagai supplier baru.')}</p> : !productsReady ? <p className="text-xs text-muted-foreground">{label('Confirm each product match using Yes, or confirm Add as new product.', 'Konfirmasikan setiap pencocokan produk dengan Ya, atau konfirmasikan Tambahkan sebagai produk baru.')}</p> : null}</div>
            <p className="text-xs text-muted-foreground">{label('Confirming creates the purchase, receives stock, updates moving-average cost, posts inventory/payable journal entries and writes audit history. Similarity suggestions never create a product unless you choose it.', 'Konfirmasi akan membuat pembelian, menambah stok, memperbarui biaya rata-rata bergerak, mencatat jurnal persediaan/utang, dan menulis riwayat audit. Saran kemiripan tidak membuat produk baru tanpa pilihanmu.')}</p>
          </div>
        </SectionCard>}
        {doc.reviewIssues?.length > 0 && <SectionCard title={label('Review notes', 'Catatan pemeriksaan')}><ul className="list-disc space-y-1 pl-5 text-sm text-amber-700 dark:text-amber-400">{doc.reviewIssues.map((issue, i) => <li key={i}>{issue}</li>)}</ul></SectionCard>}
      </div>
    </div>
  </>
}
function Detail({ label, value }: { label: string; value: string }) { return <div className="flex flex-wrap justify-between gap-3 border-b pb-2 last:border-0"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div> }
