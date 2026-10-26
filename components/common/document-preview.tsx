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
            <article className="print-area mx-auto aspect-[105/148] w-full max-w-[105mm] overflow-hidden bg-white px-4 py-4 text-[9px] leading-tight text-black shadow-sm print:aspect-[105/148] print:h-[148mm] print:w-[105mm] print:max-w-none print:px-[5mm] print:py-[5mm] print:shadow-none">
              <div className="border-t border-black pt-2">
                <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
                  <h1 className="text-[20px] font-black leading-none tracking-tight">INVOICE</h1>
                  <span className="pt-1 text-center text-[9px] whitespace-nowrap">No. Telp: 089677569870</span>
                  <span className="justify-self-end whitespace-nowrap text-[10px]">Page 1 of 1</span>
                </div>
              </div>

              <section className="mt-2 grid grid-cols-2 gap-3 px-1 py-1 text-[10px]">
                <div className="self-center">
                  <p>Yth. Kepada</p>
                  <p className="mt-1 text-[11px] font-medium">{customer?.name ?? '—'}</p>
                  <p className="mt-1 text-[10px]">{customer?.address ?? ''}</p>
                </div>
                <dl className="grid grid-cols-[auto_1fr] content-start gap-x-2 gap-y-1 text-[10px]">
                  <dt>No. Invoice:</dt><dd className="whitespace-nowrap">{order.id}</dd>
                  <dt>Tanggal:</dt><dd className="whitespace-nowrap">{formatDate(order.date)}</dd>
                  <dt>Jatuh Tempo:</dt><dd className="whitespace-nowrap">{order.dueDate ? formatDate(order.dueDate) : '-'}</dd>
                </dl>
              </section>

              <table className="invoice-print-table mt-3 w-full table-fixed border-collapse text-[9px]">
                <colgroup><col className="w-[7%]" /><col className="w-[53%]" /><col className="w-[18%]" /><col className="w-[22%]" /></colgroup>
                <thead>
                  <tr className="border-y-2 border-black text-center text-[10px]">
                    <th className="border-r border-black px-1 py-1 font-medium">QTY</th>
                    <th className="border-r border-black px-1 py-1 font-medium">DESKRIPSI</th>
                    <th className="border-r border-black px-1 py-1 font-medium">HARGA</th>
                    <th className="px-1 py-1 font-medium">JUMLAH</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.max(12, order.items.length) }, (_, index) => {
                    const item = order.items[index]
                    return (
                      <tr key={`${item ? item.productId : "blank"}-${index}`} className="h-[5mm] border-b border-black">
                        <td className="border-r border-black px-1 py-1 text-right">{item ? item.qty : ''}</td>
                        <td className="border-r border-black px-1 py-1">{item ? productNames?.[item.productId] ?? productById(item.productId)?.name ?? item.productId : ''}</td>
                        <td className="border-r border-black px-2 py-1 text-right">{item ? formatIDR(item.price) : ''}</td>
                        <td className="px-2 py-1 text-right">{item ? formatIDR(lineSubtotal(item)) : ''}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <section className="mt-2 grid grid-cols-[1fr_1fr] gap-3">
                <div>
                  <p className="pt-2 text-[10px] font-bold">TOTAL TAGIHAN</p>
                  <div className="mt-1 px-1 py-1 text-center text-[13px] font-bold leading-tight">
                    {formatIDR(total)}
                  </div>
                </div>
                <dl className="space-y-1 text-[10px]">
                  <div className="flex justify-between gap-3"><dt>HARGA :</dt><dd>{formatIDR(order.items.reduce((sum, item) => sum + Number(item.qty) * Number(item.price), 0))}</dd></div>
                  <div className="flex justify-between gap-3"><dt>DISKON :</dt><dd>{formatIDR(order.items.reduce((sum, item) => sum + Number(item.discount ?? 0), 0))}</dd></div>
                  <div className="flex justify-between gap-3"><dt>PAJAK :</dt><dd>{features.tax ? formatIDR(tax) : '-'}</dd></div>
                  <div className="flex justify-between gap-3"><dt>TOTAL :</dt><dd>{formatIDR(total + tax)}</dd></div>
                </dl>
              </section>

              <section className="mt-14 grid grid-cols-2 text-center text-[10px]">
                <div>Tanda Terima</div>
                <div>Hormat Kami</div>
              </section>
              <section className="mt-6 space-y-1 text-[9px]">
                <p>Metode Pembayaran :</p>
                <p>Cash atau Transfer Bank BCA | No. Rekening: 123-456-789</p>
              </section>
            </article>
          ) : (
            <article className="print-area mx-auto aspect-[105/148] w-full max-w-[105mm] overflow-hidden bg-white px-4 py-4 text-[9px] leading-tight text-black shadow-sm print:aspect-[105/148] print:h-[148mm] print:w-[105mm] print:max-w-none print:px-[5mm] print:py-[5mm] print:shadow-none">
              <div className="border-t border-black pt-2">
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-[18px] font-black leading-none tracking-tight">{t('deliveries.document').toUpperCase()}</h1>
                  <span className="text-xs">Page 1 of 1</span>
                </div>
                <div className="mt-2 flex justify-end gap-8 text-xs">
                  <span>Jumlah Koli: {order.items.reduce((sum, item) => sum + Number(item.qty), 0)}</span>
                  <span>Tanggal: <strong>{formatDate(order.delivery?.date ?? order.date)}</strong></span>
                </div>
              </div>

              <section className="mt-3 grid grid-cols-2 gap-4 bg-[#ededed] px-5 py-4 text-xs">
                <div className="self-center">
                  <p>DIKIRIM KEPADA</p>
                  <p className="mt-1 text-sm font-bold">{order.delivery?.recipient ?? customer?.name ?? '—'}</p>
                  <p className="mt-1">{order.delivery?.address ?? customer?.address ?? '—'}</p>
                </div>
                <div className="text-right">
                  <p>No. Surat Jalan: <strong>{docNo}</strong></p>
                  <p className="mt-1">No. Order: <strong>{order.id}</strong></p>
                  <p className="mt-1">Metode: <strong>{order.delivery?.method ?? '—'}</strong></p>
                  <p className="mt-1">Nama sopir: <strong>{order.delivery?.driverName || '—'}</strong></p>
                </div>
              </section>

              <table className="invoice-print-table mt-3 w-full table-fixed border-collapse text-[8px]">
                <colgroup><col className="w-[9%]" /><col className="w-[61%]" /><col className="w-[15%]" /><col className="w-[15%]" /></colgroup>
                <thead>
                  <tr className="border-y-[3px] border-black text-center text-xs">
                    <th className="border-r border-black px-1 py-3 font-bold">NO.</th>
                    <th className="border-r border-black px-1 py-1 text-left font-bold">DESKRIPSI BARANG</th>
                    <th className="border-r border-black px-2 py-3 font-bold">QTY</th>
                    <th className="px-2 py-3 font-bold">SATUAN</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.max(12, order.items.length) }, (_, index) => {
                    const item = order.items[index]
                    return (
                      <tr key={`${item ? item.productId : "blank"}-${index}`} className="h-[26px] border-b border-black">
                        <td className="border-r border-black px-1 py-1 text-center">{item ? index + 1 : ''}</td>
                        <td className="border-r border-black px-1 py-1">{item ? productNames?.[item.productId] ?? productById(item.productId)?.name ?? item.productId : ''}</td>
                        <td className="border-r border-black px-2 py-1 text-right">{item ? item.qty : ''}</td>
                        <td className="px-2 py-1 text-center">{item ? 'Pcs' : ''}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <section className="mt-2 grid grid-cols-2 gap-5 bg-[#ededed] px-4 py-3 text-xs">
                <div><p className="font-bold">CATATAN</p><p className="mt-1">{order.notes || 'Barang diterima dalam kondisi baik.'}</p></div>
                <div className="space-y-1 text-right"><p><strong>Total jenis barang:</strong> {order.items.length}</p><p><strong>Total kuantitas:</strong> {order.items.reduce((sum, item) => sum + Number(item.qty), 0)}</p><p><strong>Biaya transportasi:</strong> {formatIDR(Number(order.delivery?.transportCost ?? 0))}</p></div>
              </section>

              <section className="mt-5 grid grid-cols-2 gap-4 text-center text-[8px]">
                <div><p>Dikirim oleh</p><p className="text-[10px]">(Nama / tanda tangan)</p><div className="mt-5 border-b border-black" /><p className="mt-1">{order.delivery?.driverName || 'Nama sopir:'}</p></div>
                <div><p>Diterima oleh</p><p className="text-[10px]">(Nama / tanda tangan)</p><div className="mt-7 border-b border-black" /><p className="mt-2">{order.delivery?.recipient ?? customer?.name ?? 'Nama jelas:'}</p></div>
              </section>
              <p className="mt-3 border-t border-dashed border-gray-400 pt-1 text-center text-[7px] text-gray-600">Mohon periksa jumlah dan kondisi barang sebelum menandatangani surat jalan.</p>
            </article>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
