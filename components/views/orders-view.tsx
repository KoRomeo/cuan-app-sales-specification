'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useSWRConfig } from 'swr'
import { appToast as toast } from '@/lib/toast'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import useSWR from 'swr'
import { AlertTriangle, CircleDollarSign, Clock, FileText, ShoppingCart, Truck } from 'lucide-react'
import { DataTable, IdCell, Money, type Column } from '@/components/common/data-table'
import { FormDialog } from '@/components/common/form-dialog'
import { KpiCard, KpiGrid } from '@/components/common/kpi-card'
import { PageHeader } from '@/components/common/page-header'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/common/status-badge'
import { useApp } from '@/components/providers'
import {
  type Order,
  orderOutstanding,
  orderPaid,
  orderPaymentStatus,
  orderTotal,
} from '@/lib/data'
import { formatDate, formatIDR } from '@/lib/format'

const fetcher = (url: string) => fetch(url).then(async (response) => {
  if (!response.ok) throw new Error((await response.json()).error ?? 'Unable to load orders')
  return response.json()
})
type PersistedOrder = { id: string; date: string; customerId: string; status: Order['status']; dueDate: string | null; notes: string | null; items: Array<{ productId: string; qty: number; price: string | number; discount?: string | number; unitCost: string | number }> }
type PersistedPayment = { id: string; date: string; amount: string | number; account: string; orderId: string | null }
type PersistedParty = { id: string; name: string; phone?: string | null; address?: string | null }
function mapOrder(row: PersistedOrder, payments: PersistedPayment[]): Order {
  return { ...row, notes: row.notes ?? '', items: row.items.map((item) => ({ ...item, price: Number(item.price), discount: Number(item.discount ?? 0), unitCost: Number(item.unitCost) })), payments: payments.filter((payment) => payment.orderId === row.id).map((payment) => ({ id: payment.id, date: payment.date, amount: Number(payment.amount), account: payment.account })), delivery: null }
}

const hasNegativeImpact = (o: Order, productStock: Map<string, number>) =>
  o.status !== 'cancelled' && o.items.some((it) => (productStock.get(it.productId) ?? 0) < 0)

export function OrdersView() {
  const { t } = useApp()
  const router = useRouter()
  const { mutate: globalMutate } = useSWRConfig()
  const [deleteTarget, setDeleteTarget] = useState<PersistedOrder | null>(null)
  const [editTarget, setEditTarget] = useState<PersistedOrder | null>(null)
  const { data: business, error: businessError } = useSWR<{ id: string }>('/api/businesses/current', fetcher)
  const { data: persistedOrders, error: ordersError, mutate: mutateOrders } = useSWR<PersistedOrder[]>(business?.id ? `/api/orders?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const { data: payments, error: paymentsError } = useSWR<PersistedPayment[]>(business?.id ? `/api/payments?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const { data: customers, error: customersError } = useSWR<PersistedParty[]>(business?.id ? `/api/customers?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const { data: products, error: productsError } = useSWR<Array<{ id: string; name: string; stock?: number }>>(business?.id ? `/api/products?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  async function cancelOrder() {
    if (!business?.id || !deleteTarget) return
    const target = deleteTarget
    try {
      const response = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: target.id, businessId: business.id, status: 'cancelled' }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Unable to cancel order')
      setDeleteTarget(null)
      await Promise.all([
        mutateOrders(),
        globalMutate(`/api/payments?businessId=${encodeURIComponent(business.id)}`),
        globalMutate(`/api/products?businessId=${encodeURIComponent(business.id)}`),
        globalMutate(`/api/stock?businessId=${encodeURIComponent(business.id)}`),
        globalMutate(`/api/accounting?businessId=${encodeURIComponent(business.id)}`),
        globalMutate(`/api/dashboard?businessId=${encodeURIComponent(business.id)}`),
      ])
      toast.success('Order cancelled successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to cancel order')
    }
  }

  async function saveOrder(values: Record<string, string>) {
    if (!business?.id || !editTarget) throw new Error('Order or business not found')
    const response = await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editTarget.id, businessId: business.id,
        dueDate: values.dueDate || null, notes: values.notes ?? '',
      }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error ?? 'Unable to update order')
    setEditTarget(null)
    await mutateOrders()
    toast.success('Order updated successfully')
  }

  const error = businessError || ordersError || paymentsError || customersError || productsError
  if (error) return <p role="alert" className="text-sm text-destructive">{error.message}</p>
  if (!business || !persistedOrders || !payments || !customers || !products) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  const orderRows = persistedOrders.map((order) => mapOrder(order, payments))
  const customerByIdMap = new Map(customers.map((customer) => [customer.id, customer]))
  const productByIdMap = new Map(products.map((product) => [product.id, product]))
  const productStock = new Map(products.map((product) => [product.id, product.stock ?? 0]))
  const sorted = [...orderRows].sort((a, b) => (a.id < b.id ? 1 : -1))
  const active = sorted.filter((o) => o.status !== 'cancelled')

  const columns: Column<Order>[] = [
    {
      key: 'id',
      header: t('orders.id'),
      cell: (o) => (
        <span className="flex items-center gap-2">
          <IdCell>{o.id}</IdCell>
          {hasNegativeImpact(o, productStock) && (
            <AlertTriangle className="size-3.5 text-destructive" aria-label={t('orders.negativeImpact')} />
          )}
        </span>
      ),
    },
    { key: 'date', header: t('common.date'), cell: (o) => <span className="font-mono text-xs text-muted-foreground">{formatDate(o.date)}</span> },
    { key: 'customer', header: t('common.customer'), cell: (o) => <span className="font-medium">{customerByIdMap.get(o.customerId)?.name}</span> },
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
        searchText={(o) => `${o.id} ${customerByIdMap.get(o.customerId)?.name} ${o.items.map((i) => productByIdMap.get(i.productId)?.name).join(' ')}`}
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
        contextActions={(o) => [
          { label: t('orders.viewInvoice'), icon: FileText, href: '/invoices' },
          { label: t('common.edit'), onSelect: () => setEditTarget(persistedOrders.find((row) => row.id === o.id) ?? null) },
          ...(o.status !== 'delivered' && o.status !== 'cancelled' ? [{ label: t('orders.cancelOrder'), onSelect: () => setDeleteTarget(persistedOrders.find((row) => row.id === o.id) ?? null) }] : []),
        ]}
        deletable={false}
      />
      <FormDialog
        key={editTarget?.id ?? 'no-order-edit'}
        open={!!editTarget}
        onOpenChange={(nextOpen) => { if (!nextOpen) setEditTarget(null) }}
        title={t('common.edit') + ' Order'}
        description="Edit the due date and notes. Posted order dates, customer, quantities, prices, stock and accounting entries stay locked to preserve transaction history."
        persisted
        fields={[
          { name: 'dueDate', label: t('common.dueDate'), type: 'date', defaultValue: editTarget?.dueDate ?? '', required: false },
          { name: 'notes', label: t('common.notes'), type: 'textarea', defaultValue: editTarget?.notes ?? '', required: false },
        ]}
        onSubmit={saveOrder}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title={t('orders.cancelOrder')}
        description={deleteTarget ? `Cancel Order ${deleteTarget.id}? This preserves its audit trail and reverses stock and accounting entries. Orders with payments or deliveries cannot be cancelled.` : ''}
        confirmLabel={t('orders.cancelOrder')}
        onConfirm={() => { void cancelOrder() }}
      />
    </>
  )
}
