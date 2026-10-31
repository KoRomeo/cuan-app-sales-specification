'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, RefreshCw, Save, Sparkles, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { SectionCard } from '@/components/common/section-card'
import { SearchableSelect } from '@/components/common/searchable-select'
import { Button } from '@/components/ui/button'
import { useApp } from '@/components/providers'
import { formatIDR } from '@/lib/format'
import { Detail, InvoiceFilePreview, StatusBadge, fetcher, safeUuid, similarity, type FinancialAccount, type InvoiceData, type Product, type PurchaseDocument, type Supplier } from './purchase-invoice-shared'

export function PurchaseInvoiceReviewView({ documentId }: { documentId: string }) {
  const { locale, t } = useApp()
  const label = (en: string, id: string) => locale === 'id' ? id : en
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
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
  useEffect(() => {
    const saved = documents?.find(item => item.id === documentId)?.extractedData
    if (!saved) return
    setSupplierChoice(saved.supplierId || '')
    setCreateSupplier(saved.createSupplier === true)
  }, [documents, documentId])
  const error = businessError || documentsError
  if (error) return <div role="alert" className="text-sm text-destructive">{error.message}</div>
  if (!business || !documents) return <div className="space-y-4 animate-pulse" aria-label={label('Loading invoice review', 'Memuat pemeriksaan faktur')}><div className="h-8 w-2/5 rounded-md bg-muted"/><div className="h-5 w-1/3 rounded-md bg-muted"/><div className="grid gap-4 lg:grid-cols-2"><div className="h-[42vh] rounded-lg border bg-muted/70"/><div className="space-y-3 rounded-lg border p-5"><div className="h-5 w-2/3 rounded bg-muted"/><div className="h-10 rounded bg-muted"/><div className="h-10 rounded bg-muted"/><div className="h-10 rounded bg-muted"/></div></div></div>
  const doc = documents.find(d => d.id === documentId)
  if (!doc) return <div className="space-y-3"><p className="text-sm text-muted-foreground">{label('Invoice document not found.', 'Dokumen faktur tidak ditemukan.')}</p><Button variant="outline" nativeButton={false} render={<Link href="/purchase-documents" />}>{label('Back to purchase invoices', 'Kembali ke faktur pembelian')}</Button></div>

  if (doc.status === 'confirmed' || doc.status === 'purchase_cancelled') {
    return <div className="space-y-4">
      <PageHeader breadcrumbs={[{ label: t('nav.purchasing') }, { label: label('Purchase Invoice', 'Faktur Pembelian'), href: '/purchase-documents' }, { label: doc.fileName }]} title={label('Review', 'Pemeriksaan')} description={doc.fileName} actions={<Button variant="outline" nativeButton={false} render={<Link href="/purchase-documents" />}><ArrowLeft />{label('Back to invoices', 'Kembali ke faktur')}</Button>} />
      <SectionCard title={label('Nothing to review', 'Tidak ada yang perlu diperiksa')}>
        <p className="text-sm text-muted-foreground">{label('This invoice is already confirmed. Open the details page to view it, or the edit page to change its recorded fields.', 'Faktur ini sudah dikonfirmasi. Buka halaman detail untuk melihat, atau halaman edit untuk mengubah data tercatatnya.')}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button nativeButton={false} render={<Link href={'/purchase-invoice/' + encodeURIComponent(doc.id)} />}>{label('View details', 'Lihat detail')}</Button>
          {doc.status === 'purchase_cancelled' && <Button disabled={busy} onClick={async () => {
            setBusy(true)
            try {
              const response = await fetch('/api/purchase-documents/' + encodeURIComponent(doc.id), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId: business.id, action: 'restore_review' }) })
              const result = await response.json()
              if (!response.ok) throw new Error(result.error || label('Unable to restore invoice', 'Tidak dapat memulihkan faktur'))
              await mutateDocuments()
              window.location.href = '/purchase-invoice/' + encodeURIComponent(doc.id) + '/review'
            } catch (cause) { setMessage(cause instanceof Error ? cause.message : label('Unable to restore invoice', 'Tidak dapat memulihkan faktur')) }
            finally { setBusy(false) }
          }}>{label('Restore to review', 'Pulihkan untuk ditinjau')}</Button>}
        </div>
      </SectionCard>
    </div>
  }

  const extracted = doc.extractedData
  const current: InvoiceData | null = invoice || extracted || null
  const update = (patch: Partial<InvoiceData>) => setInvoice(old => ({ ...(old || extracted!), ...patch }))

  async function extractWithAI() {
    if (!business?.id) return
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/purchase-documents/' + encodeURIComponent(doc!.id) + '/process?businessId=' + encodeURIComponent(business.id), { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || label('Extraction failed', 'Ekstraksi gagal'))
      await mutateDocuments()
      setMessage(label('Extraction finished. Review the extracted fields below.', 'Ekstraksi selesai. Tinjau hasil ekstraksi di bawah.'))
    } catch (e) { setMessage(e instanceof Error ? e.message : label('Extraction failed', 'Ekstraksi gagal')); await mutateDocuments() } finally { setBusy(false) }
  }

  async function saveReview() {
    if (!business?.id || !current) return
    setBusy(true)
    try {
      const response = await fetch('/api/purchase-documents/' + encodeURIComponent(doc!.id) + '/review', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId: business.id, extractedData: { ...current, supplierId: createSupplier ? null : supplierChoice, createSupplier } }) })
      const data = await response.json()
      if (!response.ok) throw new Error((data.issues || [data.error]).join('; '))
      await mutateDocuments()
      window.location.href = '/purchase-documents'
    } catch (e) { setMessage(e instanceof Error ? e.message : label('Save failed', 'Gagal menyimpan')) } finally { setBusy(false) }
  }

  async function deleteDocument() {
    if (!business?.id) return
    setBusy(true)
    try {
      const response = await fetch('/api/purchase-documents/' + encodeURIComponent(doc!.id) + '?businessId=' + encodeURIComponent(business.id), { method: 'DELETE' })
      if (!response.ok) throw new Error(label('Unable to delete document', 'Tidak dapat menghapus dokumen'))
      window.location.href = '/purchase-documents'
    } catch (e) { setMessage(e instanceof Error ? e.message : label('Unable to delete document', 'Tidak dapat menghapus dokumen')); setBusy(false) }
  }

  async function confirmPurchase() {
    if (!business?.id || !current) return
    const newSupplier = createSupplier
    const supplierId = supplierChoice
    if (!current.supplierName?.trim()) { setMessage(label('Supplier name is required.', 'Nama supplier wajib diisi.')); return }
    if (!newSupplier && !supplierId) { setMessage(label('Select a supplier first', 'Pilih supplier terlebih dahulu')); return }
    const choices = { ...Object.fromEntries(current.items.flatMap((item, i) => item.productId ? [[i, item.productId]] : [])), ...productChoice }
    const newIndexes = [...new Set([...createProducts, ...current.items.flatMap((item, i) => item.productMatch === 'new' ? [i] : [])])]
    const unresolved = current.items.map((_, i) => i).filter(i => !newIndexes.includes(i) && !choices[i])
    if (unresolved.length) { setMessage(label('Match every item with a product or add it as a new product. Items not matched yet: ', 'Cocokkan setiap item dengan produk atau tambahkan sebagai produk baru. Item yang belum dicocokkan: ') + unresolved.map(i => '#' + (i + 1)).join(', ')); return }
    const paid = Math.max(0, Number(paidAmount || 0))
    const account = paymentAccount || financialAccounts.find(a => a.active && a.name.toLowerCase() === 'cash')?.name || financialAccounts.find(a => a.active)?.name || ''
    if (paid > current.items.reduce((sum, line) => { const gross=Number(line.quantity)*Number(line.unitCost), discount=line.discountType==='percent'?gross*Number(line.discount??0)/100:Number(line.discount??0); return sum+Math.ceil(Math.max(0,gross-discount)-1e-9) }, 0)) { setMessage(label('Payment cannot exceed the invoice total.', 'Pembayaran tidak boleh melebihi total faktur.')); return }
    if (paid > 0 && !account) { setMessage(label('Choose an active cash or bank account for this payment.', 'Pilih akun kas atau bank yang aktif untuk pembayaran ini.')); return }
    setBusy(true); setMessage('')
    try {
      const save = await fetch('/api/purchase-documents/' + encodeURIComponent(doc!.id) + '/review', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId: business.id, extractedData: { ...current, supplierId: createSupplier ? null : supplierId, createSupplier } }) })
      const saved = await save.json()
      if (!save.ok) throw new Error((saved.issues || [saved.error]).join('; ') || label('Review save failed', 'Gagal menyimpan peninjauan'))
      const response = await fetch('/api/purchase-documents/' + encodeURIComponent(doc!.id) + '/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId: business.id, supplierId: newSupplier ? undefined : supplierId, createSupplier: newSupplier, itemProductIds: choices, createProductIndexes: newIndexes, date: current.date, dueDate: current.dueDate, paidAmount: paid, paymentAccount: account, paymentId: paid > 0 ? 'PAY-AI-' + safeUuid() : undefined, paymentDate: current.date, notes: 'AI invoice ' + (current.invoiceNumber || doc!.fileName) }) })
      const data = await response.json()
      if (!response.ok) throw new Error([data.detail, data.error].filter(Boolean).join(' — ') || label('Confirmation failed', 'Konfirmasi gagal'))
      await mutateDocuments()
      window.location.href = '/purchase-invoice/' + encodeURIComponent(doc!.id)
    } catch (e) { setMessage(e instanceof Error ? e.message : label('Confirmation failed', 'Konfirmasi gagal')); await mutateDocuments() } finally { setBusy(false) }
  }

  const unmatchedItems = current ? current.items.map((_, i) => i).filter(i => current.items[i].productMatch !== 'new' && !current.items[i].productId && !createProducts.includes(i) && !productChoice[i]) : []
  const confirmBlocker = !current ? '' : !current.supplierName?.trim()
    ? label('Supplier name is required.', 'Nama supplier wajib diisi.')
    : !createSupplier && !supplierChoice
      ? label('Select an existing supplier or choose Add as new supplier.', 'Pilih supplier yang ada atau Tambahkan sebagai supplier baru.')
      : unmatchedItems.length
        ? label('Items not matched yet: ', 'Item yang belum dicocokkan: ') + unmatchedItems.map(i => '#' + (i + 1)).join(', ')
        : ''

  return <>
    <PageHeader breadcrumbs={[{ label: t('nav.purchasing') }, { label: label('Purchase Invoice', 'Faktur Pembelian'), href: '/purchase-documents' }, { label: doc.fileName }]} title={label('Inspect invoice', 'Periksa faktur')} description={doc.fileName} actions={<Button variant="outline" nativeButton={false} render={<Link href="/purchase-documents" />}><ArrowLeft />{label('Back to invoices', 'Kembali ke faktur')}</Button>} />
    <div className="flex min-w-0 flex-col gap-5">
      <SectionCard title={label('Stored invoice file', 'File faktur tersimpan')}>
        <InvoiceFilePreview documentId={doc.id} businessId={business.id} fileName={doc.fileName} mimeType={doc.mimeType} label={label} />
      </SectionCard>
      <SectionCard title={label('Edit extracted details', 'Edit detail hasil ekstraksi')} action={<StatusBadge status={doc.status} label={label} />}>
          <div className="space-y-3 text-sm">
            <Detail label={label('File', 'File')} value={doc.fileName} />
            <Detail label={label('Uploaded', 'Diunggah')} value={new Date(doc.createdAt).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US')} />
            <Detail label={label('Accuracy', 'Akurasi')} value={doc.confidence == null ? '—' : doc.confidence + '%'} />
            {(doc.status === 'queued' || doc.status === 'failed') && <>
              <p className="text-muted-foreground">{doc.status === 'queued' ? label('This document is waiting for AI extraction. Click the button to start.', 'Dokumen ini menunggu ekstraksi AI. Klik tombol untuk memulai.') : label('The previous extraction attempt failed. Try again below.', 'Percobaan ekstraksi sebelumnya gagal. Coba lagi di bawah.')}</p>
              {doc.errorMessage && <p className="text-destructive">{doc.errorMessage}</p>}
              <button type="button" disabled={busy} onClick={() => void extractWithAI()} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"><Sparkles className="size-4" />{busy ? label('Extracting…', 'Mengekstrak…') : label('Extract with AI', 'Ekstrak dengan AI')}</button>
            </>}
            {doc.status === 'processing' && <p className="text-muted-foreground">{label('AI extraction is in progress. This page updates automatically after it finishes — reload if needed.', 'Ekstraksi AI sedang berjalan. Halaman ini diperbarui otomatis setelah selesai — muat ulang bila perlu.')}</p>}
            {message && <p role="status" className="rounded-md border bg-muted/30 p-3">{message}</p>}
            {doc.errorMessage && doc.status !== 'queued' && doc.status !== 'failed' && <p className="text-sm text-destructive">{doc.errorMessage}</p>}
            {doc.reviewIssues?.length > 0 && <div><p className="mb-1 font-medium">{label('Review notes', 'Catatan pemeriksaan')}</p><ul className="list-disc space-y-1 pl-5 text-amber-700 dark:text-amber-400">{doc.reviewIssues.map((issue, i) => <li key={i}>{issue}</li>)}</ul></div>}
          </div>
        </SectionCard>
    </div>
    {doc.status === 'review' && current && <SectionCard title={label('Review and match', 'Tinjau dan cocokkan')} className="mt-5">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="space-y-1 text-sm">{label('Invoice number', 'Nomor faktur')}<input className="w-full rounded-md border bg-background px-3 py-2" value={current.invoiceNumber || ''} onChange={e => update({ invoiceNumber: e.target.value })} /></label>
              <label className="space-y-1 text-sm">{label('Invoice date', 'Tanggal faktur')}<input type="date" className="w-full rounded-md border bg-background px-3 py-2" value={current.date || ''} onChange={e => update({ date: e.target.value })} /></label>
              <label className="space-y-1 text-sm">{label('Due date', 'Jatuh tempo')}<input type="date" className="w-full rounded-md border bg-background px-3 py-2" value={current.dueDate || ''} onChange={e => update({ dueDate: e.target.value })} /></label>
              <label className="space-y-1 text-sm">{label('Invoice total', 'Total faktur')}<input type="number" min="0" className="w-full rounded-md border bg-background px-3 py-2" value={current.total ?? ''} onChange={e => update({ total: e.target.value === '' ? null : Number(e.target.value) })} /></label>
            </div>
            <div className="rounded-lg border p-3 space-y-2"><h3 className="font-medium">{label('Supplier matching', 'Pencocokan supplier')}</h3><label className="block text-sm">{label('Detected supplier', 'Supplier terdeteksi')}<input className="mt-1 w-full rounded-md border bg-background px-3 py-2" value={current.supplierName || ''} onChange={e => update({ supplierName: e.target.value })} /></label>
              {(() => { const norm = (current.supplierName || '').toLocaleLowerCase(); const suggested = [...suppliers].map(s => ({ ...s, score: similarity(norm, s.name) })).sort((a, b) => b.score - a.score)[0]; return suggested && suggested.score >= 0.4 ? <p className="rounded-md bg-muted p-3 text-sm">{label('Possible match: ', 'Kemungkinan cocok: ')}<b>{suggested.name}</b> <button type="button" className="ml-2 underline" onClick={() => { setSupplierChoice(suggested.id); setCreateSupplier(false) }}>{label('Use existing supplier', 'Gunakan supplier yang ada')}</button></p> : null })()}
              <div className="space-y-3"><div className="flex flex-wrap items-center gap-x-6 gap-y-2"><label className="flex cursor-pointer items-center gap-2 text-sm"><input type="radio" name="supplier-choice" checked={!createSupplier} onChange={() => { setCreateSupplier(false); setSupplierChoice('') }} />{label('Use existing supplier', 'Gunakan supplier yang ada')}</label><label className="flex cursor-pointer items-center gap-2 text-sm"><input type="radio" name="supplier-choice" checked={createSupplier} onChange={() => { setCreateSupplier(true); setSupplierChoice('') }} />{label('Add as a new supplier', 'Tambahkan sebagai supplier baru')}</label></div>{createSupplier ? <p className="max-w-3xl text-sm text-muted-foreground">{label('The detected supplier name above will be used. You can edit it before confirming.', 'Nama supplier terdeteksi di atas akan digunakan. Kamu bisa mengubahnya sebelum konfirmasi.')}</p> : <div className="max-w-3xl"><SearchableSelect id="supplier-match" value={supplierChoice || ''} onChange={value => setSupplierChoice(String(value))} options={suppliers.map(s => ({ value: s.id, label: s.name }))} placeholder={label('Select existing supplier…', 'Pilih supplier yang ada…')} searchPlaceholder={label('Search supplier', 'Cari supplier')} emptyText={label('No suppliers found', 'Supplier tidak ditemukan')} /></div>}</div></div>
            <div className="space-y-5"><h3 className="font-medium">{label('Invoice items and product matching', 'Item faktur dan pencocokan produk')}</h3>{current.items.map((line, i) => { const incomingUnit = (line.unit || '').trim().toLocaleLowerCase().replace(/[^a-z0-9]/g, ''); const compatibleProducts = products.filter(p => { const match = p.name.match(/(?:_|\s)*\(([^)]+)\)\s*$/); if (!incomingUnit || !match) return true; const existingUnit = match[1].trim().toLocaleLowerCase().replace(/[^a-z0-9]/g, ''); return existingUnit === incomingUnit; }); const suggestions = compatibleProducts.map(p => ({ ...p, score: similarity(line.productName || '', p.name) })).sort((a, b) => b.score - a.score); const best = suggestions[0]; return <div key={i} className="space-y-4 rounded-lg border p-4 sm:p-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"><label className="space-y-1 text-sm lg:col-span-2">{label('Product name', 'Nama produk')}<input className="w-full rounded-md border bg-background px-3 py-2" value={line.productName || ''} onChange={e => update({ items: current.items.map((x, j) => j === i ? { ...x, productName: e.target.value } : x) })} /></label><label className="space-y-1 text-sm">{label('Unit', 'Satuan')}<input className="w-full rounded-md border bg-background px-3 py-2" value={line.unit || ''} onChange={e => update({ items: current.items.map((x, j) => j === i ? { ...x, unit: e.target.value } : x) })} placeholder="pcs / box" /></label><label className="space-y-1 text-sm">Qty<input type="number" min="1" className="w-full rounded-md border bg-background px-3 py-2" value={line.quantity ?? ''} onChange={e => update({ items: current.items.map((x, j) => j === i ? { ...x, quantity: Number(e.target.value) } : x) })} /></label><label className="space-y-1 text-sm">{label('Unit cost', 'Harga satuan')}<input type="number" min="0" className="w-full rounded-md border bg-background px-3 py-2" value={line.unitCost ?? ''} onChange={e => update({ items: current.items.map((x, j) => j === i ? { ...x, unitCost: Number(e.target.value) } : x) })} /></label><label className="space-y-1 text-sm">{label('Discount', 'Diskon')}<div className="flex gap-1"><select aria-label={label('Discount type','Jenis diskon')} className="h-10 w-[68px] rounded-md border bg-background px-2" value={line.discountType || 'amount'} onChange={e => update({ items: current.items.map((x, j) => j === i ? { ...x, discountType: e.target.value as 'amount' | 'percent', discount: 0 } : x) })}><option value="amount">Rp</option><option value="percent">%</option></select><input type="number" min="0" max={(line.discountType || 'amount') === 'percent' ? 100 : Number(line.quantity)*Number(line.unitCost)} className="min-w-0 w-full rounded-md border bg-background px-2 py-2" value={line.discount ?? 0} onChange={e => update({ items: current.items.map((x, j) => j === i ? { ...x, discount: Number(e.target.value) } : x) })} /></div></label><div className="space-y-1 text-sm sm:col-span-2 lg:col-span-6"><span className="text-muted-foreground">{label('Amount', 'Jumlah')}</span><p className="font-mono font-semibold">{(() => { const gross=Number(line.quantity)*Number(line.unitCost), discount=(line.discountType||'amount')==='percent'?gross*Number(line.discount??0)/100:Number(line.discount??0); return formatIDR(Math.ceil(Math.max(0,gross-discount)-1e-9)) })()}</p></div></div>
              {(() => { const mode = line.productMatch || productMatchMode[i] || (best && best.score >= 0.5 ? 'existing' : 'new'); const confirmed = Boolean(line.productMatch) || !!productMatchConfirmed[i]; const suggestedId = best && best.score >= 0.5 ? best.id : ''; const selectedId = line.productId || productChoice[i] || suggestedId; return <div className="space-y-4 py-1"><div className="flex flex-wrap items-center gap-x-6 gap-y-2"><label className="flex cursor-pointer items-center gap-2 text-sm"><input type="radio" name={`product-match-${i}`} checked={mode === 'existing'} onChange={() => { update({ items: current.items.map((x, j) => j === i ? { ...x, productMatch: undefined, productId: undefined } : x) }); setProductMatchMode(v => ({ ...v, [i]: 'existing' })); setProductMatchConfirmed(v => ({ ...v, [i]: false })); setCreateProducts(v => v.filter(n => n !== i)) }} />{label('Existing product', 'Produk sudah ada')}</label><label className="flex cursor-pointer items-center gap-2 text-sm"><input type="radio" name={`product-match-${i}`} checked={mode === 'new'} onChange={() => { update({ items: current.items.map((x, j) => j === i ? { ...x, productMatch: undefined, productId: undefined } : x) }); setProductMatchMode(v => ({ ...v, [i]: 'new' })); setProductMatchConfirmed(v => ({ ...v, [i]: false })); setCreateProducts(v => v.filter(n => n !== i)); setProductChoice(v => ({ ...v, [i]: '' })) }} />{label('Add as new product', 'Tambahkan sebagai produk baru')}</label></div>{mode === 'existing' ? <div className="max-w-3xl space-y-3 py-1">{!confirmed && <><p className="text-sm">{label('Same as', 'Produk sama dengan')} <span className="font-semibold">{best && best.score >= 0.35 ? best.name : label('an existing product', 'produk yang sudah ada')}</span>?</p><label className="block space-y-1.5 text-sm"><span>{label('Choose product', 'Pilih produk')}</span><SearchableSelect id={`invoice-product-${i}`} value={selectedId} onChange={value => { const id = String(value); setProductChoice(v => ({ ...v, [i]: id })); setCreateProducts(v => v.filter(n => n !== i)); update({ items: current.items.map((x, j) => j === i ? { ...x, productMatch: undefined, productId: id } : x) }) }} options={[{ value: '', label: label('Choose product…', 'Pilih produk…') }, ...suggestions.map(p => ({ value: p.id, label: p.name, description: p.id }))]} placeholder={label('Choose product…', 'Pilih produk…')} searchPlaceholder={label('Search products', 'Cari produk')} emptyText={label('No products found', 'Produk tidak ditemukan')} /></label><div className="flex gap-2 pt-1"><button type="button" disabled={!selectedId} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50" onClick={() => { update({ items: current.items.map((x, j) => j === i ? { ...x, productMatch: 'existing', productId: selectedId } : x) }); setProductChoice(v => ({ ...v, [i]: selectedId })); setCreateProducts(v => v.filter(n => n !== i)); setProductMatchConfirmed(v => ({ ...v, [i]: true })) }}>{label('Yes', 'Ya')}</button><button type="button" className="rounded-md border px-4 py-2 text-sm" onClick={() => { setProductMatchMode(v => ({ ...v, [i]: 'new' })); setProductMatchConfirmed(v => ({ ...v, [i]: false })); setCreateProducts(v => [...new Set([...v, i])]); setProductChoice(v => ({ ...v, [i]: '' })) }}>{label('No', 'Tidak')}</button></div></>}{confirmed && <p className="text-sm text-green-700 dark:text-green-400">{label('Matched product: ', 'Produk cocok: ')}<span className="font-semibold">{products.find(p => p.id === productChoice[i])?.name || selectedId}</span></p>}</div> : <div className="max-w-3xl py-1">{!confirmed ? <div className="space-y-3"><p className="text-sm">{label('Add', 'Tambahkan')} <span className="font-semibold">{line.productName}</span> {label('as a new product?', 'sebagai produk baru?')}</p><p className="text-sm text-muted-foreground">{label('Unit: ', 'Unit: ')}{line.unit || '—'} · Qty: {line.quantity} · {label('Unit cost: ', 'Harga satuan: ')}{line.unitCost}</p><div className="flex gap-2 pt-1"><button type="button" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" onClick={() => { update({ items: current.items.map((x, j) => j === i ? { ...x, productMatch: 'new', productId: undefined } : x) }); setCreateProducts(v => [...new Set([...v, i])]); setProductChoice(v => ({ ...v, [i]: '' })); setProductMatchConfirmed(v => ({ ...v, [i]: true })) }}>{label('Yes', 'Ya')}</button><button type="button" className="rounded-md border px-4 py-2 text-sm" onClick={() => { update({ items: current.items.map((x, j) => j === i ? { ...x, productMatch: undefined, productId: undefined } : x) }); setProductMatchMode(v => ({ ...v, [i]: 'existing' })); setProductMatchConfirmed(v => ({ ...v, [i]: false })); setCreateProducts(v => v.filter(n => n !== i)) }}>{label('No', 'Tidak')}</button></div></div> : <p className="text-sm text-green-700 dark:text-green-400">{label('Marked as a new product: ', 'Ditandai sebagai produk baru: ')}<span className="font-semibold">{line.productName}</span></p>}</div>}</div> })()}
            </div> })}</div>
            <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2"><label className="space-y-1 text-sm"><span>{label('Amount paid now (Rp)', 'Jumlah dibayar sekarang (Rp)')}</span><input type="number" min="0" max={current.total ?? undefined} value={paidAmount} onChange={e => setPaidAmount(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2" /></label>{Number(paidAmount || 0) > 0 && <label className="space-y-1 text-sm"><span>{label('Pay from cash/bank', 'Bayar dari kas/bank')}</span><SearchableSelect id="invoice-payment-account" value={paymentAccount || financialAccounts.find(a => a.active && a.name.toLowerCase() === 'cash')?.name || financialAccounts.find(a => a.active)?.name || ''} onChange={value => setPaymentAccount(String(value))} options={financialAccounts.filter(a => a.active).map(a => ({ value: a.name, label: a.name, description: a.type === 'cash' ? label('Cash', 'Kas') : label('Bank', 'Bank') }))} placeholder={label('Select account', 'Pilih akun')} searchPlaceholder={label('Search accounts', 'Cari akun')} emptyText={label('No active accounts', 'Tidak ada akun aktif')} required /></label>}<p className="text-xs text-muted-foreground sm:col-span-2">{label('Leave at Rp0 for an unpaid purchase. Any amount paid here is recorded in the selected account and the general ledger.', 'Biarkan Rp0 jika pembelian belum dibayar. Pembayaran di sini dicatat pada akun terpilih dan buku besar.')}</p></div>
            <div className="space-y-2">{confirmBlocker && <p role="alert" className="text-sm font-medium text-destructive">{confirmBlocker}</p>}<div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => void saveReview()} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:border-muted disabled:bg-muted disabled:text-muted-foreground"><Save className="size-4" />{label('Save review', 'Simpan tinjauan')}</button>
              {!doc.purchaseId && <button type="button" disabled={busy} onClick={() => void deleteDocument()} className="inline-flex items-center gap-2 rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"><Trash2 className="size-4" />{label('Delete invoice', 'Hapus faktur')}</button>}
              <button type="button" disabled={busy} onClick={() => { if (confirmBlocker) { setMessage(confirmBlocker); window.scrollTo({ top: 0, behavior: 'smooth' }); return } void confirmPurchase() }} title={confirmBlocker || undefined} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">{busy ? <RefreshCw className="size-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="size-4" />}{busy ? label('Working…', 'Memproses…') : label('Confirm and record purchase', 'Konfirmasi dan catat pembelian')}</button>
            </div></div>
            <p className="text-xs text-muted-foreground">{label('Confirming creates the purchase, receives stock, updates moving-average cost, posts inventory/payable journal entries and writes audit history. Similarity suggestions never create a product unless you choose it.', 'Konfirmasi akan membuat pembelian, menambah stok, memperbarui biaya rata-rata bergerak, mencatat jurnal persediaan/utang, dan menulis riwayat audit. Saran kemiripan tidak membuat produk baru tanpa pilihanmu.')}</p>
          </div>
      </SectionCard>}
  </>
}
