'use client'

import { useRouter } from 'next/navigation'
import { AlertTriangle, CircleDollarSign, Clock, FileText, ShoppingCart, Truck } from 'lucide-react'
import { DataTable, IdCell, Money, type Column } from '@/components/common/data-table'
import { KpiCard, KpiGrid } from '@/components/common/kpi-card'
import { PageHeader } from '@/components/common/page-header'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/common/status-badge'
import { useApp } from '@/components/providers'
import {
  customerById,
  type Order,
  orderOutstanding,
  orderPaid,
  orderPaymentStatus,
  orders,
  orderTotal,
  productById,
} from '@/lib/data'
import { formatDate, formatIDR } from '@/lib/format'

const hasNegativeImpact = (o: Order) =>
  o.status !== 'cancelled' && o.items.some((it) => (productById(it.productId)?.stock ?? 0) < 0)

export function OrdersView() {
  const { t } = useApp()
  const router = useRouter()
  const sorted = [...orders].sort((a, b) => (a.id < b.id ? 1 : -1))
  const active = sorted.filter((o) => o.status !== 'cancelled')

  const columns: Column<Order>[] = [
    {
      key: 'id',
      header: t('orders.id'),
      cell: (o) => (
        <span className="flex items-center gap-2">
          <IdCell>{o.id}</IdCell>
          {hasNegativeImpact(o) && (
            <AlertTriangle className="size-3.5 text-destructive" aria-label={t('orders.negativeImpact')} />
          )}
        </span>
      ),
    },
    { key: 'date', header: t('common.date'), cell: (o) => <span className="font-mono text-xs text-muted-foreground">{formatDate(o.date)}</span> },
    { key: 'customer', header: t('common.customer'), cell: (o) => <span className="font-medium">{customerById(o.customerId)?.name}</span> },
    { key: 'status', header: t('common.status'), sortValue: (o) => o.status, cell: (o) => <OrderStatusBadge status={o.status} /> },
    { key: 'payment', header: t('orders.paymentStatus'), sortValue: (o) => (o.status === 'cancelled' ? null : orderPaymentStatus(o)), cell: (o) => (o.status === 'cancelled' ? <span className="text-muted-foreground">—</span> : <PaymentStatusBadge status={orderPaymentStatus(o)} />) },
    { key: 'total', header: t('common.total'), align: 'right', cell: (o) => <Money value={orderTotal(o)} className={o.status === 'cancelled' ? 'text-muted-foreground line-through' : ''} /> },
    { key: 'paid', header: t('common.paid'), align: 'right', cell: (o) => <Money value={orderPaid(o)} className="text-muted-foreground" /> },
    {
      key: 'outstanding',
      header: t('common.outstanding'),
      align: 'right',
      cell: (o) => {
        const v = orderOutstanding(o)
        return <Money value={v} className={v > 0 ? 'font-medium text-warning' : 'text-muted-foreground'} />
      },
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: t('nav.sales') }, { label: t('nav.orders') }]}
        title={t('orders.title')}
        description={t('orders.desc')}
      />
      <KpiGrid>
        <KpiCard label={t('orders.total')} value={active.length} icon={ShoppingCart} />
        <KpiCard label={t('status.requested')} value={active.filter((o) => o.status === 'requested').length} icon={Clock} tone="warning" />
        <KpiCard label={t('status.ready')} value={active.filter((o) => o.status === 'ready').length} icon={Truck} />
        <KpiCard
          label={t('orders.outstandingPayment')}
          value={formatIDR(active.reduce((s, o) => s + orderOutstanding(o), 0))}
          icon={CircleDollarSign}
          tone="warning"
          href="/receivables"
        />
      </KpiGrid>
      <DataTable
        rows={sorted}
        columns={columns}
        getRowId={(o) => o.id}
        searchText={(o) => `${o.id} ${customerById(o.customerId)?.name} ${o.items.map((i) => productById(i.productId)?.name).join(' ')}`}
        filters={[
          { value: 'all', label: t('common.all'), predicate: () => true },
          { value: 'requested', label: t('status.requested'), predicate: (o) => o.status === 'requested' },
          { value: 'ready', label: t('status.ready'), predicate: (o) => o.status === 'ready' },
          { value: 'delivered', label: t('status.delivered'), predicate: (o) => o.status === 'delivered' },
          { value: 'unpaid', label: t('pay.unpaid'), predicate: (o) => o.status !== 'cancelled' && orderPaymentStatus(o) !== 'paid' },
          { value: 'cancelled', label: t('status.cancelled'), predicate: (o) => o.status === 'cancelled' },
        ]}
        addLabel={t('orders.add')}
        onAdd={() => router.push('/orders/new')}
        rowHref={(o) => `/orders/${o.id}`}
        contextActions={() => [{ label: t('orders.viewInvoice'), icon: FileText, href: '/invoices' }]}
      />
    </>
  )
}
