'use client'
import useSWR from 'swr'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { appToast as toast } from '@/lib/toast'
import { CheckCircle2, FileText, HandCoins, Printer, RotateCcw, Truck, Users } from 'lucide-react'
import { useState } from 'react'
import { DataTable, IdCell, Money, type Column } from '@/components/common/data-table'
import { DocumentPreview } from '@/components/common/document-preview'
import { FormDialog } from '@/components/common/form-dialog'
import { KpiCard, KpiGrid } from '@/components/common/kpi-card'
import { PageHeader } from '@/components/common/page-header'
import { PaymentStatusBadge, Pill } from '@/components/common/status-badge'
import { useApp } from '@/components/providers'
import {
  customerById,
  customers,
  isOverdue,
  type Order,
  orderById,
  orderOutstanding,
  orderPaymentStatus,
  orders,
  orderTotal,
  type Party,
  productById,
  products,
  type Replacement,
  replacements,
  TODAY,
} from '@/lib/data'
import { formatDate, formatIDR } from '@/lib/format'

const custStats = (c: Party) => {
  const list = orders.filter((o) => o.customerId === c.id && o.status !== 'cancelled')
  return {
    count: list.length,
    lifetime: list.reduce((s, o) => s + orderTotal(o), 0),
    outstanding: list.reduce((s, o) => s + orderOutstanding(o), 0),
    last: list.map((o) => o.date).sort().at(-1) ?? null,
  }
}

type PersistedCustomer = {
  id: string
  businessId: string
  name: string
  phone: string | null
  address: string | null
  location: string | null
}

type CustomerOrderRow = {
  id: string
  customerId: string
  status: string
  items: Array<{ qty: number; price: string | number; discount?: string | number }>
}
type CustomerPaymentRow = { orderId: string | null; amount: string | number }

const customersFetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch customers')
  return response.json()
}

export function CustomersView() {
  const { t } = useApp()
  const [open, setOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<PersistedCustomer | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PersistedCustomer | null>(null)

  const { data: business, error: businessError } = useSWR<{ id: string }>(
    '/api/businesses/current',
    customersFetcher,
  )

  const {
    data: customerRows,
    error: customersError,
    isLoading,
    mutate,
  } = useSWR<PersistedCustomer[]>(
    business?.id
      ? `/api/customers?businessId=${encodeURIComponent(business.id)}`
      : null,
    customersFetcher,
  )

  const rows = customerRows ?? []
  const { data: customerOrders } = useSWR<CustomerOrderRow[]>(
    business?.id ? `/api/orders?businessId=${encodeURIComponent(business.id)}` : null,
    customersFetcher,
  )
  const { data: customerPayments } = useSWR<CustomerPaymentRow[]>(
    business?.id ? `/api/payments?businessId=${encodeURIComponent(business.id)}` : null,
    customersFetcher,
  )
  const activeCustomerOrders = (customerOrders ?? []).filter((order) => order.status !== 'cancelled')
  const orderTotalById = new Map(activeCustomerOrders.map((order) => [
    order.id,
    order.items.reduce((sum, item) => sum + Number(item.qty) * Number(item.price) - Number(item.discount ?? 0), 0),
  ]))
  const paidByOrderId = new Map<string, number>()
  for (const payment of customerPayments ?? []) {
    if (payment.orderId) paidByOrderId.set(payment.orderId, (paidByOrderId.get(payment.orderId) ?? 0) + Number(payment.amount))
  }
  const customerDebt = (customerId: string) => activeCustomerOrders
    .filter((order) => order.customerId === customerId)
    .reduce((sum, order) => sum + Math.max((orderTotalById.get(order.id) ?? 0) - (paidByOrderId.get(order.id) ?? 0), 0), 0)
  const totalCustomerReceivable = [...orderTotalById.entries()].reduce((sum, [id, total]) => sum + Math.max(total - (paidByOrderId.get(id) ?? 0), 0), 0)
  const lifetimeCustomerSales = [...orderTotalById.values()].reduce((sum, total) => sum + total, 0)

  const saveCustomer = async (values: Record<string, string>) => {
    if (!business?.id) throw new Error('Business not found')
    const editing = editingCustomer
    const response = await fetch(
      editing
        ? `/api/customers/${encodeURIComponent(editing.id)}?businessId=${encodeURIComponent(business.id)}`
        : '/api/customers',
      {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          name: values.name?.trim(),
          phone: values.phone?.trim() || null,
          address: values.address?.trim() || null,
        }),
      },
    )
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Failed to save customer')
    await mutate()
    setOpen(false)
    setEditingCustomer(null)
  }

  const deleteCustomer = async () => {
    if (!business?.id || !deleteTarget) return
    const response = await fetch(
      `/api/customers/${encodeURIComponent(deleteTarget.id)}?businessId=${encodeURIComponent(business.id)}`,
      { method: 'DELETE' },
    )
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Failed to delete customer')
    setDeleteTarget(null)
    await mutate()
  }

  const columns: Column<PersistedCustomer>[] = [
    {
      key: 'id',
      header: 'ID',
      cell: (c) => <IdCell>{c.id}</IdCell>,
    },
    {
      key: 'name',
      header: t('common.customer'),
      cell: (c) => <span className="font-medium">{c.name}</span>,
    },
    {
      key: 'phone',
      header: t('common.phone'),
      cell: (c) => (
        <span className="font-mono text-xs text-muted-foreground">
          {c.phone || '—'}
        </span>
      ),
    },
    {
      key: 'address',
      header: t('common.address'),
      cell: (c) => (
        <span className="block max-w-56 truncate text-muted-foreground">
          {c.address || '—'}
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t('nav.sales') },
          { label: t('nav.customers') },
        ]}
        title={t('customers.title')}
        description={t('customers.desc')}
      />

      <KpiGrid>
        <KpiCard
          label={t('customers.count')}
          value={rows.length}
          icon={Users}
        />
        <KpiCard
          label={t('customers.withDebt')}
          value={customerOrders && customerPayments ? rows.filter((customer) => customerDebt(customer.id) > 0).length : '—'}
          icon={HandCoins}
          tone="warning"
        />
        <KpiCard
          label={t('customers.totalReceivable')}
          value={customerOrders && customerPayments ? formatIDR(totalCustomerReceivable) : '—'}
          icon={HandCoins}
          tone="warning"
          href="/receivables"
        />
        <KpiCard
          label={t('customers.lifetime')}
          value={customerOrders ? formatIDR(lifetimeCustomerSales) : '—'}
          icon={FileText}
          tone="success"
        />
      </KpiGrid>

      {businessError || customersError ? (
        <p className="py-4 text-sm text-destructive">
          Failed to load customers. Please refresh and try again.
        </p>
      ) : isLoading || !business ? (
        <p className="py-4 text-sm text-muted-foreground">
          Loading customers...
        </p>
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(c) => c.id}
          searchText={(c) =>
            `${c.id} ${c.name} ${c.phone ?? ''} ${c.address ?? ''}`
          }
          addLabel={t('customers.add')}
          onAdd={() => {
            setEditingCustomer(null)
            setOpen(true)
          }}
          contextActions={(customer) => [
            {
              label: t('common.edit'),
              onSelect: () => {
                setEditingCustomer(customer)
                setOpen(true)
              },
            },
            {
              label: t('common.delete'),
              onSelect: () => setDeleteTarget(customer),
            },
          ]}
        />
      )}

      <FormDialog
        key={editingCustomer?.id ?? 'new-customer'}
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) setEditingCustomer(null)
        }}
        title={editingCustomer ? t('common.edit') : t('customers.add')}
        submitLabel={editingCustomer ? t('common.save') : t('customers.add')}
        fields={[
          {
            name: 'name',
            label: t('common.customer'),
            placeholder: 'Toko …',
            defaultValue: editingCustomer?.name ?? '',
          },
          {
            name: 'phone',
            label: t('common.phone'),
            placeholder: '08xx-xxxx-xxxx',
            defaultValue: editingCustomer?.phone ?? '',
          },
          {
            name: 'address',
            label: t('common.address'),
            type: 'textarea',
            defaultValue: editingCustomer?.address ?? '',
          },
        ]}
        onSubmit={saveCustomer}
        persisted
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeleteTarget(null)
        }}
        title={t('common.delete')}
        description={
          deleteTarget
            ? `Delete customer ${deleteTarget.name}? Customers with order history cannot be deleted.`
            : ''
        }
        confirmLabel={t('common.delete')}
        onConfirm={() => {
          void deleteCustomer().catch((error) => {
            toast.error(error instanceof Error ? error.message : 'Failed to delete customer')
          })
        }}
      />
    </>
  )
}


export function InvoicesView() {
  const { t } = useApp()
  const [preview, setPreview] = useState<Order | null>(null)
  const invoices = [...orders].filter((o) => o.status !== 'cancelled').sort((a, b) => (a.id < b.id ? 1 : -1))

  const columns: Column<Order>[] = [
    { key: 'id', header: t('invoices.no'), cell: (o) => <IdCell>{o.id}</IdCell> },
    { key: 'date', header: t('invoices.issued'), cell: (o) => <span className="font-mono text-xs text-muted-foreground">{formatDate(o.date)}</span> },
    { key: 'customer', header: t('common.customer'), cell: (o) => <span className="font-medium">{customerById(o.customerId)?.name}</span> },
    {
      key: 'due',
      header: t('common.dueDate'),
      cell: (o) =>
        o.dueDate ? (
          <span className={`font-mono text-xs ${isOverdue(o.dueDate, orderOutstanding(o)) ? 'text-destructive' : 'text-muted-foreground'}`}>{formatDate(o.dueDate)}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    { key: 'status', header: t('common.status'), sortValue: (o) => orderPaymentStatus(o), cell: (o) => <PaymentStatusBadge status={orderPaymentStatus(o)} /> },
    { key: 'total', header: t('common.total'), align: 'right', cell: (o) => <Money value={orderTotal(o)} /> },
    { key: 'outstanding', header: t('common.outstanding'), align: 'right', cell: (o) => <Money value={orderOutstanding(o)} className={orderOutstanding(o) > 0 ? 'text-warning' : 'text-muted-foreground'} /> },
  ]

  return (
    <>
      <PageHeader breadcrumbs={[{ label: t('nav.sales') }, { label: t('nav.invoices') }]} title={t('invoices.title')} description={t('invoices.desc')} />
      <KpiGrid>
        <KpiCard label={t('invoices.count')} value={invoices.length} icon={FileText} />
        <KpiCard label={t('pay.paid')} value={invoices.filter((o) => orderPaymentStatus(o) === 'paid').length} icon={CheckCircle2} tone="success" />
        <KpiCard label={t('pay.partial')} value={invoices.filter((o) => orderPaymentStatus(o) === 'partial').length} icon={HandCoins} tone="warning" />
        <KpiCard label={t('pay.unpaid')} value={invoices.filter((o) => orderPaymentStatus(o) === 'unpaid').length} icon={HandCoins} tone="destructive" />
      </KpiGrid>
      <DataTable
        rows={invoices}
        columns={columns}
        getRowId={(o) => o.id}
        searchText={(o) => `${o.id} ${customerById(o.customerId)?.name}`}
        filters={[
          { value: 'all', label: t('common.all'), predicate: () => true },
          { value: 'unpaid', label: t('pay.unpaid'), predicate: (o) => orderPaymentStatus(o) === 'unpaid' },
          { value: 'partial', label: t('pay.partial'), predicate: (o) => orderPaymentStatus(o) === 'partial' },
          { value: 'paid', label: t('pay.paid'), predicate: (o) => orderPaymentStatus(o) === 'paid' },
        ]}
        rowHref={(o) => `/orders/${o.id}`}
        editable={false}
        deletable={false}
        contextActions={(o) => [{ label: t('common.preview'), icon: Printer, onSelect: () => setPreview(o) }]}
      />
      {preview && <DocumentPreview order={preview} kind="invoice" open onOpenChange={(v) => !v && setPreview(null)} />}
    </>
  )
}

export function DeliveriesView() {
  const { t } = useApp()
  const [preview, setPreview] = useState<Order | null>(null)
  const delivered = orders.filter((o) => o.delivery).sort((a, b) => (a.delivery!.id < b.delivery!.id ? 1 : -1))
  const awaiting = orders.filter((o) => o.status === 'ready' || o.status === 'requested')

  const columns: Column<Order>[] = [
    { key: 'id', header: t('deliveries.id'), cell: (o) => <IdCell>{o.delivery!.id}</IdCell> },
    { key: 'date', header: t('common.date'), cell: (o) => <span className="font-mono text-xs text-muted-foreground">{formatDate(o.delivery!.date)}</span> },
    { key: 'order', header: t('returns.order'), cell: (o) => <span className="font-mono text-xs">{o.id}</span> },
    { key: 'customer', header: t('common.customer'), cell: (o) => <span className="font-medium">{customerById(o.customerId)?.name}</span> },
    { key: 'method', header: t('orders.method'), cell: (o) => <Pill tone={o.delivery!.method === 'pickup' ? 'neutral' : 'primary'}>{t(`method.${o.delivery!.method}`)}</Pill> },
    { key: 'recipient', header: t('orders.recipient'), cell: (o) => o.delivery!.recipient },
    { key: 'transport', header: t('orders.transportCost'), align: 'right', cell: (o) => <Money value={o.delivery!.transportCost} className={o.delivery!.transportCost === 0 ? 'text-muted-foreground' : ''} /> },
  ]

  return (
    <>
      <PageHeader breadcrumbs={[{ label: t('nav.sales') }, { label: t('nav.deliveries') }]} title={t('deliveries.title')} description={t('deliveries.desc')} />
      <KpiGrid>
        <KpiCard label={t('deliveries.count')} value={delivered.length} icon={Truck} />
        <KpiCard label={t('deliveries.awaiting')} value={awaiting.length} icon={Truck} tone="warning" href="/orders" />
        <KpiCard label={t('deliveries.transport')} value={formatIDR(delivered.reduce((s, o) => s + o.delivery!.transportCost, 0))} icon={HandCoins} />
        <KpiCard label={t('method.pickup')} value={delivered.filter((o) => o.delivery!.method === 'pickup').length} icon={Users} tone="neutral" />
      </KpiGrid>
      <DataTable
        rows={delivered}
        columns={columns}
        getRowId={(o) => o.delivery!.id}
        searchText={(o) => `${o.delivery!.id} ${o.id} ${customerById(o.customerId)?.name} ${o.delivery!.recipient}`}
        filters={[
          { value: 'all', label: t('common.all'), predicate: () => true },
          { value: 'own', label: t('method.own'), predicate: (o) => o.delivery!.method === 'own' },
          { value: 'expedition', label: t('method.expedition'), predicate: (o) => o.delivery!.method === 'expedition' },
          { value: 'pickup', label: t('method.pickup'), predicate: (o) => o.delivery!.method === 'pickup' },
        ]}
        rowHref={(o) => `/orders/${o.id}`}
        contextActions={(o) => [{ label: t('orders.suratJalan'), icon: Printer, onSelect: () => setPreview(o) }]}
      />
      {preview && <DocumentPreview order={preview} kind="delivery" open onOpenChange={(v) => !v && setPreview(null)} />}
    </>
  )
}

export function ReturnsView() {
  const { t } = useApp()
  const [open, setOpen] = useState(false)

  const columns: Column<Replacement>[] = [
    { key: 'id', header: t('returns.id'), cell: (r) => <IdCell>{r.id}</IdCell> },
    { key: 'date', header: t('common.date'), cell: (r) => <span className="font-mono text-xs text-muted-foreground">{formatDate(r.date)}</span> },
    { key: 'order', header: t('returns.order'), cell: (r) => <span className="font-mono text-xs">{r.orderId}</span> },
    { key: 'customer', header: t('common.customer'), cell: (r) => customerById(orderById(r.orderId)?.customerId ?? '')?.name ?? '—' },
    { key: 'product', header: t('common.product'), cell: (r) => <span className="font-medium">{productById(r.productId)?.name}</span> },
    { key: 'qty', header: t('common.qty'), align: 'right', cell: (r) => <span className="font-mono tabular-nums">{r.qty}</span> },
    { key: 'reason', header: t('returns.reason'), cell: (r) => <span className="text-muted-foreground">{r.reason}</span> },
    { key: 'status', header: t('common.status'), cell: (r) => (r.delivered ? <Pill tone="success">{t('returns.delivered')}</Pill> : <Pill tone="warning">{t('returns.outstanding')}</Pill>) },
  ]

  return (
    <>
      <PageHeader breadcrumbs={[{ label: t('nav.sales') }, { label: t('nav.returns') }]} title={t('returns.title')} description={t('returns.desc')} />
      <KpiGrid>
        <KpiCard label={t('returns.title')} value={replacements.length} icon={RotateCcw} />
        <KpiCard label={t('returns.outstanding')} value={replacements.filter((r) => !r.delivered).length} icon={RotateCcw} tone="warning" />
        <KpiCard label={t('returns.delivered')} value={replacements.filter((r) => r.delivered).length} icon={CheckCircle2} tone="success" />
        <KpiCard label={t('reports.units')} value={replacements.reduce((s, r) => s + r.qty, 0)} icon={Truck} tone="neutral" />
      </KpiGrid>
      <DataTable
        rows={replacements}
        columns={columns}
        getRowId={(r) => r.id}
        searchText={(r) => `${r.id} ${r.orderId} ${productById(r.productId)?.name} ${r.reason}`}
        filters={[
          { value: 'all', label: t('common.all'), predicate: () => true },
          { value: 'out', label: t('returns.outstanding'), predicate: (r) => !r.delivered },
          { value: 'done', label: t('returns.delivered'), predicate: (r) => r.delivered },
        ]}
        rowHref={(r) => `/orders/${r.orderId}`}
        addLabel={t('returns.add')}
        onAdd={() => setOpen(true)}
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t('returns.add')}
        fields={[
          { name: 'order', label: t('returns.order'), type: 'select', half: true, options: orders.filter((o) => o.status === 'delivered').map((o) => ({ value: o.id, label: o.id })) },
          { name: 'date', label: t('common.date'), type: 'date', defaultValue: TODAY, half: true },
          { name: 'product', label: t('common.product'), type: 'select', half: true, options: products.map((p) => ({ value: p.id, label: p.name })) },
          { name: 'qty', label: t('common.qty'), type: 'number', min: 1, defaultValue: '1', half: true },
          { name: 'reason', label: t('returns.reason'), type: 'textarea' },
        ]}
      />
    </>
  )
}
