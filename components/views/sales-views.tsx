'use client'
import useSWR, { useSWRConfig } from 'swr'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { appToast as toast } from '@/lib/toast'
import { Ban, CheckCircle2, Eye, FileText, HandCoins, Pencil, Printer, RotateCcw, Trash2, Truck, Users } from 'lucide-react'
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
  lineSubtotal,
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
    if (!response.ok) throw new Error(result.error || t('toast.customerDeleteFailed'))
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
            ? t('customers.deleteConfirm', { name: deleteTarget.name })
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


type InvoiceOrderRow = { id: string; date: string; customerId: string; status: Order['status']; dueDate: string | null; notes: string | null; items: Array<{ productId: string; qty: number; price: string | number; discount?: string | number; unitCost?: string | number }> }
type InvoicePaymentRow = { id: string; date: string; amount: string | number; account: string; orderId: string | null }
type InvoiceCustomerRow = { id: string; name: string; address?: string | null }
type InvoiceProductRow = { id: string; name: string }

export function InvoicesView() {
  const { t } = useApp()
  const [preview, setPreview] = useState<Order | null>(null)
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([])
  const { data: business, error: businessError } = useSWR<{ id: string }>('/api/businesses/current', customersFetcher)
  const { data: orderRows, error: ordersError, isLoading } = useSWR<InvoiceOrderRow[]>(business?.id ? `/api/orders?businessId=${encodeURIComponent(business.id)}` : null, customersFetcher)
  const { data: paymentRows, error: paymentsError } = useSWR<InvoicePaymentRow[]>(business?.id ? `/api/payments?businessId=${encodeURIComponent(business.id)}` : null, customersFetcher)
  const { data: customerRows, error: customersError } = useSWR<InvoiceCustomerRow[]>(business?.id ? `/api/customers?businessId=${encodeURIComponent(business.id)}` : null, customersFetcher)
  const { data: productRows, error: productsError } = useSWR<InvoiceProductRow[]>(business?.id ? `/api/products?businessId=${encodeURIComponent(business.id)}` : null, customersFetcher)
  const customerMap = new Map((customerRows ?? []).map((customer) => [customer.id, customer]))
  const productMap = new Map((productRows ?? []).map((product) => [product.id, product]))
  const invoices: Order[] = (orderRows ?? []).filter((o) => o.status !== 'cancelled').map((row) => ({
    ...row,
    notes: row.notes ?? '',
    items: row.items.map((item) => ({ ...item, price: Number(item.price), discount: Number(item.discount ?? 0), unitCost: Number(item.unitCost ?? 0) })),
    payments: (paymentRows ?? []).filter((payment) => payment.orderId === row.id).map((payment) => ({ id: payment.id, date: payment.date, amount: Number(payment.amount), account: payment.account })),
    delivery: null,
  }))
  const columns: Column<Order>[] = [
    { key: 'id', header: t('invoices.no'), cell: (o) => <IdCell>{o.id}</IdCell> },
    { key: 'date', header: t('invoices.issued'), cell: (o) => <span className="font-mono text-xs text-muted-foreground">{formatDate(o.date)}</span> },
    { key: 'customer', header: t('common.customer'), cell: (o) => <span className="font-medium">{customerMap.get(o.customerId)?.name ?? o.customerId}</span> },
    { key: 'due', header: t('common.dueDate'), cell: (o) => o.dueDate ? <span className={`font-mono text-xs ${isOverdue(o.dueDate, orderOutstanding(o)) ? 'text-destructive' : 'text-muted-foreground'}`}>{formatDate(o.dueDate)}</span> : <span className="text-xs text-muted-foreground">—</span> },
    { key: 'status', header: t('common.status'), sortValue: (o) => orderPaymentStatus(o), cell: (o) => <PaymentStatusBadge status={orderPaymentStatus(o)} /> },
    { key: 'total', header: t('common.total'), align: 'right', cell: (o) => <Money value={orderTotal(o)} /> },
    { key: 'outstanding', header: t('common.outstanding'), align: 'right', cell: (o) => <Money value={orderOutstanding(o)} className={orderOutstanding(o) > 0 ? 'text-warning' : 'text-muted-foreground'} /> },
  ]
  const loadError = businessError || ordersError || paymentsError || customersError || productsError
  return (
    <>
      <PageHeader breadcrumbs={[{ label: t('nav.sales') }, { label: t('nav.invoices') }]} title={t('invoices.title')} description={t('invoices.desc')} />
      {loadError ? <p role="alert" className="py-4 text-sm text-destructive">{loadError.message}</p> : isLoading || !business || !orderRows || !paymentRows || !customerRows || !productRows ? <p className="py-4 text-sm text-muted-foreground">{t('common.loading')}</p> : <>
        <KpiGrid>
          <KpiCard label={t('invoices.count')} value={invoices.length} icon={FileText} />
          <KpiCard label={t('pay.paid')} value={invoices.filter((o) => orderPaymentStatus(o) === 'paid').length} icon={CheckCircle2} tone="success" />
          <KpiCard label={t('pay.partial')} value={invoices.filter((o) => orderPaymentStatus(o) === 'partial').length} icon={HandCoins} tone="warning" />
          <KpiCard label={t('pay.unpaid')} value={invoices.filter((o) => orderPaymentStatus(o) === 'unpaid').length} icon={HandCoins} tone="destructive" />
        </KpiGrid>
        <DataTable rows={invoices} columns={columns} getRowId={(o) => o.id}
          selectable selectedRowIds={selectedInvoiceIds} onSelectedRowIdsChange={setSelectedInvoiceIds}
          toolbarExtra={<button type="button" disabled={selectedInvoiceIds.length === 0} onClick={() => window.print()} className="inline-flex h-8 items-center gap-2 rounded-md border px-3 text-sm transition-colors hover:bg-blue-50 hover:text-blue-700 disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-blue-950/40"><Printer className="size-4" />Print selected ({selectedInvoiceIds.length})</button>} searchText={(o) => `${o.id} ${customerMap.get(o.customerId)?.name ?? ''}`}
          filters={[
            { value: 'all', label: t('common.all'), predicate: () => true },
            { value: 'unpaid', label: t('pay.unpaid'), predicate: (o) => orderPaymentStatus(o) === 'unpaid' },
            { value: 'partial', label: t('pay.partial'), predicate: (o) => orderPaymentStatus(o) === 'partial' },
            { value: 'paid', label: t('pay.paid'), predicate: (o) => orderPaymentStatus(o) === 'paid' },
          ]}
          rowHref={(o) => `/orders/${o.id}`} editable={false} deletable={false}
          contextActions={(o) => [{ label: t('common.preview'), icon: Printer, onSelect: () => setPreview(o) }]} />
      </>}
      {selectedInvoiceIds.length > 0 && (
        <div className="batch-invoice-print" aria-hidden="true">
          <style>{`@page { size: A4 portrait; margin: 0; } @media print { body * { visibility: hidden !important; } .batch-invoice-print, .batch-invoice-print * { visibility: visible !important; } .batch-invoice-print { display: block !important; position: absolute; inset: 0; width: 210mm; } .batch-invoice-sheet { display: grid !important; width: 210mm; height: 297mm; grid-template-columns: 105mm 105mm; grid-template-rows: 148.5mm 148.5mm; overflow: hidden; break-after: page; page-break-after: always; } .batch-invoice-card { width: 105mm; height: 148.5mm; box-sizing: border-box; padding: 7mm; overflow: hidden; break-inside: avoid; page-break-inside: avoid; } }`}</style>
          {Array.from({ length: Math.ceil(selectedInvoiceIds.length / 4) }, (_, sheetIndex) => (
            <div key={sheetIndex} className="batch-invoice-sheet hidden print:grid">
              {invoices.filter((invoice) => selectedInvoiceIds.slice(sheetIndex * 4, sheetIndex * 4 + 4).includes(invoice.id)).map((invoice) => (
            <article key={invoice.id} className="batch-invoice-card hidden print:block bg-white text-black text-[9px] leading-tight">
              <div className="border-t-2 border-black pt-2 flex items-start justify-between"><h2 className="text-xl font-black">INVOICE</h2><span className="whitespace-nowrap">Page 1 of 1</span></div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div><p>Yth. Kepada</p><p className="mt-1 font-medium">{customerMap.get(invoice.customerId)?.name ?? invoice.customerId}</p><p className="mt-1">{customerMap.get(invoice.customerId)?.address ?? ''}</p></div>
                <dl className="grid grid-cols-[max-content_1fr] gap-x-2 gap-y-2"><dt>No. Invoice:</dt><dd className="whitespace-nowrap">{invoice.id}</dd><dt>Tanggal:</dt><dd className="whitespace-nowrap">{formatDate(invoice.date)}</dd><dt>Jatuh Tempo:</dt><dd className="whitespace-nowrap">{invoice.dueDate ? formatDate(invoice.dueDate) : '-'}</dd></dl>
              </div>
              <table className="mt-4 w-full table-fixed border-collapse text-[8px]"><colgroup><col className="w-[10%]"/><col className="w-[50%]"/><col className="w-[20%]"/><col className="w-[20%]"/></colgroup><thead><tr className="border-y-2 border-black"><th className="py-1">QTY</th><th className="py-1 text-left">DESKRIPSI</th><th className="py-1 text-right">HARGA</th><th className="py-1 text-right">JUMLAH</th></tr></thead><tbody>{Array.from({length:Math.max(12,invoice.items.length)},(_,i)=>{const item=invoice.items[i];return <tr key={`${item?.productId ?? 'blank'}-${i}`} className="h-[5mm] border-b border-black"><td className="text-right pr-1">{item?.qty ?? ''}</td><td className="px-1">{item ? productMap.get(item.productId)?.name ?? item.productId : ''}</td><td className="text-right">{item ? formatIDR(item.price) : ''}</td><td className="text-right">{item ? formatIDR(lineSubtotal(item)) : ''}</td></tr>})}</tbody></table>
              <div className="mt-3 grid grid-cols-2 gap-3"><div><p className="font-bold">TOTAL TAGIHAN</p><p className="mt-2 text-base font-bold">{formatIDR(orderTotal(invoice))}</p></div><dl className="space-y-2 text-[8px]"><div className="flex justify-between gap-2"><dt>HARGA</dt><dd>{formatIDR(invoice.items.reduce((sum,item)=>sum+Number(item.qty)*Number(item.price),0))}</dd></div><div className="flex justify-between gap-2"><dt>DISKON</dt><dd>{formatIDR(invoice.items.reduce((sum,item)=>sum+Number(item.discount ?? 0),0))}</dd></div><div className="flex justify-between gap-2"><dt>TOTAL</dt><dd>{formatIDR(orderTotal(invoice))}</dd></div></dl></div>
              <div className="mt-10 grid grid-cols-2 text-center"><span>Tanda Terima</span><span>Hormat Kami</span></div><div className="mt-6 text-[8px]"><p>Metode Pembayaran:</p><p>Cash atau Transfer Bank BCA | No. Rekening: 123-456-789</p></div>
            </article>
          ))}
            </div>
          ))}
        </div>
      )}
      {preview && <DocumentPreview order={preview} kind="invoice" open onOpenChange={(v) => !v && setPreview(null)} customerOverride={customerMap.get(preview.customerId)} productNames={Object.fromEntries([...productMap.entries()].map(([id, product]) => [id, product.name]))} />}
    </>
  )
}

type PersistedDelivery = {
  id: string
  date: string
  method: 'own' | 'expedition' | 'pickup'
  recipient: string
  driverName: string
  address: string
  transportCost: string | number
  transportAccount: string
  orders: Array<{ id: string; customerId: string; customerName: string }>
}
type DeliveryOrderOption = { id: string; status: string; customerId: string; date: string }

export function DeliveriesView() {
  const { t, locale } = useApp()
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const { data: business } = useSWR<{ id: string }>('/api/businesses/current', customersFetcher)
  const { data: rows, error, isLoading, mutate } = useSWR<PersistedDelivery[]>(
    business?.id ? `/api/deliveries?businessId=${encodeURIComponent(business.id)}` : null,
    customersFetcher,
  )
  const { data: financialAccounts } = useSWR<Array<{ id: string; name: string; type: "cash" | "bank"; active: boolean }>>(business?.id ? `/api/financial-accounts?businessId=${encodeURIComponent(business.id)}` : null, customersFetcher)
  const { data: orderRows, mutate: mutateOrders } = useSWR<DeliveryOrderOption[]>(
    business?.id ? `/api/orders?businessId=${encodeURIComponent(business.id)}` : null,
    customersFetcher,
  )
  const delivered = rows ?? []
  const awaiting = (orderRows ?? []).filter((o) => o.status === 'ready' || o.status === 'requested')
  const columns: Column<PersistedDelivery>[] = [
    { key: 'id', header: t('deliveries.id'), cell: (d) => <IdCell>{d.id}</IdCell> },
    { key: 'date', header: t('common.date'), cell: (d) => <span className="font-mono text-xs text-muted-foreground">{formatDate(d.date)}</span> },
    { key: 'orders', header: t('returns.order'), cell: (d) => <span className="font-mono text-xs">{d.orders.map((o) => o.id).join(', ')}</span> },
    { key: 'customer', header: t('common.customer'), cell: (d) => <span className="font-medium">{[...new Set(d.orders.map((o) => o.customerName))].join(', ')}</span> },
    { key: 'method', header: t('orders.method'), cell: (d) => <Pill tone={d.method === 'pickup' ? 'neutral' : 'primary'}>{t(`method.${d.method}`)}</Pill> },
    { key: 'recipient', header: t('orders.recipient'), cell: (d) => d.recipient || '—' },
    { key: 'driver', header: 'Driver name', cell: (d) => d.driverName || '—' },
    { key: 'transport', header: t('orders.transportCost'), align: 'right', cell: (d) => <Money value={Number(d.transportCost)} className={Number(d.transportCost) === 0 ? 'text-muted-foreground' : ''} /> },
  ]
  const saveDelivery = async (values: Record<string, string>) => {
    if (!business?.id) throw new Error('Business not found')
    const orderIds = (values.orderIds ?? '').split(',').filter(Boolean)
    if (!orderIds.length) throw new Error('Select at least one Order')
    const response = await fetch('/api/deliveries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: business.id, orderIds, date: values.date, method: values.method,
        recipient: values.recipient?.trim() ?? '', driverName: values.driverName?.trim() ?? '', address: values.address?.trim() ?? '',
        transportCost: Number(values.transportCost || 0), transportAccount: values.transportAccount || "",
      }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Failed to create Delivery')
    await Promise.all([mutate(), mutateOrders()])
    setOpen(false)
  }
  return (
    <>
      <PageHeader breadcrumbs={[{ label: t('nav.sales') }, { label: t('nav.deliveries') }]} title={t('deliveries.title')} description={t('deliveries.desc')} />
      <KpiGrid>
        <KpiCard label={t('deliveries.count')} value={delivered.length} icon={Truck} />
        <KpiCard label={t('deliveries.awaiting')} value={awaiting.length} icon={Truck} tone="warning" href="/orders" />
        <KpiCard label={t('deliveries.transport')} value={formatIDR(delivered.reduce((sum, d) => sum + Number(d.transportCost), 0))} icon={HandCoins} />
        <KpiCard label={t('method.pickup')} value={delivered.filter((d) => d.method === 'pickup').length} icon={Users} tone="neutral" />
      </KpiGrid>
      {error ? <p role="alert" className="py-4 text-sm text-destructive">Failed to load deliveries: {error.message}. Please refresh and try again.</p> : isLoading || !business ? <p className="py-4 text-sm text-muted-foreground">Loading deliveries...</p> : (
        <DataTable
          rows={delivered}
          columns={columns}
          getRowId={(d) => d.id}
          selectable selectedRowIds={selectedDeliveryIds} onSelectedRowIdsChange={setSelectedDeliveryIds}
          searchText={(d) => `${d.id} ${d.orders.map((o) => o.id + ' ' + o.customerName).join(' ')} ${d.recipient} ${d.driverName}`}
          filters={[
            { value: 'all', label: t('common.all'), predicate: () => true },
            { value: 'own', label: t('method.own'), predicate: (d) => d.method === 'own' },
            { value: 'expedition', label: t('method.expedition'), predicate: (d) => d.method === 'expedition' },
            { value: 'pickup', label: t('method.pickup'), predicate: (d) => d.method === 'pickup' },
          ]}
          rowHref={(d) => `/orders/${d.orders[0]?.id ?? ''}`}
          contextActions={(d) => [{ label: 'Delivery Note', icon: Printer, onSelect: () => { const orderId = d.orders[0]?.id; if (orderId) window.location.href = `/orders/${encodeURIComponent(orderId)}` } }]}
          toolbarExtra={<button type="button" disabled={selectedDeliveryIds.length !== 1} onClick={() => { const selected = delivered.find((delivery) => delivery.id === selectedDeliveryIds[0]); const orderId = selected?.orders[0]?.id; if (orderId) window.location.href = `/orders/${encodeURIComponent(orderId)}` }} className="inline-flex h-8 items-center gap-2 rounded-md border px-3 text-sm transition-colors hover:bg-blue-50 hover:text-blue-700 disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-blue-950/40"><Printer className="size-4" />Print Delivery Note</button>}
           addLabel={t('deliveries.title')}
          onAdd={() => setOpen(true)}
        />
      )}
      <FormDialog
        key={open ? 'new-delivery-open' : 'new-delivery-closed'}
        open={open}
        onOpenChange={setOpen}
        title={t('deliveries.title')}
        description={t('deliveries.createHelp')}
        submitLabel={t('common.save')}
        persisted
        fields={[
          { name: 'orderIds', label: 'Orders (select multiple with Ctrl/Cmd)', type: 'multiselect', options: awaiting.map((o) => ({ value: o.id, label: `${o.id} — ${customerById(o.customerId)?.name ?? o.customerId}` })), required: true, hint: 'On mobile, use the multi-select control to choose multiple Orders.' },
          { name: 'date', label: t('common.date'), type: 'date', defaultValue: TODAY, half: true },
          { name: 'method', label: t('orders.method'), type: 'select', defaultValue: 'own', options: [{ value: 'own', label: t('method.own') }, { value: 'expedition', label: t('method.expedition') }, { value: 'pickup', label: t('method.pickup') }], half: true },
          { name: 'recipient', label: t('orders.recipient'), required: false, placeholder: 'Recipient name', half: true },
          { name: 'driverName', label: 'Driver name', placeholder: 'Enter driver name', half: true },
          { name: 'address', label: t('common.address'), type: 'textarea', required: false },
          { name: 'transportCost', label: t('orders.transportCost'), type: 'number', defaultValue: '0', min: 0 },
          { name: 'transportAccount', label: locale === 'id' ? 'Akun kas/bank biaya pengiriman' : 'Cash/bank account for transport', type: 'select', options: (financialAccounts ?? []).filter((account) => account.active).map((account) => ({ value: account.name, label: account.name })), required: false, hint: locale === 'id' ? 'Wajib dipilih jika biaya pengiriman lebih dari Rp0.' : 'Required when transport cost is greater than Rp0.' },
        ]}
        onSubmit={saveDelivery}
      />
    </>
  )
}

type PersistedReturn = { id: string; date: string; orderId: string; total: string | number; refundAmount: string | number; stockReturned: boolean; notes: string | null; items: Array<{ productId: string; qty: number; price: string | number }> }
type ReturnOrderOption = { id: string; customerId: string; status: string; items: Array<{ productId: string; qty: number }> }
type ReturnProductOption = { id: string; name: string }

export function ReturnsView() {
  const { t } = useApp()
  const [deleteTarget, setDeleteTarget] = useState<PersistedReturn | null>(null)
  const { mutate: globalMutate } = useSWRConfig()
  const { data: business } = useSWR<{ id: string }>('/api/businesses/current', customersFetcher)
  const { data: rows, error, isLoading, mutate } = useSWR<PersistedReturn[]>(
    business?.id ? `/api/returns?businessId=${encodeURIComponent(business.id)}` : null,
    customersFetcher,
  )
  const { data: orderRows } = useSWR<ReturnOrderOption[]>(
    business?.id ? `/api/orders?businessId=${encodeURIComponent(business.id)}` : null,
    customersFetcher,
  )
  const { data: customerRows } = useSWR<PersistedCustomer[]>(
    business?.id ? `/api/customers?businessId=${encodeURIComponent(business.id)}` : null,
    customersFetcher,
  )
  const returns = rows ?? []
  const customerName = (orderId: string) => {
    const order = orderRows?.find((o) => o.id === orderId)
    return customerRows?.find((c) => c.id === order?.customerId)?.name ?? '—'
  }
  const columns: Column<PersistedReturn>[] = [
    { key: 'id', header: t('returns.id'), cell: (r) => <IdCell>{r.id}</IdCell> },
    { key: 'date', header: t('common.date'), cell: (r) => <span className="font-mono text-xs text-muted-foreground">{formatDate(r.date)}</span> },
    { key: 'order', header: t('returns.order'), cell: (r) => <span className="font-mono text-xs">{r.orderId}</span> },
    { key: 'customer', header: t('common.customer'), cell: (r) => customerName(r.orderId) },
    { key: 'qty', header: t('common.qty'), align: 'right', cell: (r) => <span className="font-mono tabular-nums">{r.items.reduce((sum, item) => sum + Number(item.qty), 0)}</span> },
    { key: 'value', header: t('returns.returnTotal'), align: 'right', cell: (r) => <Money value={Number(r.total)} className="text-destructive" /> },
    { key: 'reason', header: t('common.notes'), cell: (r) => <span className="text-muted-foreground">{r.notes || '—'}</span> },
    { key: 'status', header: t('returns.refundStatus'), cell: (r) => (Number(r.refundAmount) > 0 ? <Pill tone="success">{t('returns.refunded')}</Pill> : <Pill tone="neutral">{t('returns.noRefund')}</Pill>) },
  ]
  const deleteReturn = async () => {
    if (!business?.id || !deleteTarget) return
    try {
      const id = deleteTarget.id
      const response = await fetch(`/api/returns/${encodeURIComponent(id)}`, { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? t('returns.deleteFailed'))
      setDeleteTarget(null)
      await Promise.all([
        mutate(),
        globalMutate(`/api/orders?businessId=${encodeURIComponent(business.id)}`),
        globalMutate(`/api/orders/${encodeURIComponent(deleteTarget.orderId)}`),
        globalMutate(`/api/products?businessId=${encodeURIComponent(business.id)}`),
        globalMutate(`/api/inventory?businessId=${encodeURIComponent(business.id)}`),
        globalMutate(`/api/stock?businessId=${encodeURIComponent(business.id)}`),
        globalMutate(`/api/accounting?businessId=${encodeURIComponent(business.id)}`),
        globalMutate(`/api/financial-accounts?businessId=${encodeURIComponent(business.id)}`),
        globalMutate(`/api/dashboard?businessId=${encodeURIComponent(business.id)}`),
        globalMutate(`/api/reports?businessId=${encodeURIComponent(business.id)}`),
      ])
      toast.success(t('returns.deleted'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('returns.deleteFailed'))
    }
  }

  return (
    <>
      <PageHeader breadcrumbs={[{ label: t('nav.sales') }, { label: t('nav.returns') }]} title={t('returns.title')} description={t('returns.desc')} />
      <KpiGrid>
        <KpiCard label={t('returns.title')} value={returns.length} icon={RotateCcw} />
        <KpiCard label={t('returns.noRefund')} value={returns.filter((r) => Number(r.refundAmount) === 0).length} icon={RotateCcw} tone="warning" />
        <KpiCard label={t('returns.refunded')} value={returns.filter((r) => Number(r.refundAmount) > 0).length} icon={CheckCircle2} tone="success" />
        <KpiCard label={t('reports.units')} value={returns.reduce((sum, r) => sum + r.items.reduce((itemSum, item) => itemSum + Number(item.qty), 0), 0)} icon={Truck} tone="neutral" />
      </KpiGrid>
      {error ? <p className="py-4 text-sm text-destructive">{t('returns.loadError')}</p> : isLoading || !business ? <p className="py-4 text-sm text-muted-foreground">{t('returns.loading')}</p> : (
        <DataTable
          rows={returns}
          columns={columns}
          getRowId={(r) => r.id}
          searchText={(r) => `${r.id} ${r.orderId} ${customerName(r.orderId)} ${r.notes ?? ''}`}
          filters={[
            { value: 'all', label: t('common.all'), predicate: () => true },
            { value: 'out', label: t('returns.noRefund'), predicate: (r) => Number(r.refundAmount) === 0 },
            { value: 'done', label: t('returns.refunded'), predicate: (r) => Number(r.refundAmount) > 0 },
          ]}
          rowHref={(r) => `/returns/${encodeURIComponent(r.id)}`}
          contextActions={(r) => [
            { label: t('common.edit'), icon: Pencil, href: `/returns/new?editId=${encodeURIComponent(r.id)}` },
            { label: t('common.delete'), icon: Trash2, onSelect: () => setDeleteTarget(r) },
          ]}
          editable={false}
          deletable={false}
          addLabel={t('returns.add')}
          onAdd={() => { window.location.href = '/returns/new' }}
        />
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(nextOpen) => { if (!nextOpen) setDeleteTarget(null) }}
        title={t('common.delete')}
        description={deleteTarget ? t('returns.deleteConfirm', { id: deleteTarget.id }) : ''}
        confirmLabel={t('common.delete')}
        onConfirm={() => { void deleteReturn() }}
      />
    </>
  )
}
