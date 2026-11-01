'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowLeft, Ban, FileText, History, Pencil, Plus, Printer, RotateCcw, Trash2, Truck, User, Wallet } from 'lucide-react'
import { useState } from 'react'
import useSWR from 'swr'
import { appToast as toast } from '@/lib/toast'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { DocumentPreview } from '@/components/common/document-preview'
import { FormDialog } from '@/components/common/form-dialog'
import { PageHeader } from '@/components/common/page-header'
import { DetailRow, SectionCard } from '@/components/common/section-card'
import { OrderStatusBadge, PaymentStatusBadge, Pill } from '@/components/common/status-badge'
import { useApp } from '@/components/providers'
import { Button } from '@/components/ui/button'
import {
  discountAmount,
  lineSubtotal,
  type Order,
  orderCogs,
  orderOutstanding,
  orderPaid,
  orderPaymentStatus,
  orderTotal,
  TODAY,
} from '@/lib/data'
import { formatDate, formatIDR, formatPercent } from '@/lib/format'
import { translateAccountName } from '@/lib/i18n'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const body = await response.text()
  let result: any = null
  if (body) {
    try { result = JSON.parse(body) } catch { result = null }
  }
  if (!response.ok) throw new Error(result?.error ?? `Request failed (${response.status}). Please try again.`)
  if (result === null) throw new Error('The server returned an invalid response. Please try again.')
  return result
}
type DetailResponse = {
  id: string; date: string; createdAt: string; customerId: string; status: Order['status']; dueDate: string | null; notes: string | null
  customer: { id: string; name: string; phone: string | null; address: string | null } | null
  items: Array<{ id: string; productId: string; qty: number; price: string | number; discount: string | number; discountType?: 'amount' | 'percent'; unitCost: string | number }>
  products: Array<{ id: string; name: string; averageCost: string | number; stock: string | number }>
  payments: Array<{ id: string; date: string; amount: string | number; account: string }>
  delivery: Order['delivery']; replacements: Array<{ id: string; orderId?: string; date: string; productId: string; qty: number; reason: string; delivered: boolean; cost?: string | number }>
  returns: Array<{ id: string; date: string; total: string | number; refundAmount: string | number; replacementCost?: string | number; stockReturned: boolean; notes: string | null; items: Array<{ productId: string; qty: number; price: string | number }> }>
}

export function OrderDetailView({ orderId }: { orderId: string }) {
  const { t, features, locale } = useApp()
  const { data, error, mutate } = useSWR<DetailResponse>(`/api/orders/${encodeURIComponent(orderId)}`, fetcher)
  const { data: business } = useSWR<{ id: string }>('/api/businesses/current', fetcher)
  const { data: financialAccounts } = useSWR<Array<{ id: string; name: string; active: boolean; type: 'cash' | 'bank'; accountNumber: string | null }>>(business?.id ? `/api/financial-accounts?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const [doc, setDoc] = useState<'invoice' | 'delivery' | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [deliveryOpen, setDeliveryOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deliverySaving, setDeliverySaving] = useState(false)

  if (error) return <div role="alert" className="flex flex-col gap-3"><p className="text-sm text-destructive">{error.message}</p><Button variant="outline" size="sm" onClick={() => mutate()}>{t('common.retry')}</Button></div>
  if (!data) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  const productById = new Map(data.products.map((product) => [product.id, { ...product, averageCost: Number(product.averageCost), stock: Number(product.stock) }]))
  const order: Order = { ...data, notes: data.notes ?? '', items: data.items.map((item) => ({ ...item, price: Number(item.price), discount: Number(item.discount), discountType: item.discountType ?? 'amount', unitCost: Number(item.unitCost) })), payments: data.payments.map((payment) => ({ ...payment, amount: Number(payment.amount) })), delivery: data.delivery }
  const customer = data.customer
  const replacements = data.replacements
  const linkedReturns = data.returns ?? []
  const returnedQtyByProduct = new Map<string, number>()
  for (const ret of linkedReturns) for (const item of ret.items) returnedQtyByProduct.set(item.productId, (returnedQtyByProduct.get(item.productId) ?? 0) + Number(item.qty))
  const totalSoldQty = order.items.reduce((sum, item) => sum + Number(item.qty), 0)
  const totalReturnedQty = [...returnedQtyByProduct.values()].reduce((sum, qty) => sum + qty, 0)
  const returnStatus = totalReturnedQty <= 0 ? null : totalReturnedQty >= totalSoldQty ? 'full' : 'partial'
  const total = orderTotal(order)
  const paid = orderPaid(order)
  const outstanding = orderOutstanding(order)
  const cogs = orderCogs(order)
  const refundTotal = linkedReturns.reduce((sum, ret) => sum + Number(ret.refundAmount), 0)
  const returnedCogs = linkedReturns.filter((ret) => ret.stockReturned).reduce((sum, ret) => sum + ret.items.reduce((itemSum, returnedItem) => {
    const original = order.items.find((item) => item.productId === returnedItem.productId)
    return itemSum + Number(returnedItem.qty) * Number(original?.unitCost ?? 0)
  }, 0), 0)
  const netRevenue = Math.max(0, total - refundTotal)
  const netCogs = Math.max(0, cogs - returnedCogs)
  const replacementCostTotal = replacements.reduce((sum, replacement) => sum + Number(replacement.cost ?? 0), 0) + linkedReturns.reduce((sum, ret) => sum + Number(ret.replacementCost ?? 0), 0)
  const transport = order.delivery?.transportCost ?? 0
  const profit = netRevenue - netCogs - replacementCostTotal - transport
  const cancelled = order.status === 'cancelled'
  const pendingReplacements = replacements.filter((r) => r.orderId === order.id && !r.delivered)
  const negativeItems = cancelled
    ? []
    : order.items.map((it) => productById.get(it.productId)!).filter((p) => p && p.stock < 0)

  const methodOptions = [
    ...(features.ownDelivery ? [{ value: 'own', label: t('method.own') }] : []),
    ...(features.expedition ? [{ value: 'expedition', label: t('method.expedition') }] : []),
    { value: 'pickup', label: t('method.pickup') },
  ]

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: t('nav.sales') }, { label: t('nav.orders'), href: '/orders' }, { label: order.id }]}
        title={<span className="font-mono">{order.id}</span>}
        meta={
          <>
            <OrderStatusBadge status={order.status} />
            {returnStatus === 'partial' && <Pill tone="warning">{t('orders.returnStatusPartial')}</Pill>}
            {returnStatus === 'full' && <Pill tone="destructive">{t('orders.returnStatusFull')}</Pill>}
            {!cancelled && <PaymentStatusBadge status={orderPaymentStatus(order)} />}
            {pendingReplacements.length > 0 && <Pill tone="warning">{t('orders.replacementOutstanding')}</Pill>}
          </>
        }
        actions={
          <>
            {linkedReturns.length > 0 && <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/returns/${encodeURIComponent(linkedReturns[0].id)}`} />}><RotateCcw />{t('orders.viewReturn')} ({linkedReturns.length})</Button>}
            <Button variant="outline" size="sm" onClick={() => setDoc('invoice')}>
              <FileText />
              {t('orders.viewInvoice')}
            </Button>
            {order.delivery && (
              <Button variant="outline" size="sm" onClick={() => setDoc('delivery')}>
                <Printer />
                {t('orders.suratJalan')}
              </Button>
            )}
            {!cancelled && (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil />
                  {t('common.edit')}
                </Button>
                <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/orders" />}>
                  <ArrowLeft />
                  Back to orders
                </Button>
                <Button variant="outline" size="sm" className="text-destructive hover:bg-pink-100 hover:text-red-700 dark:hover:bg-red-950/40" disabled={paid > 0 || order.status !== 'requested'} onClick={() => setDeleteOpen(true)}>
                  <Trash2 />
                  Delete order
                </Button>
              </>
            )}
          </>
        }
      />

      {negativeItems.length > 0 && (
        <div role="alert" className="mb-4 flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/8 p-4 sm:flex-row sm:items-center">
          <AlertTriangle className="size-5 shrink-0 text-destructive" />
          <div className="flex-1 text-sm">
            {negativeItems.map((p, index) => (
              <p key={`${p.id}-${index}`}>{t('orders.negativeWarning', { product: p.name, stock: p.stock })}</p>
            ))}
          </div>
          {features.purchasing && (
            <Button size="sm" nativeButton={false} render={<Link href="/purchases" />}>
              <Plus />
              {t('orders.createPurchase')}
            </Button>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <SectionCard title={t('orders.orderItems')} bodyClassName="p-0 md:p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <th scope="col" className="h-10 w-[42%] px-4 text-left font-medium md:px-5">{t('common.product')}</th>
                    <th scope="col" className="h-10 px-4 text-right font-medium">{t('common.qty')}</th>
                    <th scope="col" className="h-10 px-4 text-right font-medium">{t('orders.sellingPrice')}</th>
                    <th scope="col" className="h-10 px-4 text-right font-medium">{t('orders.discount')}</th>
                    <th scope="col" className="h-10 px-4 text-right font-medium md:px-5">{t('orders.subtotal')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {order.items.map((it, index) => {
                    const p = productById.get(it.productId)
                    return (
                      <tr key={`${it.productId}-${index}`}>
                        <td className="w-[42%] px-4 py-3 md:px-5">
                          <p className="truncate font-medium" title={p?.name}>{p?.name}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">{p?.id} · {t('orders.cogs')} {formatIDR(it.unitCost)}</p>
                          <p className={`mt-1 text-xs ${p && p.stock < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>Stock before order: {p ? p.stock + Number(it.qty) : '—'} · After order: {p ? p.stock : '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{it.qty}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{formatIDR(it.price)}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">{it.discount ? (it.discountType === 'percent' ? `${it.discount}% · ${formatIDR(discountAmount(it.qty * it.price, it.discount, 'percent'))}` : formatIDR(it.discount)) : '—'}</td>
                        <td className="px-4 py-3 text-right font-mono font-medium tabular-nums md:px-5">{formatIDR(lineSubtotal(it))}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30">
                    <td colSpan={4} className="px-4 py-3 text-right text-sm font-medium md:px-5">{t('common.total')}</td>
                    <td className="px-4 py-3 text-right font-mono text-base font-semibold tabular-nums md:px-5">{formatIDR(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </SectionCard>

          {linkedReturns.length > 0 && (
            <SectionCard title={t('orders.returns')} bodyClassName="p-0 md:p-0">
              <ul className="divide-y">
                {linkedReturns.map((ret) => (
                  <li key={ret.id} className="flex flex-col gap-3 px-4 py-3 md:px-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <Link href={`/returns/${encodeURIComponent(ret.id)}`} className="font-mono text-sm font-medium text-primary hover:underline">{ret.id}</Link>
                      <p className="text-xs text-muted-foreground">{formatDate(ret.date)} · {ret.items.reduce((sum, item) => sum + Number(item.qty), 0)} {t('common.qty')}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{ret.items.map((item) => `${productById.get(item.productId)?.name ?? item.productId} × ${item.qty}`).join(', ')}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-right">
                        <p className="font-mono text-sm">{t('returns.returnTotal')}: {formatIDR(Number(ret.total))}</p>
                        {Number(ret.refundAmount) > 0 && <p className="font-mono text-xs text-destructive">-{formatIDR(Number(ret.refundAmount))} {t('returns.refunded')}</p>}
                        {Number(ret.replacementCost ?? 0) > 0 && <p className="font-mono text-xs text-destructive">-{formatIDR(Number(ret.replacementCost))} {t('orders.replacementCost')}</p>}
                      </div>
                      <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/returns/${encodeURIComponent(ret.id)}`} />}>{t('orders.viewReturn')}</Button>
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          <SectionCard
            title={t('orders.payments')}
            action={
              !cancelled && outstanding > 0 ? (
                <Button size="sm" onClick={() => setPayOpen(true)}>
                  <Wallet />
                  {t('orders.addPayment')}
                </Button>
              ) : undefined
            }
            bodyClassName="p-0 md:p-0"
          >
            {order.payments.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">{t('orders.noPayments')}</p>
            ) : (
              <ul className="divide-y">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 md:px-5">
                    <div>
                      <p className="font-mono text-xs font-medium text-primary">{p.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(p.date)} · {translateAccountName(p.account, t)}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-medium tabular-nums text-success">+{formatIDR(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title={t('orders.deliveryStatus')}
            action={
              !cancelled && !order.delivery ? (
                <Button size="sm" variant="outline" onClick={() => setDeliveryOpen(true)}>
                  <Truck />
                  {t('orders.createDelivery')}
                </Button>
              ) : undefined
            }
          >
            {order.delivery ? (
              <dl className="grid gap-x-8 sm:grid-cols-2">
                <DetailRow label={t('deliveries.id')}><span className="font-mono text-primary">{order.delivery.id}</span></DetailRow>
                <DetailRow label={t('common.date')}>{formatDate(order.delivery.date)}</DetailRow>
                <DetailRow label={t('orders.method')}>{t(`method.${order.delivery.method}`)}</DetailRow>
                <DetailRow label={t('orders.transportCost')}><span className="font-mono">{formatIDR(order.delivery.transportCost)}</span></DetailRow>
                <DetailRow label={t('orders.recipient')}>{order.delivery.recipient}</DetailRow>
                <DetailRow label="Driver name">{order.delivery.driverName || '—'}</DetailRow>
                <DetailRow label={t('common.address')}>{order.delivery.address}</DetailRow>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">{t('orders.noDelivery')}</p>
            )}
          </SectionCard>
        </div>

        <div className="flex flex-col gap-4">
          <SectionCard title={t('orders.paymentSummary')}>
            <dl className="divide-y">
              <DetailRow label={t('common.total')}><span className="font-mono">{formatIDR(total)}</span></DetailRow>
              <DetailRow label={t('common.paid')}><span className="font-mono text-success">{formatIDR(paid)}</span></DetailRow>
              <DetailRow label={t('common.outstanding')}>
                <span className={`font-mono text-base font-semibold ${outstanding > 0 ? 'text-warning' : ''}`}>{formatIDR(outstanding)}</span>
              </DetailRow>
              <DetailRow label={t('common.dueDate')}>
                {order.dueDate ? (
                  <span className={order.dueDate < TODAY && outstanding > 0 ? 'text-destructive' : ''}>{formatDate(order.dueDate)}</span>
                ) : (
                  <span className="text-muted-foreground">{t('common.noDueDate')}</span>
                )}
              </DetailRow>
            </dl>
            {total > 0 && (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round((paid / total) * 100)} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-success" style={{ width: `${Math.min((paid / total) * 100, 100)}%` }} />
              </div>
            )}
          </SectionCard>

          <SectionCard title={locale === 'id' ? 'Log aktivitas' : 'Activity log'}>
            <ol className="relative ml-1 space-y-4 before:absolute before:z-0 before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-border">
              <li className="flex gap-3"><span className={`relative z-10 mt-1 size-2.5 shrink-0 rounded-full ring-4 ${order.status !== 'requested' ? 'bg-success ring-success/10' : 'bg-muted-foreground/40 ring-muted/60'}`} /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{locale === 'id' ? 'Pesanan disiapkan' : 'Order prepared'}</p><p className="text-xs text-muted-foreground">{order.status !== 'requested' ? (locale === 'id' ? 'Persiapan pesanan selesai' : 'Order preparation completed') : (locale === 'id' ? 'Pesanan dibuat · menunggu persiapan' : 'Order created · waiting for preparation')} · {new Date(data.createdAt).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US')}</p></div><Pill tone={order.status !== 'requested' ? 'success' : 'neutral'}>{order.status !== 'requested' ? (locale === 'id' ? 'Selesai' : 'Done') : (locale === 'id' ? 'Menunggu' : 'Pending')}</Pill></li>
              <li className="flex gap-3"><span className={`relative z-10 mt-1 size-2.5 shrink-0 rounded-full ring-4 ${order.status === 'ready' || order.status === 'delivered' ? 'bg-success ring-success/10' : 'bg-muted-foreground/40 ring-muted/60'}`} /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{locale === 'id' ? 'Pesanan siap diantar' : 'Order ready for delivery'}</p><p className="text-xs text-muted-foreground">{order.status === 'ready' || order.status === 'delivered' ? (locale === 'id' ? 'Pesanan telah disiapkan untuk pengiriman' : 'Order marked ready for delivery') : (locale === 'id' ? 'Menunggu pesanan disiapkan' : 'Waiting for order preparation')}</p></div><Pill tone={order.status === 'ready' || order.status === 'delivered' ? 'success' : 'neutral'}>{order.status === 'ready' || order.status === 'delivered' ? (locale === 'id' ? 'Selesai' : 'Done') : (locale === 'id' ? 'Menunggu' : 'Pending')}</Pill></li>
              <li className="flex gap-3"><span className={`relative z-10 mt-1 size-2.5 shrink-0 rounded-full ring-4 ${order.delivery ? 'bg-success ring-success/10' : 'bg-muted-foreground/40 ring-muted/60'}`} /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{locale === 'id' ? 'Pesanan dalam perjalanan' : 'Order in transit'}</p><p className="text-xs text-muted-foreground">{order.delivery ? `${locale === 'id' ? 'Pengiriman' : 'Delivery'} · ${formatDate(order.delivery.date)}` : (locale === 'id' ? 'Pengiriman belum dibuat' : 'Delivery has not been created')}</p></div><Pill tone={order.delivery ? 'success' : 'neutral'}>{order.delivery ? (locale === 'id' ? 'Tercatat' : 'Recorded') : (locale === 'id' ? 'Menunggu' : 'Pending')}</Pill></li>
              <li className="flex gap-3"><span className={`relative z-10 mt-1 size-2.5 shrink-0 rounded-full ring-4 ${order.status === 'delivered' ? 'bg-success ring-success/10' : 'bg-muted-foreground/40 ring-muted/60'}`} /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{locale === 'id' ? 'Pesanan sampai di tujuan' : 'Order delivered'}</p><p className="text-xs text-muted-foreground">{order.status === 'delivered' ? (order.delivery ? formatDate(order.delivery.date) : (locale === 'id' ? 'Status terkirim' : 'Marked as delivered')) : (locale === 'id' ? 'Menunggu konfirmasi penerimaan' : 'Waiting for delivery confirmation')}</p>{order.delivery && order.status !== 'delivered' && <Button type="button" size="sm" variant="outline" className="mt-2" disabled={deliverySaving} onClick={async () => { setDeliverySaving(true); try { const response = await fetch(`/api/orders/${encodeURIComponent(order.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId: business?.id, status: 'delivered' }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error ?? 'Unable to update delivery status'); await mutate(); toast.success(locale === 'id' ? 'Pesanan ditandai telah sampai.' : 'Order marked as delivered.'); } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to update delivery status'); } finally { setDeliverySaving(false); } }}>{deliverySaving ? t('common.loading') : (locale === 'id' ? 'Konfirmasi sampai tujuan' : 'Confirm delivery arrival')}</Button>}</div><Pill tone={order.status === 'delivered' ? 'success' : 'neutral'}>{order.status === 'delivered' ? (locale === 'id' ? 'Selesai' : 'Done') : (locale === 'id' ? 'Menunggu' : 'Pending')}</Pill></li>
              <li className="flex gap-3"><span className={`relative z-10 mt-1 size-2.5 shrink-0 rounded-full ring-4 ${outstanding <= 0 ? 'bg-success ring-success/10' : paid > 0 ? 'bg-warning ring-warning/10' : 'bg-muted-foreground/40 ring-muted/60'}`} /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{outstanding <= 0 ? (locale === 'id' ? 'Pembayaran lunas' : 'Payment completed') : paid > 0 ? (locale === 'id' ? 'Pembayaran sebagian' : 'Partially paid') : (locale === 'id' ? 'Belum ada pembayaran' : 'Awaiting payment')}</p><p className="text-xs text-muted-foreground">{order.payments.length ? order.payments.map((payment) => `${formatDate(payment.date)} · ${formatIDR(payment.amount)}`).join('  |  ') : (locale === 'id' ? 'Belum ada pembayaran yang dicatat' : 'No payments recorded yet')}</p></div><Pill tone={outstanding <= 0 ? 'success' : paid > 0 ? 'warning' : 'neutral'}>{outstanding <= 0 ? (locale === 'id' ? 'Lunas' : 'Paid') : paid > 0 ? (locale === 'id' ? 'Sebagian' : 'Partial') : (locale === 'id' ? 'Belum dibayar' : 'Unpaid')}</Pill></li>
            </ol>
          </SectionCard>
          <SectionCard title={t('orders.profitability')}>
            <dl className="divide-y">
              <DetailRow label={t('orders.revenue')}><span className="font-mono">{formatIDR(total)}</span></DetailRow>
              {refundTotal > 0 && <DetailRow label={t('orders.refundAmount')}><span className="font-mono text-destructive">-{formatIDR(refundTotal)}</span></DetailRow>}
              <DetailRow label={t('orders.cogs')}><span className="font-mono text-muted-foreground">-{formatIDR(netCogs)}</span></DetailRow>
              {replacementCostTotal > 0 && <DetailRow label={t('orders.replacementCost')}><span className="font-mono text-muted-foreground">-{formatIDR(replacementCostTotal)}</span></DetailRow>}
              <DetailRow label={t('orders.transportCost')}><span className="font-mono text-muted-foreground">-{formatIDR(transport)}</span></DetailRow>
              <DetailRow label={t('orders.profit')}>
                <span className={`font-mono text-base font-semibold ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>{formatIDR(profit)}</span>
              </DetailRow>
              <DetailRow label={t('orders.margin')}><span className="font-mono">{total ? formatPercent((profit / total) * 100) : '—'}</span></DetailRow>
            </dl>
          </SectionCard>

          <SectionCard title={t('orders.info')}>
            <dl className="divide-y">
              <DetailRow label={t('common.customer')}>{customer?.name}</DetailRow>
              <DetailRow label={t('common.phone')}><span className="font-mono text-xs">{customer?.phone}</span></DetailRow>
              <DetailRow label={t('orders.orderDate')}>{formatDate(order.date)}</DetailRow>
            </dl>
            {order.notes && (
              <div className="mt-3 rounded-lg bg-muted/60 p-3 text-sm leading-relaxed">
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('common.notes')}</p>
                {order.notes}
              </div>
            )}
            <div className="mt-4 flex flex-col gap-2">
              <Button variant="outline" size="sm" className="justify-start" nativeButton={false} render={<Link href="/customers" />}>
                <User />
                {t('orders.viewCustomer')}
              </Button>
              {features.customerCredit && (
                <Button variant="outline" size="sm" className="justify-start" nativeButton={false} render={<Link href="/receivables" />}>
                  <Wallet />
                  {t('orders.viewReceivables')}
                </Button>
              )}
              <Button variant="outline" size="sm" className="justify-start" nativeButton={false} render={<Link href="/history" />}>
                <History />
                {t('orders.viewHistory')}
              </Button>
            </div>
          </SectionCard>
        </div>
      </div>

      {doc && <DocumentPreview order={order} kind={doc} open={!!doc} onOpenChange={(o) => !o && setDoc(null)} customerOverride={customer ? { id: customer.id, name: customer.name, address: customer.address } : null} productNames={Object.fromEntries(data.products.map((product) => [product.id, product.name]))} bankAccounts={(financialAccounts ?? []).filter((account) => account.active && account.type === "bank" && account.accountNumber).map(({ name, accountNumber }) => ({ name, accountNumber }))} />}
      <FormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title={t('common.edit') + ' ' + t('nav.orders')}
        submitLabel={t('common.save')}
        persisted
        fields={[
          { name: 'date', label: t('common.date'), type: 'date', defaultValue: order.date, half: true },
          {
            name: 'status',
            label: t('common.status'),
            type: 'select',
            defaultValue: order.status,
            half: true,
            options: order.status === 'ready'
              ? [{ value: 'ready', label: t('status.ready') }]
              : [
                  { value: 'requested', label: t('status.requested') },
                  { value: 'ready', label: t('status.ready') },
                ],
          },
          { name: 'dueDate', label: t('common.dueDate'), type: 'date', defaultValue: order.dueDate ?? '', required: false, half: true },
          { name: 'notes', label: t('common.notes'), type: 'textarea', defaultValue: order.notes, required: false },
        ]}
        onSubmit={async (values) => {
          if (!business?.id) throw new Error(t('common.retry'))
          const response = await fetch('/api/orders', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: order.id,
              businessId: business.id,
              date: values.date,
              status: values.status,
              dueDate: values.dueDate || null,
              notes: values.notes,
            }),
          })
          const result = await response.json()
          if (!response.ok) throw new Error(result.error ?? t('form.validationError'))
          await mutate()
          setEditOpen(false)
          toast.success(t('form.savedFeedback'))
        }}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete order"
        description="Only unpaid orders in Requested status with no delivery, stock, replacement, or accounting activity can be deleted."
        confirmLabel="Delete order"
        onConfirm={async () => {
          if (!business?.id || paid > 0 || order.status !== 'requested') return
          const response = await fetch(`/api/orders/${encodeURIComponent(order.id)}?businessId=${encodeURIComponent(business.id)}`, { method: 'DELETE' })
          const result = await response.json()
          if (!response.ok) { toast.error(result.error ?? 'Unable to delete order'); return }
          toast.success('Order deleted')
          window.location.href = '/orders'
        }}
      />
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t('orders.cancelTitle')}
        description={t('orders.cancelBody')}
        confirmLabel={t('common.previewAction')}
        previewOnly
        onConfirm={() => toast.info(t('form.previewFeedback'))}
      />
      <FormDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        title={t('orders.addPayment')}
        persisted
        onSubmit={async (values) => {
          if (!business?.id) throw new Error('Business access required')
          const response = await fetch('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: `PAY-${crypto.randomUUID()}`, businessId: business.id, orderId: order.id, date: values.date, amount: Number(values.amount), account: values.account }) })
          const result = await response.json()
          if (!response.ok) throw new Error(result.error ?? 'Unable to record payment')
          await Promise.all([mutate(), fetch(`/api/accounting?businessId=${encodeURIComponent(business.id)}`), fetch(`/api/cash-transactions?businessId=${encodeURIComponent(business.id)}`)])
          setPayOpen(false)
          toast.success('Payment recorded successfully')
        }}
        fields={[
          { name: 'date', label: t('common.date'), type: 'date', defaultValue: TODAY, half: true },
          { name: 'account', label: t('receivables.receiveTo'), type: 'select', half: true, options: (financialAccounts ?? []).filter((item) => item.active).map((item) => ({ value: item.name, label: translateAccountName(item.name, t) })) },
          { name: 'amount', label: t('common.amount'), type: 'number', prefix: 'Rp', min: 1, defaultValue: String(outstanding), hint: `${t('common.outstanding')}: ${formatIDR(outstanding)}` },
        ]}
      />
      <FormDialog
        open={deliveryOpen}
        onOpenChange={setDeliveryOpen}
        title={t('orders.createDelivery')}
        description={order.id}
        persisted
        onSubmit={async (values) => {
          if (!business?.id) throw new Error('Business access required')
          const response = await fetch('/api/deliveries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              businessId: business.id,
              orderId: order.id,
              date: values.date,
              method: values.method,
              recipient: values.recipient,
              driverName: values.driverName,
              address: values.address,
              transportCost: Number(values.transport || 0), transportAccount: values.transportAccount || "",
            }),
          })
          const result = await response.json()
          if (!response.ok) throw new Error(result.error ?? 'Unable to create delivery')
          await Promise.all([
            mutate(),
            fetch('/api/deliveries?businessId=' + encodeURIComponent(business.id)),
            fetch('/api/accounting?businessId=' + encodeURIComponent(business.id)),
          ])
          setDeliveryOpen(false)
          toast.success('Delivery created successfully')
        }}
        fields={[
          { name: 'date', label: t('common.date'), type: 'date', defaultValue: TODAY, half: true },
          { name: 'method', label: t('orders.method'), type: 'select', defaultValue: methodOptions[0]?.value ?? 'pickup', half: true, options: methodOptions },
          { name: 'recipient', label: t('orders.recipient'), defaultValue: customer?.name ?? '', half: true },
          { name: 'driverName', label: 'Driver name', placeholder: 'Enter driver name', half: true },
          { name: 'transport', label: t('orders.transportCost'), type: 'number', prefix: 'Rp', defaultValue: '0', min: 0, half: true },
          { name: 'transportAccount', label: t('returns.refundAccount'), type: 'select', options: (financialAccounts ?? []).filter((item) => item.active).map((item) => ({ value: item.name, label: item.name })), required: false, hint: t('returns.selectCashBank') },
          { name: 'address', label: t('common.address'), type: 'textarea', defaultValue: customer?.address ?? '', required: false },
        ]}
      />
    </>
  )
}
