'use client'

import { Building2, HandCoins, Package, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { DataTable, IdCell, Money, type Column } from '@/components/common/data-table'
import { FormDialog } from '@/components/common/form-dialog'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { KpiCard, KpiGrid } from '@/components/common/kpi-card'
import { PageHeader } from '@/components/common/page-header'
import { PaymentStatusBadge, Pill } from '@/components/common/status-badge'
import { useApp } from '@/components/providers'
import { appToast as toast } from '@/lib/toast'
import {
  type Purchase,
  purchaseOutstanding,
  purchasePaid,
  purchasePaymentStatus,
  purchaseTotal,
  TODAY,
} from '@/lib/data'
import { formatDate, formatIDR } from '@/lib/format'

const fetcher = (url: string) => fetch(url).then(async (response) => {
  if (!response.ok) throw new Error((await response.json()).error ?? 'Unable to load purchases')
  return response.json()
})
type PersistedPurchase = { id: string; date: string; supplierId: string; dueDate: string | null; notes: string | null; status?: string; totalOverride?: string | number | null; items: Array<{ productId: string; qty: number; unitCost: string | number; discount?: string | number; discountType?: 'amount' | 'percent' }> }
type PersistedPayment = { id: string; date: string; amount: string | number; account: string; purchaseId: string | null }
type PersistedParty = { id: string; name: string; phone?: string | null; address?: string | null }
function persistedPurchaseTotal(purchase: { totalOverride?: string | number | null; items: Array<{ qty: number; unitCost: string | number; discount?: string | number; discountType?: 'amount' | 'percent' }> }) {
  if (purchase.totalOverride != null) return Number(purchase.totalOverride)
  return purchase.items.reduce((sum, item) => {
    const gross = Number(item.qty) * Number(item.unitCost)
    const discount = item.discountType === 'percent'
      ? gross * Number(item.discount ?? 0) / 100
      : Number(item.discount ?? 0)
    return sum + Math.ceil(Math.max(0, gross - discount) - 1e-9)
  }, 0)
}
function mapPurchase(row: PersistedPurchase, payments: PersistedPayment[]): Purchase {
  return { ...row, notes: row.notes ?? '', items: row.items.map((item) => ({ productId: item.productId, qty: item.qty, price: Number(item.unitCost), discount: Number(item.discount ?? 0), discountType: item.discountType })), payments: payments.filter((payment) => payment.purchaseId === row.id).map((payment) => ({ id: payment.id, date: payment.date, amount: Number(payment.amount), account: payment.account })) }
}

export function PurchasesView() {
  const { t } = useApp()
  const { mutate: globalMutate } = useSWRConfig()
  const [deleteTarget, setDeleteTarget] = useState<Purchase | null>(null)
  const { data: business, error: businessError } = useSWR<{ id: string }>('/api/businesses/current', fetcher)
  const { data: persistedPurchases, error: purchasesError, mutate: mutatePurchases } = useSWR<PersistedPurchase[]>(business?.id ? `/api/purchases?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const { data: payments, error: paymentsError, mutate: mutatePayments } = useSWR<PersistedPayment[]>(business?.id ? `/api/payments?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const { data: persistedSuppliers, error: suppliersError } = useSWR<PersistedParty[]>(business?.id ? `/api/suppliers?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const { data: persistedProducts, error: productsError } = useSWR<Array<{ id: string; name: string; stock?: number }>>(business?.id ? `/api/products?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const error = businessError || purchasesError || paymentsError || suppliersError || productsError
  if (error) return <p role="alert" className="text-sm text-destructive">{error.message}</p>
  if (!business || !persistedPurchases || !payments || !persistedSuppliers || !persistedProducts) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  const purchaseRows = persistedPurchases.map((purchase) => mapPurchase(purchase, payments))
  const supplierByIdMap = new Map(persistedSuppliers.map((supplier) => [supplier.id, supplier]))
  const productByIdMap = new Map(persistedProducts.map((product) => [product.id, product]))
  const activeRows = purchaseRows.filter((purchase) => (purchase as Purchase & { status?: string }).status !== 'cancelled')
  const sorted = [...purchaseRows].sort((a, b) => (a.id < b.id ? 1 : -1))

  const columns: Column<Purchase>[] = [
    { key: 'id', header: t('purchases.id'), className: 'min-w-[145px] whitespace-nowrap', cell: (p) => <IdCell>{p.id}</IdCell> },
    { key: 'date', header: t('common.date'), cell: (p) => <span className="font-mono text-xs text-muted-foreground">{formatDate(p.date)}</span> },
    { key: 'supplier', header: t('common.supplier'), className: 'min-w-[180px]', cell: (p) => <span className="block whitespace-nowrap font-medium" title={supplierByIdMap.get(p.supplierId)?.name}>{supplierByIdMap.get(p.supplierId)?.name}</span> },
    {
      key: 'items',
      header: t('common.items'),
      className: 'w-[30%]',
      cell: (p) => (
        <span className="block max-w-60 truncate text-muted-foreground">
          {p.items.map((it) => `${productByIdMap.get(it.productId)?.name} ×${it.qty}`).join(', ')}
        </span>
      ),
    },
    { key: 'status', header: t('orders.paymentStatus'), sortValue: (p) => purchasePaymentStatus(p), cell: (p) => (p as Purchase & { status?: string }).status === 'cancelled' ? <Pill tone="neutral">{t('status.cancelled')}</Pill> : <PaymentStatusBadge status={purchasePaymentStatus(p)} /> },
    { key: 'total', header: t('common.total'), align: 'right', cell: (p) => <Money value={purchaseTotal(p)} /> },
    { key: 'paid', header: t('common.paid'), align: 'right', cell: (p) => <Money value={purchasePaid(p)} className="text-muted-foreground" /> },
    { key: 'outstanding', header: t('common.outstanding'), align: 'right', cell: (p) => <Money value={purchaseOutstanding(p)} className={purchaseOutstanding(p) > 0 ? 'font-medium text-warning' : 'text-muted-foreground'} /> },
  ]

  return (
    <>
      <PageHeader breadcrumbs={[{ label: t('nav.purchasing') }, { label: t('nav.purchases') }]} title={t('purchases.title')} description={t('purchases.desc')} />
      <KpiGrid>
        <KpiCard label={t('purchases.count')} value={purchaseRows.length} icon={ShoppingBag} />
        <KpiCard label={t('purchases.totalPurchased')} value={formatIDR(activeRows.reduce((s, p) => s + purchaseTotal(p), 0))} icon={Package} />
        <KpiCard label={t('common.paid')} value={formatIDR(activeRows.reduce((s, p) => s + purchasePaid(p), 0))} icon={HandCoins} tone="success" />
        <KpiCard label={t('purchases.outstandingPayables')} value={formatIDR(activeRows.reduce((s, p) => s + purchaseOutstanding(p), 0))} icon={HandCoins} tone="warning" href="/payables" />
      </KpiGrid>
      <DataTable
        rows={sorted}
        columns={columns}
        getRowId={(p) => p.id}
        searchText={(p) => `${p.id} ${supplierByIdMap.get(p.supplierId)?.name} ${p.items.map((i) => productByIdMap.get(i.productId)?.name).join(' ')}`}
        rowHref={(p) => `/purchases/${encodeURIComponent(p.id)}`}
        contextActions={(purchase) => [
          { label: t('common.view'), onSelect: () => { window.location.href = `/purchases/${encodeURIComponent(purchase.id)}` } },
          ...(purchase.payments.length === 0 && (purchase as Purchase & { status?: string }).status !== 'cancelled' ? [{ label: t('common.cancel'), onSelect: () => setDeleteTarget(purchase) }] : []),
        ]}
        filters={[
          { value: 'all', label: t('common.all'), predicate: () => true },
          { value: 'cancelled', label: t('status.cancelled'), predicate: (p) => (p as Purchase & { status?: string }).status === 'cancelled' },
          { value: 'unpaid', label: t('pay.unpaid'), predicate: (p) => (p as Purchase & { status?: string }).status !== 'cancelled' && purchasePaymentStatus(p) === 'unpaid' },
          { value: 'partial', label: t('pay.partial'), predicate: (p) => (p as Purchase & { status?: string }).status !== 'cancelled' && purchasePaymentStatus(p) === 'partial' },
          { value: 'paid', label: t('pay.paid'), predicate: (p) => (p as Purchase & { status?: string }).status !== 'cancelled' && purchasePaymentStatus(p) === 'paid' },
        ]}
        addLabel={t('purchases.add')}
        onAdd={() => { window.location.href = '/purchases/new' }}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(nextOpen) => { if (!nextOpen) setDeleteTarget(null) }}
        title={t('common.cancel')}
        description={deleteTarget ? (t('purchases.cancelConfirm', { id: deleteTarget.id }) === 'purchases.cancelConfirm' ? `Cancel purchase ${deleteTarget.id}? Inventory and accounting entries will be reversed.` : t('purchases.cancelConfirm', { id: deleteTarget.id })) : ''}
        confirmLabel={t('common.cancel')}
        onConfirm={() => {
          void (async () => {
            if (!business?.id || !deleteTarget) return
            const target = deleteTarget
            const response = await fetch(`/api/purchases/${encodeURIComponent(target.id)}?businessId=${encodeURIComponent(business.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'cancelled' }) })
            const result = await response.json().catch(() => ({}))
            if (!response.ok) throw new Error(result.error ?? 'Unable to cancel purchase')
            setDeleteTarget(null)
            await Promise.all([
              globalMutate((key) => typeof key === 'string' && ['/api/purchases', '/api/products', '/api/inventory', '/api/stock-movements', '/api/dashboard', '/api/general-ledger', '/api/payables'].some((prefix) => key.startsWith(prefix))),
            ])
            toast.success(t('status.cancelled'))
          })().catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to delete purchase'))
        }}
      />
    </>
  )
}

type PersistedSupplier = { id: string; businessId: string; name: string; contact: string | null }
type SupplierPurchaseRow = {
  id: string
  supplierId: string
  status?: string
  totalOverride?: string | number | null
  items: Array<{ qty: number; unitCost: string | number; discount?: string | number; discountType?: 'amount' | 'percent' }>
}
type SupplierPaymentRow = { purchaseId: string | null; amount: string | number }

export function SuppliersView() {
  const { t } = useApp()
  const [open, setOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<PersistedSupplier | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PersistedSupplier | null>(null)
  const { mutate: globalMutate } = useSWRConfig()
  const { data: business, error: businessError } = useSWR<{ id: string }>('/api/businesses/current', fetcher)
  const { data: supplierRows, error: suppliersError, mutate: mutateSuppliers } = useSWR<PersistedSupplier[]>(
    business?.id ? `/api/suppliers?businessId=${encodeURIComponent(business.id)}` : null,
    fetcher,
  )
  const { data: purchaseRows, error: purchasesError } = useSWR<SupplierPurchaseRow[]>(
    business?.id ? `/api/purchases?businessId=${encodeURIComponent(business.id)}` : null,
    fetcher,
  )
  const { data: paymentRows } = useSWR<SupplierPaymentRow[]>(
    business?.id ? `/api/payments?businessId=${encodeURIComponent(business.id)}` : null,
    fetcher,
  )

  const suppliers = supplierRows ?? []
  const purchases = purchaseRows ?? []
  const payments = paymentRows ?? []
  const stats = (supplier: PersistedSupplier) => {
    const supplierPurchases = purchases.filter((purchase) => purchase.supplierId === supplier.id && purchase.status !== 'cancelled')
    const total = supplierPurchases.reduce((sum, purchase) => sum + persistedPurchaseTotal(purchase), 0)
    const paid = supplierPurchases.reduce((sum, purchase) =>
      sum + payments.filter((payment) => payment.purchaseId === purchase.id).reduce((paymentSum, payment) => paymentSum + Number(payment.amount), 0), 0)
    return { count: supplierPurchases.length, total, outstanding: Math.max(total - paid, 0) }
  }

  const saveSupplier = async (values: Record<string, string>) => {
    if (!business?.id) throw new Error('Business not found')
    const editing = editingSupplier
    const response = await fetch(
      editing
        ? `/api/suppliers/${encodeURIComponent(editing.id)}?businessId=${encodeURIComponent(business.id)}`
        : '/api/suppliers',
      {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: editing?.id ?? `SUP-${crypto.randomUUID()}`,
          businessId: business.id,
          name: values.name?.trim(),
          contact: values.contact?.trim() || null,
        }),
      },
    )
    const result = await response.json()
    if (!response.ok) throw new Error(result.error ?? 'Unable to save supplier')
    setOpen(false)
    setEditingSupplier(null)
    await Promise.all([
      mutateSuppliers(),
      globalMutate(`/api/dashboard?businessId=${encodeURIComponent(business.id)}`),
    ])
    toast.success(t('form.savedFeedback'))
  }

  const deleteSupplier = async () => {
    if (!business?.id || !deleteTarget) return
    const response = await fetch(
      `/api/suppliers/${encodeURIComponent(deleteTarget.id)}?businessId=${encodeURIComponent(business.id)}`,
      { method: 'DELETE' },
    )
    const result = await response.json()
    if (!response.ok) throw new Error(result.error ?? 'Unable to delete supplier')
    setDeleteTarget(null)
    await mutateSuppliers()
    toast.success(t('common.delete'))
  }

  const error = businessError || suppliersError || purchasesError
  if (error) return <p role="alert" className="text-sm text-destructive">{error.message}</p>
  if (!business || !supplierRows || !purchaseRows || !paymentRows) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>

  const columns: Column<PersistedSupplier>[] = [
    { key: 'id', header: 'ID', cell: (supplier) => <IdCell>{supplier.id}</IdCell> },
    { key: 'name', header: t('common.supplier'), cell: (supplier) => <span className="font-medium">{supplier.name}</span> },
    { key: 'contact', header: t('common.phone'), cell: (supplier) => <span className="font-mono text-xs text-muted-foreground">{supplier.contact || '—'}</span> },
    { key: 'count', header: t('suppliers.totalPurchases'), align: 'right', cell: (supplier) => <span className="font-mono tabular-nums">{stats(supplier).count}</span> },
    { key: 'total', header: t('suppliers.lifetime'), align: 'right', cell: (supplier) => <Money value={stats(supplier).total} /> },
    { key: 'outstanding', header: t('common.outstanding'), align: 'right', cell: (supplier) => <Money value={stats(supplier).outstanding} className={stats(supplier).outstanding > 0 ? 'font-medium text-warning' : 'text-muted-foreground'} /> },
  ]

  return (
    <>
      <PageHeader breadcrumbs={[{ label: t('nav.purchasing') }, { label: t('nav.suppliers') }]} title={t('suppliers.title')} description={t('suppliers.desc')} />
      <KpiGrid>
        <KpiCard label={t('suppliers.count')} value={suppliers.length} icon={Building2} />
        <KpiCard label={t('payables.suppliersOwed')} value={suppliers.filter((supplier) => stats(supplier).outstanding > 0).length} icon={HandCoins} tone="warning" />
        <KpiCard label={t('suppliers.lifetime')} value={formatIDR(suppliers.reduce((sum, supplier) => sum + stats(supplier).total, 0))} icon={Package} />
        <KpiCard label={t('payables.total')} value={formatIDR(suppliers.reduce((sum, supplier) => sum + stats(supplier).outstanding, 0))} icon={HandCoins} tone="warning" href="/payables" />
      </KpiGrid>
      <DataTable
        rows={suppliers}
        columns={columns}
        getRowId={(supplier) => supplier.id}
        searchText={(supplier) => `${supplier.id} ${supplier.name} ${supplier.contact ?? ''}`}
        filters={[
          { value: 'all', label: t('common.all'), predicate: () => true },
          { value: 'owed', label: t('payables.suppliersOwed'), predicate: (supplier) => stats(supplier).outstanding > 0 },
        ]}
        addLabel={t('suppliers.add')}
        onAdd={() => {
          setEditingSupplier(null)
          setOpen(true)
        }}
        contextActions={(supplier) => [
          { label: t('common.edit'), onSelect: () => { setEditingSupplier(supplier); setOpen(true) } },
          { label: t('common.delete'), onSelect: () => setDeleteTarget(supplier) },
        ]}
      />
      <FormDialog
        key={editingSupplier?.id ?? 'new-supplier'}
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) setEditingSupplier(null)
        }}
        title={editingSupplier ? t('common.edit') : t('suppliers.add')}
        submitLabel={editingSupplier ? t('common.save') : t('suppliers.add')}
        fields={[
          { name: 'name', label: t('common.supplier'), defaultValue: editingSupplier?.name ?? '' },
          { name: 'contact', label: t('common.phone'), defaultValue: editingSupplier?.contact ?? '' },
        ]}
        onSubmit={saveSupplier}
        persisted
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(nextOpen) => { if (!nextOpen) setDeleteTarget(null) }}
        title={t('common.delete')}
        description={deleteTarget ? t('suppliers.deleteConfirm', { name: deleteTarget.name }) : ''}
        confirmLabel={t('common.delete')}
        onConfirm={() => {
          void deleteSupplier().catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to delete supplier'))
        }}
      />
    </>
  )
}
