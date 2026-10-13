
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { useSWRConfig } from 'swr'
import {
  AlertTriangle,
  CircleDollarSign,
  Clock,
  FileText,
  ShoppingCart,
  Truck,
} from 'lucide-react'

import { appToast as toast } from '@/lib/toast'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { DataTable, IdCell, Money, type Column } from '@/components/common/data-table'
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

const fetcher = (url: string) =>
  fetch(url).then(async (response) => {
    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.error ?? 'Unable to load orders')
    }

    return response.json()
  })

type PersistedOrder = {
  id: string
  date: string
  customerId: string
  status: Order['status']
  dueDate: string | null
  notes: string | null
  items: Array<{
    productId: string
    qty: number
    price: string | number
    discount?: string | number
    unitCost: string | number
  }>
}

type PersistedPayment = {
  id: string
  date: string
  amount: string | number
  account: string
  orderId: string | null
}

type PersistedParty = {
  id: string
  name: string
  phone?: string | null
  address?: string | null
}

function mapOrder(
  row: PersistedOrder,
  payments: PersistedPayment[],
): Order {
  return {
    ...row,
    notes: row.notes ?? '',
    items: row.items.map((item) => ({
      ...item,
      price: Number(item.price),
      discount: Number(item.discount ?? 0),
      unitCost: Number(item.unitCost),
    })),
    payments: payments
      .filter((payment) => payment.orderId === row.id)
      .map((payment) => ({
        id: payment.id,
        date: payment.date,
        amount: Number(payment.amount),
        account: payment.account,
      })),
    delivery: null,
  }
}

const hasNegativeImpact = (
  order: Order,
  productStock: Map<string, number>,
) =>
  order.status !== 'cancelled' &&
  order.items.some(
    (item) => (productStock.get(item.productId) ?? 0) < 0,
  )

export function OrdersView() {
  const { t } = useApp()
  const router = useRouter()
  const { mutate: globalMutate } = useSWRConfig()

  const [deleteTarget, setDeleteTarget] =
    useState<PersistedOrder | null>(null)

  const {
    data: business,
    error: businessError,
  } = useSWR<{ id: string }>('/api/businesses/current', fetcher)

  const {
    data: persistedOrders,
    error: ordersError,
    mutate: mutateOrders,
  } = useSWR<PersistedOrder[]>(
    business?.id
      ? `/api/orders?businessId=${encodeURIComponent(business.id)}`
      : null,
    fetcher,
  )

  const {
    data: payments,
    error: paymentsError,
  } = useSWR<PersistedPayment[]>(
    business?.id
      ? `/api/payments?businessId=${encodeURIComponent(business.id)}`
      : null,
    fetcher,
  )

  const {
    data: customers,
    error: customersError,
  } = useSWR<PersistedParty[]>(
    business?.id
      ? `/api/customers?businessId=${encodeURIComponent(business.id)}`
      : null,
    fetcher,
  )

  const {
    data: products,
    error: productsError,
  } = useSWR<Array<{ id: string; name: string; stock?: number }>>(
    business?.id
      ? `/api/products?businessId=${encodeURIComponent(business.id)}`
      : null,
    fetcher,
  )

  async function deleteOrder() {
    if (!business?.id || !deleteTarget) return

    const target = deleteTarget

    try {
      const response = await fetch(
        `/api/orders/${encodeURIComponent(target.id)}?businessId=${encodeURIComponent(business.id)}`,
        { method: 'DELETE' },
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error ?? 'Unable to delete order')
      }

      setDeleteTarget(null)

      await Promise.all([
        mutateOrders(),
        globalMutate(
          `/api/payments?businessId=${encodeURIComponent(business.id)}`,
        ),
        globalMutate(
          `/api/products?businessId=${encodeURIComponent(business.id)}`,
        ),
      ])

      toast.success('Order deleted successfully')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to delete order',
      )
    }
  }

  const error =
    businessError ||
    ordersError ||
    paymentsError ||
    customersError ||
    productsError

  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {error.message}
      </p>
    )
  }

  if (!business || !persistedOrders || !payments || !customers || !products) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('common.loading')}
      </p>
    )
  }

  const orderRows = persistedOrders.map((order) =>
    mapOrder(order, payments),
  )

  const customerByIdMap = new Map(
    customers.map((customer) => [customer.id, customer]),
  )

  const productByIdMap = new Map(
    products.map((product) => [product.id, product]),
  )

  const productStock = new Map(
    products.map((product) => [product.id, product.stock ?? 0]),
  )

  const sorted = [...orderRows].sort((a, b) =>
    a.id < b.id ? 1 : -1,
  )

  const active = sorted.filter(
    (order) => order.status !== 'cancelled',
  )

  const columns: Column<Order>[] = [
    {
      key: 'id',
      header: t('orders.id'),
      cell: (order) => (
        <span className="flex items-center gap-2">
          <IdCell>{order.id}</IdCell>
          {hasNegativeImpact(order, productStock) && (
            <AlertTriangle
              className="size-3.5 text-destructive"
              aria-label={t('orders.negativeImpact')}
            />
          )}
        </span>
      ),
    },
    {
      key: 'date',
      header: t('common.date'),
      cell: (order) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatDate(order.date)}
        </span>
      ),
    },
    {
      key: 'customer',
      header: t('common.customer'),
      cell: (order) => (
        <span className="font-medium">
          {customerByIdMap.get(order.customerId)?.name}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      sortValue: (order) => order.status,
      cell: (order) => <OrderStatusBadge status={order.status} />,
    },
    {
      key: 'payment',
      header: t('orders.paymentStatus'),
      sortValue: (order) =>
        order.status === 'cancelled'
          ? null
          : orderPaymentStatus(order),
      cell: (order) =>
        order.status === 'cancelled' ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <PaymentStatusBadge
            status={orderPaymentStatus(order)}
          />
        ),
    },
    {
      key: 'total',
      header: t('common.total'),
      align: 'right',
      cell: (order) => (
        <Money
          value={orderTotal(order)}
          className={
            order.status === 'cancelled'
              ? 'text-muted-foreground line-through'
              : ''
          }
        />
      ),
    },
    {
      key: 'paid',
      header: t('common.paid'),
      align: 'right',
      cell: (order) => (
        <Money
          value={orderPaid(order)}
          className="text-muted-foreground"
        />
      ),
    },
    {
      key: 'outstanding',
      header: t('common.outstanding'),
      align: 'right',
      cell: (order) => {
        const value = orderOutstanding(order)

        return (
          <Money
            value={value}
            className={
              value > 0
                ? 'font-medium text-warning'
                : 'text-muted-foreground'
            }
          />
        )
      },
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t('nav.sales') },
          { label: t('nav.orders') },
        ]}
        title={t('orders.title')}
        description={t('orders.desc')}
      />

      <KpiGrid>
        <KpiCard
          label={t('orders.total')}
          value={active.length}
          icon={ShoppingCart}
        />
        <KpiCard
          label={t('status.requested')}
          value={active.filter((order) => order.status === 'requested').length}
          icon={Clock}
          tone="warning"
        />
        <KpiCard
          label={t('status.ready')}
          value={active.filter((order) => order.status === 'ready').length}
          icon={Truck}
        />
        <KpiCard
          label={t('orders.outstandingPayment')}
          value={formatIDR(
            active.reduce(
              (sum, order) => sum + orderOutstanding(order),
              0,
            ),
          )}
          icon={CircleDollarSign}
          tone="warning"
          href="/receivables"
        />
      </KpiGrid>

      <DataTable
        rows={sorted}
        columns={columns}
        getRowId={(order) => order.id}
        searchText={(order) =>
          `${order.id} ${customerByIdMap.get(order.customerId)?.name} ${order.items
            .map((item) => productByIdMap.get(item.productId)?.name)
            .join(' ')}`
        }
        filters={[
          {
            value: 'all',
            label: t('common.all'),
            predicate: () => true,
          },
          {
            value: 'requested',
            label: t('status.requested'),
            predicate: (order) => order.status === 'requested',
          },
          {
            value: 'ready',
            label: t('status.ready'),
            predicate: (order) => order.status === 'ready',
          },
          {
            value: 'delivered',
            label: t('status.delivered'),
            predicate: (order) => order.status === 'delivered',
          },
          {
            value: 'unpaid',
            label: t('pay.unpaid'),
            predicate: (order) =>
              order.status !== 'cancelled' &&
              orderPaymentStatus(order) !== 'paid',
          },
          {
            value: 'cancelled',
            label: t('status.cancelled'),
            predicate: (order) => order.status === 'cancelled',
          },
        ]}
        addLabel={t('orders.add')}
        onAdd={() => router.push('/orders/new')}
        rowHref={(order) => `/orders/${order.id}`}
        contextActions={(order) => [
          {
            label: t('orders.viewInvoice'),
            icon: FileText,
            href: '/invoices',
          },
          {
            label: t('common.delete'),
            onSelect: () =>
              setDeleteTarget(
                persistedOrders.find((row) => row.id === order.id) ?? null,
              ),
          },
        ]}
        deletable={false}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title={t('deleteDialog.previewTitle')}
        description={
          deleteTarget
            ? `Delete order ${deleteTarget.id}? Only requested orders without related activity can be deleted.`
            : t('deleteDialog.previewBody')
        }
        confirmLabel={t('common.delete')}
        onConfirm={() => {
          void deleteOrder()
        }}
      />
    </>
  )
}
