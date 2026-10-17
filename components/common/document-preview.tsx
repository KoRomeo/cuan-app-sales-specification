'use client'

import { Printer } from 'lucide-react'
import { useApp } from '@/components/providers'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { customerById, lineSubtotal, type Order, orderPaid, orderTotal, productById } from '@/lib/data'
import { formatDate, formatIDR } from '@/lib/format'

export function DocumentPreview({
  order,
  kind,
  open,
  onOpenChange,
  customerOverride,
  productNames,
}: {
  order: Order
  kind: 'invoice' | 'delivery'
  open: boolean
  onOpenChange: (open: boolean) => void
  customerOverride?: { id: string; name: string; address?: string | null } | null
  productNames?: Record<string, string>
}) {
  const { t, features } = useApp()
  const customer = customerOverride ?? customerById(order.customerId)
  const total = orderTotal(order)
  const paid = orderPaid(order)
  const isInvoice = kind === 'invoice'
  const docNo = isInvoice ? order.id : (order.delivery?.id ?? '—')
  const tax = features.tax ? Math.round(total * 0.11) : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto p-0 sm:max-w-2xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div>
            <DialogTitle className="text-sm">{isInvoice ? t('orders.viewInvoice') : t('orders.suratJalan')}</DialogTitle>
            <DialogDescription className="font-mono text-xs">{docNo}</DialogDescription>
          </div>
          <Button size="sm" variant="outline" className="mr-8" onClick={() => window.print()}>
            <Printer />
            {t('common.print')}
          </Button>
        </div>

        <div className="p-4 md:p-6 print:p-0">
          {isInvoice ? (
            <article className="print-area mx-auto min-h-[10.5in] w-full max-w-[7.3in] bg-white px-5 py-6 text-[11px] leading-snug text-black shadow-sm md:px-8 md:py-8 print:min-h-0 print:max-w-none print:px-0 print:py-0 print:shadow-none">
              <div className="border-t border-black pt-2">
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-[34px] font-black leading-none tracking-tight">INVOICE</h1>
                  <span className="text-xs">Page 1 of 1</span>
                </div>
                <div className="mt-[-2px] flex justify-end gap-8 text-xs">
                  <span>Jumlah Koli : {order.items.reduce((sum, item) => sum + Number(item.qty), 0)}</span>
                  <span>No. Telp: 089677569870</span>
                </div>
              </div>

              <section className="mt-1 grid grid-cols-2 gap-4 bg-[#ededed] px-6 py-5 text-xs">
                <div className="self-center">
                  <p>Yth. Kepada</p>
                  <p className="mt-1 text-sm font-bold">{customer?.name ?? '—'}</p>
                  <p className="mt-1 text-sm font-bold">{customer?.address ?? ''}</p>
                </div>
                <div className="text-right">
                  <p>No. Invoice: <strong>{order.id}</strong></p>
                  <p className="mt-1">Tanggal: <strong>{formatDate(order.date)}</strong></p>
                  <p className="mt-1">Jatuh Tempo: <strong>{order.dueDate ? formatDate(order.dueDate) : '-'}</strong></p>
                </div>
              </section>

              <table className="mt-10 w-full table-fixed border-collapse text-xs">
                <colgroup><col className="w-[7%]" /><col className="w-[53%]" /><col className="w-[18%]" /><col className="w-[22%]" /></colgroup>
                <thead>
                  <tr className="border-y-[3px] border-black text-center text-sm">
                    <th className="border-r border-black px-1 py-3 font-bold">QTY</th>
                    <th className="border-r border-black px-2 py-3 font-bold">DESKRIPSI</th>
                    <th className="border-r border-black px-2 py-3 font-bold">HARGA</th>
                    <th className="px-2 py-3 font-bold">JUMLAH</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.max(12, order.items.length) }, (_, index) => {
                    const item = order.items[index]
                    return (
                      <tr key={item ? item.productId : `blank-${index}`} className="h-[26px] border-b border-black">
                        <td className="border-r border-black px-1 py-1 text-right">{item ? item.qty : ''}</td>
                        <td className="border-r border-black px-1 py-1">{item ? productNames?.[item.productId] ?? productById(item.productId)?.name ?? item.productId : ''}</td>
                        <td className="border-r border-black px-2 py-1 text-right">{item ? formatIDR(item.price) : ''}</td>
                        <td className="px-2 py-1 text-right">{item ? formatIDR(lineSubtotal(item)) : ''}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <section className="mt-1 grid grid-cols-[1fr_1fr] gap-5">
                <div>
                  <p className="pt-7 text-xs font-bold">TOTAL TAGIHAN</p>
                  <div className="mt-1 bg-[repeating-linear-gradient(135deg,#e5e5e5_0px,#e5e5e5_1px,#fff_1px,#fff_3px)] px-2 py-2 text-center text-[28px] font-black leading-none">
                    {formatIDR(total)}
                  </div>
                </div>
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between gap-3"><dt className="font-bold">HARGA :</dt><dd>{formatIDR(order.items.reduce((sum, item) => sum + Number(item.qty) * Number(item.price), 0))}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="font-bold">DISKON :</dt><dd>{formatIDR(order.items.reduce((sum, item) => sum + Number(item.discount ?? 0), 0))}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="font-bold">PAJAK :</dt><dd>{features.tax ? formatIDR(tax) : '-'}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="font-bold">TOTAL :</dt><dd className="font-bold">{formatIDR(total + tax)}</dd></div>
                </dl>
              </section>

              <section className="mt-12 grid grid-cols-2 text-center text-xs">
                <div>Tanda Terima</div>
                <div>Hormat Kami</div>
              </section>
              <section className="mt-20 space-y-1 text-xs">
                <p>Metode Pembayaran :</p>
                <p>Cash atau Transfer Bank BCA | No. Rekening: 123-456-789</p>
                <p className="pt-4">Catatan: {order.notes || ''}</p>
              </section>
            </article>
          ) : (
            <article className="rounded-md bg-white p-6 text-slate-900 shadow-sm ring-1 ring-slate-200 md:p-8">
              <div className="flex flex-col justify-between gap-6 sm:flex-row">
                <div>
                  <p className="text-base font-semibold">CV Cuan Sejahtera</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">Jl. Pasirkaliki No. 45, Bandung<br />0812-0000-1234</p>
                </div>
                <div className="sm:text-right">
                  <p className="text-xl font-bold tracking-[0.2em] text-[oklch(0.5_0.2_264)]">{t('deliveries.document')}</p>
                  <p className="mt-1 font-mono text-xs text-slate-500">{docNo}</p>
                  <p className="font-mono text-xs text-slate-500">{formatDate(order.delivery?.date ?? order.date)}</p>
                </div>
              </div>
              <div className="mt-6 grid gap-4 rounded-md bg-slate-50 p-4 text-xs sm:grid-cols-2">
                <div><p className="font-semibold uppercase tracking-wider text-slate-400">{t('orders.recipient')}</p><p className="mt-1 text-sm font-medium">{order.delivery?.recipient ?? customer?.name}</p><p className="mt-0.5 text-slate-500">{order.delivery?.address ?? customer?.address}</p></div>
                <div className="sm:text-right"><p className="font-semibold uppercase tracking-wider text-slate-400">{t('orders.id')}</p><p className="mt-1 font-mono text-sm">{order.id}</p></div>
              </div>
              <table className="mt-6 w-full text-xs">
                <thead><tr className="border-b border-slate-200 text-left uppercase tracking-wider text-slate-400"><th className="py-2 font-semibold">{t('common.product')}</th><th className="py-2 text-right font-semibold">{t('common.qty')}</th></tr></thead>
                <tbody>{order.items.map((it) => <tr key={it.productId} className="border-b border-slate-100"><td className="py-2.5">{productNames?.[it.productId] ?? productById(it.productId)?.name}</td><td className="py-2.5 text-right font-mono">{it.qty}</td></tr>)}</tbody>
              </table>
              <div className="mt-10 grid grid-cols-2 gap-8 text-center text-xs text-slate-500"><div><div className="h-16 border-b border-dashed border-slate-300" /><p className="mt-2">Pengirim</p></div><div><div className="h-16 border-b border-dashed border-slate-300" /><p className="mt-2">Penerima</p></div></div>
            </article>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
