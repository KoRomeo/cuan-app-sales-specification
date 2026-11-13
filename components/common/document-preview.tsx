'use client'

import { useEffect, useState } from 'react'
import { Printer } from 'lucide-react'
import { useApp } from '@/components/providers'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { customerById, lineSubtotal, type Order, orderPaid, orderTotal, productById } from '@/lib/data'
import { formatDate, formatIDR } from '@/lib/format'
import { ContinuousInvoice } from '@/components/common/continuous-invoice'
import { PrintRoot } from '@/components/common/print-root'

type PaperSize = 'A6' | 'A4' | 'NCR'

export function DocumentPreview({
  order,
  kind,
  open,
  onOpenChange,
  customerOverride,
  productNames,
  bankAccounts = [],
}: {
  order: Order
  kind: 'invoice' | 'delivery'
  open: boolean
  onOpenChange: (open: boolean) => void
  customerOverride?: { id: string; name: string; address?: string | null } | null
  productNames?: Record<string, string>
  bankAccounts?: Array<{ name: string; accountNumber: string | null }>
}) {
  const { t, features } = useApp()
  const [paperSize, setPaperSize] = useState<PaperSize>(() => {
    if (typeof window === 'undefined') return 'A6'
    const saved = window.localStorage.getItem('cuanapp.document-paper-size')
    return saved === 'A4' || saved === 'NCR' || saved === 'A6' ? saved : 'A6'
  })
  useEffect(() => {
    window.localStorage.setItem('cuanapp.document-paper-size', paperSize)
  }, [paperSize])
  const customer = customerOverride ?? customerById(order.customerId)
  const total = orderTotal(order)
  const paid = orderPaid(order)
  const isInvoice = kind === 'invoice'
  const docNo = isInvoice ? order.id : (order.delivery?.id ?? '—')
  const tax = features.tax ? Math.round(total * 0.11) : 0
  const rows = Math.max(paperSize === 'A4' ? 15 : paperSize === 'A6' ? 6 : 8, order.items.length)
  const paperClass = paperSize === 'NCR' ? `document-ncr${order.items.length > 10 ? ' document-ncr-expanded' : ''}` : paperSize === 'A4' ? 'document-a4' : 'document-a6'
  const heading = isInvoice ? 'FAKTUR / INVOICE' : 'SURAT JALAN'
  const paperWidth = paperSize === 'NCR' ? '9.5in' : paperSize === 'A4' ? '210mm' : '105mm'
  const pageSize = paperSize === 'NCR' ? '9.5in 5.5in' : paperSize === 'A4' ? '210mm 297mm' : '105mm 148mm'
  const dialogMaxWidth = `min(calc(100vw - 2rem), calc(${paperWidth} + 3rem))`

  const paper = (
    <article className={`print-area ${paperClass} mx-auto bg-white text-black`}>
        {paperSize === 'NCR' ? (
          <>

            {isInvoice ? <ContinuousInvoice order={order} customer={customer} productNames={productNames} /> : <article className={`continuous-delivery ${order.items.length > 10 ? 'continuous-delivery-expanded' : ''}`} style={{ '--delivery-height': `${5.5 + Math.max(0, order.items.length - 10) * 0.25}in` } as React.CSSProperties}><header><strong>No. Surat Jalan: {docNo}</strong><h1>SURAT JALAN</h1><p>Pontianak, {formatDate(order.delivery?.date ?? order.date)}</p><p>Kepada: {order.delivery?.recipient || customer?.name || '—'}</p><p>{order.delivery?.address || customer?.address || '—'}</p></header><table><thead><tr><th>No</th><th>Nama Barang</th><th>Kuantitas</th><th>Satuan</th></tr></thead><tbody>{order.items.map((item,index)=><tr key={`${item.productId}-${index}`}><td>{index+1}</td><td>{productNames?.[item.productId] ?? productById(item.productId)?.name ?? item.productId}</td><td>{item.qty}</td><td>—</td></tr>)}</tbody></table><footer><div>Tanda Terima,<div className="continuous-delivery-signature"/></div><div>Mohon periksa jumlah dan kondisi barang saat diterima.</div><div>Hormat kami,<div className="continuous-delivery-signature"/></div></footer></article>}
          </>
        ) : (
          <>
        <header className="grid grid-cols-[1fr_auto] items-start gap-4 border-b-2 border-black pb-3">
          <div>
            <p className="text-[8pt] font-semibold uppercase tracking-[0.2em]">Dokumen transaksi</p>
            <h1 className="mt-1 text-[19pt] font-black leading-none tracking-tight">{heading}</h1>
            <p className="mt-2 text-[8pt]">Nomor: <strong className="font-mono">{docNo}</strong></p>
          </div>
          <div className="text-right text-[8pt]">
            <p className="font-semibold">Pontianak, {formatDate(isInvoice ? order.date : (order.delivery?.date ?? order.date))}</p>
            <p className="mt-2 font-semibold">{isInvoice ? 'Kepada Yth.' : 'Dikirim kepada,'}</p>
            <p className="mt-0.5 text-[10pt] font-bold">{order.delivery?.recipient || customer?.name || '—'}</p>
            <p className="mt-0.5 max-w-[65mm]">{order.delivery?.address || customer?.address || '—'}</p>
          </div>
        </header>

        <section className="mt-3 grid grid-cols-3 gap-3 border-b border-black pb-3 text-[8pt]">
          <div><p className="text-[7pt] text-neutral-500">JATUH TEMPO</p><p className="mt-0.5 font-semibold">{order.dueDate ? formatDate(order.dueDate) : '—'}</p></div>
          <div><p className="text-[7pt] text-neutral-500">SALESMAN</p><p className="mt-0.5 font-semibold">—</p></div>
          <div><p className="text-[7pt] text-neutral-500">{isInvoice ? 'TANGGAL FAKTUR' : 'NO. PESANAN'}</p><p className="mt-0.5 font-semibold">{isInvoice ? formatDate(order.date) : order.id}</p></div>
        </section>

        <table className="invoice-print-table mt-3 w-full table-fixed border-collapse text-[7.5pt]">
          {isInvoice ? (
            <colgroup><col className="w-[6%]" /><col className="w-[39%]" /><col className="w-[13%]" /><col className="w-[15%]" /><col className="w-[12%]" /><col className="w-[15%]" /></colgroup>
          ) : (
            <colgroup><col className="w-[7%]" /><col className="w-[65%]" /><col className="w-[14%]" /><col className="w-[14%]" /></colgroup>
          )}
          <thead>
            {isInvoice ? (
              <tr className="border-y-2 border-black text-center font-bold">
                <th className="py-2">No</th><th className="px-1 py-2 text-left">Nama Barang</th><th className="py-2">Kuantitas</th><th className="py-2 text-right">Harga</th><th className="py-2 text-right">Diskon</th><th className="py-2 text-right">Jumlah</th>
              </tr>
            ) : (
              <tr className="border-y-2 border-black text-center font-bold">
                <th className="py-2">No</th><th className="px-1 py-2 text-left">Nama Barang</th><th className="py-2">Kuantitas</th><th className="py-2">Satuan</th>
              </tr>
            )}
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, index) => {
              const item = order.items[index]
              const productName = item ? productNames?.[item.productId] ?? productById(item.productId)?.name ?? item.productId : ''
              const discount = item ? Number(item.discount ?? 0) : 0
              return (
                <tr key={`${item?.productId ?? 'blank'}-${index}`} className="h-[7mm] border-b border-neutral-400">
                  <td className="px-1 py-1 text-center">{item ? index + 1 : ''}</td>
                  <td className="px-1 py-1">{productName}</td>
                  <td className="px-1 py-1 text-center tabular-nums">{item ? item.qty : ''}</td>
                  {isInvoice ? (
                    <>
                      <td className="px-1 py-1 text-right tabular-nums">{item ? formatIDR(item.price) : ''}</td>
                      <td className="px-1 py-1 text-right tabular-nums">{item ? (item.discountType === 'percent' ? `${discount}%` : discount ? formatIDR(discount) : '—') : ''}</td>
                      <td className="px-1 py-1 text-right tabular-nums">{item ? formatIDR(lineSubtotal(item)) : ''}</td>
                    </>
                  ) : <td className="px-1 py-1 text-center">{item ? '—' : ''}</td>}
                </tr>
              )
            })}
          </tbody>
        </table>

        {isInvoice ? (
          <section className="mt-3 grid grid-cols-[1fr_0.9fr] gap-5">
            <div className="space-y-2 text-[7.5pt]">
              <p className="font-semibold">METODE PEMBAYARAN</p>
              <p>Tunai atau transfer bank</p>
              {bankAccounts.length ? bankAccounts.map((account) => <p key={account.name}>{account.name} · {account.accountNumber}</p>) : <p>Konfirmasi rekening kepada pihak penjual.</p>}
              <p className="pt-2">Terbilang: __________________________________</p>
            </div>
            <dl className="space-y-1.5 text-[8pt]">
              <div className="flex justify-between gap-2"><dt>Subtotal</dt><dd className="tabular-nums">{formatIDR(order.items.reduce((sum, item) => sum + Number(item.qty) * Number(item.price), 0))}</dd></div>
              <div className="flex justify-between gap-2"><dt>Diskon</dt><dd className="tabular-nums">{formatIDR(order.items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.price) - lineSubtotal(item)), 0))}</dd></div>
              <div className="flex justify-between gap-2"><dt>Pajak</dt><dd className="tabular-nums">{features.tax ? formatIDR(tax) : '—'}</dd></div>
              <div className="flex justify-between gap-2 border-y-2 border-black py-2 text-[11pt] font-black"><dt>TOTAL</dt><dd className="tabular-nums">{formatIDR(total + tax)}</dd></div>
              <div className="flex justify-between gap-2"><dt>Sudah dibayar</dt><dd className="tabular-nums">{formatIDR(paid)}</dd></div>
              <div className="flex justify-between gap-2 font-bold"><dt>Sisa tagihan</dt><dd className="tabular-nums">{formatIDR(Math.max(0, total + tax - paid))}</dd></div>
            </dl>
          </section>
        ) : (
          <section className="mt-3 grid grid-cols-[1fr_1fr] gap-4 text-[8pt]">
            <div><p className="font-semibold">CATATAN</p><p className="mt-1 min-h-8">{order.notes || 'Barang diterima dalam kondisi baik.'}</p></div>
            <div className="space-y-1"><p className="flex justify-between"><span>Jumlah jenis barang</span><strong>{order.items.length}</strong></p><p className="flex justify-between"><span>Total kuantitas</span><strong>{order.items.reduce((sum, item) => sum + Number(item.qty), 0)}</strong></p><p className="flex justify-between"><span>No. Pesanan</span><strong className="font-mono">{order.id}</strong></p></div>
          </section>
        )}

        <footer className="mt-8 grid grid-cols-3 gap-3 text-center text-[8pt]">
          <div><p>Tanda Terima,</p><div className="mt-14 border-b border-black" /><p className="mt-1">Penerima</p></div>
          <div className="self-end px-1 pb-2 text-[7pt]"><div className="border border-black p-2">Barang yang sudah diterima agar diperiksa sebelum menandatangani dokumen.</div></div>
          <div><p>Hormat kami,</p><div className="mt-14 border-b border-black" /><p className="mt-1">Pengirim</p></div>
        </footer>
        <p className="mt-4 border-t border-black pt-2 text-center text-[7pt] tracking-wide">{isInvoice ? 'Terima kasih atas kepercayaan Anda.' : 'Mohon periksa jumlah dan kondisi barang saat diterima.'}</p>
                    </>
        )}

    </article>
  )

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-h-[94dvh] overflow-y-auto p-0 print:hidden"
          style={{ maxWidth: dialogMaxWidth }}
        >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3 print:hidden">
        <div>
          <DialogTitle className="text-sm">{isInvoice ? t('orders.viewInvoice') : t('orders.suratJalan')}</DialogTitle>
          <DialogDescription className="font-mono text-xs">{docNo}</DialogDescription>
        </div>
        <div className="mr-8 flex items-center gap-2">
          <label htmlFor="document-paper-size" className="text-xs font-medium text-muted-foreground">Ukuran kertas</label>
          <select id="document-paper-size" value={paperSize} onChange={(event) => setPaperSize(event.target.value as PaperSize)} className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="A6">A6 · 105 × 148 mm</option>
            <option value="A4">A4 · 210 × 297 mm</option>
            <option value="NCR">Continuous Form NCR · 9.5 × 5.5 in</option>
          </select>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer />
            {t('common.print')}
          </Button>
        </div>
      </div>

          <div className="overflow-auto bg-muted/30 p-4 md:p-6">{paper}</div>
        </DialogContent>
      </Dialog>
      <PrintRoot>{<style>{`@page { size: ${pageSize}; margin: 0; }`}</style>}{paper}</PrintRoot>
    </>
  )
}
