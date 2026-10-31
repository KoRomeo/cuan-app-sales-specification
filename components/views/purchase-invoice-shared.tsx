'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Download, FileText, RefreshCw, X, ZoomIn, RotateCw } from 'lucide-react'

export type Line = { productName: string; unit?: string | null; quantity: number; unitCost: number; discount?: number; discountType?: 'amount' | 'percent'; lineTotal?: number; productId?: string }
export type InvoiceData = { invoiceNumber?: string | null; date?: string | null; dueDate?: string | null; supplierName?: string | null; supplierCity?: string | null; total?: number | null; items: Line[] }
export type PurchaseDocument = { id: string; fileName: string; fileSize: number; mimeType: string; previewBlobPathname?: string | null; previewFileSize?: number | null; status: string; createdAt: string; confidence: number | null; reviewIssues: string[]; errorMessage?: string | null; extractedData?: InvoiceData | null; purchaseId?: string | null }
export type Product = { id: string; name: string; sellingPrice: string; costReference: string; averageCost: string }
export type Supplier = { id: string; name: string; contact?: string | null }
export type FinancialAccount = { id: string; name: string; type: 'cash' | 'bank'; active: boolean }

export const fetcher = async (url: string) => { const response = await fetch(url); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Request failed'); return data }

/** crypto.randomUUID() only exists in secure contexts; fall back so confirm never crashes on plain http/LAN. */
export function safeUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => { const r = Math.random() * 16 | 0; const v = ch === 'x' ? r : (r & 0x3 | 0x8); return v.toString(16) })
}

export const normalize = (s: string) => s.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim()

export function similarity(a: string, b: string) { const x = normalize(a), y = normalize(b); if (!x || !y) return 0; if (x === y) return 1; if (x.includes(y) || y.includes(x)) return Math.min(x.length, y.length) / Math.max(x.length, y.length) + 0.25; const A = new Set(x.split(" ")), B = new Set(y.split(" ")); return 2 * [...A].filter(v => B.has(v)).length / (A.size + B.size) }

export function statusBadgeClass(status: string) {
  return status === "confirmed" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300"
    : status === "purchase_cancelled" ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-300"
    : status === "failed" ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-300"
    : status === "review" ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300"
    : status === "processing" || status === "confirming" ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-950/40 dark:text-blue-300"
    : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/40 dark:bg-slate-900/60 dark:text-slate-300"
}

export function StatusBadge({ status, label }: { status: string; label: (en: string, id: string) => string }) {
  const text = status === "purchase_cancelled" ? label('Purchase cancelled', 'Pembelian dibatalkan') : status === "confirmed" ? label('Confirmed', 'Dikonfirmasi') : status === "review" ? label('Needs review', 'Perlu ditinjau') : status === "failed" ? label('Failed', 'Gagal') : status === "queued" ? label('Queued', 'Antrean') : status === "processing" ? label('Processing', 'Memproses') : status === "confirming" ? label('Confirming', 'Mengonfirmasi') : status
  return <span className={'inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ' + statusBadgeClass(status)}>{text}</span>
}

export function Detail({ label, value }: { label: string; value: string }) { return <div className="flex flex-wrap justify-between gap-3 border-b pb-2 last:border-0"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div> }

/** Authenticated preview of the stored invoice file (image / PDF / text) with clear error handling. */
export function InvoiceFilePreview({ documentId, businessId, fileName, mimeType, label }: { documentId: string; businessId: string; fileName: string; mimeType: string; label: (en: string, id: string) => string }) {
  const [url, setUrl] = useState('')
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorText, setErrorText] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ pointerId: number; x: number; y: number; panX: number; panY: number } | null>(null)
  const imageViewportRef = useRef<HTMLDivElement>(null)
  const toggleZoom = () => { setZoomed(value => !value); setPan({ x: 0, y: 0 }); dragRef.current = null }
  const startPan = (event: React.PointerEvent<HTMLImageElement>) => {
    if (!zoomed) { setZoomed(true); setPan({ x: 0, y: 0 }); return }
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y }
  }
  const movePan = (event: React.PointerEvent<HTMLImageElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    setPan({ x: drag.panX + event.clientX - drag.x, y: drag.panY + event.clientY - drag.y })
  }
  const endPan = (event: React.PointerEvent<HTMLImageElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
  }

  useEffect(() => {
    let cancelled = false
    let objectUrl = ''
    async function load() {
      setState('loading'); setErrorText('')
      try {
        const response = await fetch('/api/purchase-documents/' + encodeURIComponent(documentId) + '/file?businessId=' + encodeURIComponent(businessId) + (mimeType.startsWith('image/') ? '&variant=preview' : ''))
        if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || 'HTTP ' + response.status) }
        const blob = await response.blob()
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
        setState('ready')
      } catch (e) {
        if (!cancelled) { setErrorText(e instanceof Error ? e.message : 'Unable to load preview'); setState('error') }
      }
    }
    void load()
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [documentId, businessId, attempt])

  const retry = useCallback(() => setAttempt(a => a + 1), [])

  return <div className="space-y-3">
    {state === 'loading' && <div className="flex h-[70vh] min-h-[420px] items-center justify-center rounded-md border bg-muted"><RefreshCw className="size-5 animate-spin text-muted-foreground" /></div>}
    {state === 'error' && <div className="flex h-[70vh] min-h-[420px] flex-col items-center justify-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-6 text-center">
      <AlertTriangle className="size-6 text-destructive" />
      <p className="text-sm font-medium">{label('Preview could not be loaded', 'Pratinjau tidak dapat dimuat')}</p>
      <p className="max-w-sm break-words text-xs text-muted-foreground">{errorText}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={retry} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-accent"><RefreshCw className="size-4" />{label('Retry', 'Coba lagi')}</button>
        <a href={'/api/purchase-documents/' + encodeURIComponent(documentId) + '/file?businessId=' + encodeURIComponent(businessId)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-accent"><Download className="size-4" />{label('Open in new tab', 'Buka di tab baru')}</a>
      </div>
    </div>}
    {state === 'ready' && url && (mimeType.startsWith('image/')
      ? <div className="relative space-y-2"><div ref={imageViewportRef} className="relative h-[70vh] min-h-[420px] overflow-hidden rounded-md border bg-muted p-1"><img src={url} alt={fileName} draggable={false} onPointerDown={startPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan} style={{ transform: "translate(" + pan.x + "px, " + pan.y + "px) rotate(" + rotation + "deg) scale(" + (zoomed ? 2 : 1) + ")", transformOrigin: "center center" }} className={"h-full w-full rounded-md object-contain select-none transition-transform duration-150 " + (zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in")} />{zoomed && <button type="button" aria-label={label('Close zoom', 'Tutup perbesaran')} onClick={toggleZoom} className="absolute right-3 top-3 z-10 rounded-full border bg-background/95 p-1.5 text-foreground shadow"><X className="size-4" /></button>}</div><div className="flex flex-wrap items-center justify-end gap-2"><button type="button" onClick={() => setRotation(value => (value + 90) % 360)} aria-label={label('Rotate image 90 degrees', 'Putar gambar 90 derajat')} className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs hover:bg-accent"><RotateCw className="size-3.5" />{label('Rotate 90°', 'Putar 90°')}</button><button type="button" onClick={toggleZoom} aria-label={label('Zoom invoice image', 'Perbesar gambar faktur')} className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs hover:bg-accent"><ZoomIn className="size-3.5" />{zoomed ? label('Close zoom', 'Tutup perbesaran') : label('Click to zoom', 'Klik untuk memperbesar')}</button></div></div>
      : <iframe title={fileName} src={url} className="h-[70vh] min-h-[420px] w-full rounded-md border bg-muted" />)}
    {state === 'ready' && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><FileText className="size-3.5" />{fileName} · {mimeType}</p>}
  </div>
}
