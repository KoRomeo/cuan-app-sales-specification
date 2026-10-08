'use client'

import Link from 'next/link'
import { AlertTriangle, Ban, FileText, History, Pencil, Plus, Printer, Truck, User, Wallet } from 'lucide-react'
import { useState } from 'react'
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
  customerById,
  lineSubtotal,
  type Order,
  orderCogs,
  orderOutstanding,
  orderPaid,
  orderPaymentStatus,
  orderTotal,
  productById,
  replacements,
  TODAY,
} from '@/lib/data'
import { formatDate, formatIDR, formatPercent } from '@/lib/format'
import { translateAccountName } from '@/lib/i18n'

export function OrderDetailView({ order }: { order: Order }) {
  const { t, features } = useApp()
  const [doc, setDoc] = useState<'invoice' | 'delivery' | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [deliveryOpen, setDeliveryOpen] = useState(false)

  const customer = customerById(order.customerId)
  const total = orderTotal(order)
  const paid = orderPaid(order)
  const outstanding = orderOutstanding(order)
  const cogs = orderCogs(order)
  const transport = order.delivery?.transportCost ?? 0
  const profit = total - cogs - transport
  const cancelled = order.status === 'cancelled'
  const pendingReplacements = replacements.filter((r) => r.orderId === order.id && !r.delivered)
  const negativeItems = cancelled
    ? []
    : order.items.map((it) => productById(it.productId)!).filter((p) => p && p.stock < 0)

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
            {!cancelled && <PaymentStatusBadge status={orderPaymentStatus(order)} />}
            {pendingReplacements.length > 0 && <Pill tone="warning">{t('orders.replacementOutstanding')}</Pill>}
          </>
        }
        actions={
          <>
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
                <Button variant="outline" size="sm" onClick={() => toast.info(t('form.editUnavailable'))}>
                  <Pencil />
                  {t('common.edit')}
                </Button>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setCancelOpen(true)}>
                  <Ban />
                  {t('orders.cancelOrder')}
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
            {negativeItems.map((p) => (
              <p key={p.id}>{t('orders.negativeWarning', { product: p.name, stock: p.stock })}</p>
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
                    <th scope="col" className="h-10 px-4 text-left font-medium md:px-5">{t('common.product')}</th>
                    <th scope="col" className="h-10 px-4 text-right font-medium">{t('common.qty')}</th>
                    <th scope="col" className="h-10 px-4 text-right font-medium">{t('orders.sellingPrice')}</th>
                    <th scope="col" className="h-10 px-4 text-right font-medium">{t('orders.discount')}</th>
                    <th scope="col" className="h-10 px-4 text-right font-medium md:px-5">{t('orders.subtotal')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {order.items.map((it) => {
                    const p = productById(it.productId)
                    return (
                      <tr key={it.productId}>
                        <td className="px-4 py-3 md:px-5">
                          <p className="font-medium">{p?.name}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">
                            {p?.id} · {t('orders.cogs')} {formatIDR(it.unitCost)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{it.qty}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{formatIDR(it.price)}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">{it.discount ? formatIDR(it.discount) : '—'}</td>
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

          <SectionCard title={t('orders.profitability')}>
            <dl className="divide-y">
              <DetailRow label={t('dash.revenue')}><span className="font-mono">{formatIDR(total)}</span></DetailRow>
              <DetailRow label={t('orders.cogs')}><span className="font-mono text-muted-foreground">-{formatIDR(cogs)}</span></DetailRow>
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

      {doc && <DocumentPreview order={order} kind={doc} open={!!doc} onOpenChange={(o) => !o && setDoc(null)} />}
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
        fields={[
          { name: 'date', label: t('common.date'), type: 'date', defaultValue: TODAY, half: true },
          { name: 'account', label: t('receivables.receiveTo'), type: 'select', half: true, options: ['Cash', 'Bank BCA', 'Bank Mandiri'].map((value) => ({ value, label: translateAccountName(value, t) })) },
          { name: 'amount', label: t('common.amount'), type: 'number', prefix: 'Rp', min: 1, defaultValue: String(outstanding), hint: `${t('common.outstanding')}: ${formatIDR(outstanding)}` },
        ]}
      />
      <FormDialog
        open={deliveryOpen}
        onOpenChange={setDeliveryOpen}
        title={t('orders.createDelivery')}
        fields={[
          { name: 'date', label: t('common.date'), type: 'date', defaultValue: TODAY, half: true },
          { name: 'method', label: t('orders.method'), type: 'select', half: true, options: methodOptions },
          { name: 'recipient', label: t('orders.recipient'), defaultValue: customer?.name, half: true },
          { name: 'transport', label: t('orders.transportCost'), type: 'number', prefix: 'Rp', defaultValue: '0', min: 0, half: true },
          { name: 'address', label: t('common.address'), type: 'textarea', defaultValue: customer?.address },
        ]}
      />
    </>
  )
}
