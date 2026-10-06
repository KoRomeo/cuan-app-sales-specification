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
}: {
  order: Order
  kind: 'invoice' | 'delivery'
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t, features } = useApp()
  const customer = customerById(order.customerId)
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

        <div className="p-4 md:p-6">
          <article className="rounded-lg bg-white p-6 text-slate-900 shadow-sm ring-1 ring-slate-200 md:p-8">
            <div className="flex flex-col justify-between gap-6 sm:flex-row">
              <div>
                <p className="text-base font-semibold">CV Cuan Sejahtera</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Jl. Pasirkaliki No. 45, Bandung
                  <br />
                  0812-0000-1234
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-xl font-bold tracking-[0.2em] text-[oklch(0.5_0.2_264)]">
                  {isInvoice ? t('invoices.document') : t('deliveries.document')}
                </p>
                <p className="mt-1 font-mono text-xs text-slate-500">{docNo}</p>
                <p className="font-mono text-xs text-slate-500">
                  {formatDate(isInvoice ? order.date : (order.delivery?.date ?? order.date))}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 rounded-md bg-slate-50 p-4 text-xs sm:grid-cols-2">
              <div>
                <p className="font-semibold uppercase tracking-wider text-slate-400">
                  {isInvoice ? t('invoices.billTo') : t('orders.recipient')}
                </p>
                <p className="mt-1 text-sm font-medium">{isInvoice ? customer?.name : (order.delivery?.recipient ?? customer?.name)}</p>
                <p className="mt-0.5 text-slate-500">{isInvoice ? customer?.address : (order.delivery?.address ?? customer?.address)}</p>
              </div>
              <div className="sm:text-right">
                <p className="font-semibold uppercase tracking-wider text-slate-400">{t('orders.id')}</p>
                <p className="mt-1 font-mono text-sm">{order.id}</p>
                {isInvoice && order.dueDate && (
                  <p className="mt-0.5 text-slate-500">
                    {t('common.dueDate')}: {formatDate(order.dueDate)}
                  </p>
                )}
              </div>
            </div>

            <table className="mt-6 w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-left uppercase tracking-wider text-slate-400">
                  <th className="py-2 font-semibold">{t('common.product')}</th>
                  <th className="py-2 text-right font-semibold">{t('common.qty')}</th>
                  {isInvoice && <th className="py-2 text-right font-semibold">{t('orders.sellingPrice')}</th>}
                  {isInvoice && <th className="py-2 text-right font-semibold">{t('orders.subtotal')}</th>}
                </tr>
              </thead>
              <tbody>
                {order.items.map((it) => (
                  <tr key={it.productId} className="border-b border-slate-100">
                    <td className="py-2.5">{productById(it.productId)?.name}</td>
                    <td className="py-2.5 text-right font-mono">{it.qty}</td>
                    {isInvoice && <td className="py-2.5 text-right font-mono">{formatIDR(it.price)}</td>}
                    {isInvoice && <td className="py-2.5 text-right font-mono">{formatIDR(lineSubtotal(it))}</td>}
                  </tr>
                ))}
              </tbody>
            </table>

            {isInvoice ? (
              <dl className="ml-auto mt-4 w-full max-w-60 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <dt className="text-slate-500">{t('orders.subtotal')}</dt>
                  <dd className="font-mono">{formatIDR(total)}</dd>
                </div>
                {features.tax && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">{t('invoices.tax')} 11%</dt>
                    <dd className="font-mono">{formatIDR(tax)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-semibold">
                  <dt>{t('common.total')}</dt>
                  <dd className="font-mono">{formatIDR(total + tax)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">{t('common.paid')}</dt>
                  <dd className="font-mono">{formatIDR(paid)}</dd>
                </div>
                <div className="flex justify-between font-semibold text-[oklch(0.5_0.2_264)]">
                  <dt>{t('common.outstanding')}</dt>
                  <dd className="font-mono">{formatIDR(Math.max(total + tax - paid, 0))}</dd>
                </div>
              </dl>
            ) : (
              <div className="mt-10 grid grid-cols-2 gap-8 text-center text-xs text-slate-500">
                <div>
                  <div className="h-16 border-b border-dashed border-slate-300" />
                  <p className="mt-2">Pengirim</p>
                </div>
                <div>
                  <div className="h-16 border-b border-dashed border-slate-300" />
                  <p className="mt-2">Penerima</p>
                </div>
              </div>
            )}
          </article>
        </div>
      </DialogContent>
    </Dialog>
  )
}
