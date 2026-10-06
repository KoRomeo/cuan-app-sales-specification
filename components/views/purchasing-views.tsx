'use client'

import { Building2, HandCoins, Package, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { DataTable, IdCell, Money, type Column } from '@/components/common/data-table'
import { FormDialog } from '@/components/common/form-dialog'
import { KpiCard, KpiGrid } from '@/components/common/kpi-card'
import { PageHeader } from '@/components/common/page-header'
import { PaymentStatusBadge } from '@/components/common/status-badge'
import { useApp } from '@/components/providers'
import {
  type Party,
  productById,
  products,
  type Purchase,
  purchaseOutstanding,
  purchasePaid,
  purchasePaymentStatus,
  purchases,
  purchaseTotal,
  supplierById,
  suppliers,
  TODAY,
} from '@/lib/data'
import { formatDate, formatIDR } from '@/lib/format'

export function PurchasesView() {
  const { t } = useApp()
  const [open, setOpen] = useState(false)
  const sorted = [...purchases].sort((a, b) => (a.id < b.id ? 1 : -1))

  const columns: Column<Purchase>[] = [
    { key: 'id', header: t('purchases.id'), cell: (p) => <IdCell>{p.id}</IdCell> },
    { key: 'date', header: t('common.date'), cell: (p) => <span className="font-mono text-xs text-muted-foreground">{formatDate(p.date)}</span> },
    { key: 'supplier', header: t('common.supplier'), cell: (p) => <span className="font-medium">{supplierById(p.supplierId)?.name}</span> },
    {
      key: 'items',
      header: t('common.items'),
      cell: (p) => (
        <span className="block max-w-60 truncate text-muted-foreground">
          {p.items.map((it) => `${productById(it.productId)?.name} ×${it.qty}`).join(', ')}
        </span>
      ),
    },
    { key: 'status', header: t('orders.paymentStatus'), cell: (p) => <PaymentStatusBadge status={purchasePaymentStatus(p)} /> },
    { key: 'total', header: t('common.total'), align: 'right', cell: (p) => <Money value={purchaseTotal(p)} /> },
    { key: 'paid', header: t('common.paid'), align: 'right', cell: (p) => <Money value={purchasePaid(p)} className="text-muted-foreground" /> },
    { key: 'outstanding', header: t('common.outstanding'), align: 'right', cell: (p) => <Money value={purchaseOutstanding(p)} className={purchaseOutstanding(p) > 0 ? 'font-medium text-warning' : 'text-muted-foreground'} /> },
  ]

  return (
    <>
      <PageHeader breadcrumbs={[{ label: t('nav.purchasing') }, { label: t('nav.purchases') }]} title={t('purchases.title')} description={t('purchases.desc')} />
      <KpiGrid>
        <KpiCard label={t('purchases.count')} value={purchases.length} icon={ShoppingBag} />
        <KpiCard label={t('purchases.totalPurchased')} value={formatIDR(purchases.reduce((s, p) => s + purchaseTotal(p), 0))} icon={Package} />
        <KpiCard label={t('common.paid')} value={formatIDR(purchases.reduce((s, p) => s + purchasePaid(p), 0))} icon={HandCoins} tone="success" />
        <KpiCard label={t('purchases.outstandingPayables')} value={formatIDR(purchases.reduce((s, p) => s + purchaseOutstanding(p), 0))} icon={HandCoins} tone="warning" href="/payables" />
      </KpiGrid>
      <DataTable
        rows={sorted}
        columns={columns}
        getRowId={(p) => p.id}
        searchText={(p) => `${p.id} ${supplierById(p.supplierId)?.name} ${p.items.map((i) => productById(i.productId)?.name).join(' ')}`}
        filters={[
          { value: 'all', label: t('common.all'), predicate: () => true },
          { value: 'unpaid', label: t('pay.unpaid'), predicate: (p) => purchasePaymentStatus(p) === 'unpaid' },
          { value: 'partial', label: t('pay.partial'), predicate: (p) => purchasePaymentStatus(p) === 'partial' },
          { value: 'paid', label: t('pay.paid'), predicate: (p) => purchasePaymentStatus(p) === 'paid' },
        ]}
        addLabel={t('purchases.add')}
        onAdd={() => setOpen(true)}
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t('purchases.add')}
        fields={[
          { name: 'supplier', label: t('common.supplier'), type: 'select', half: true, options: suppliers.map((s) => ({ value: s.id, label: s.name })) },
          { name: 'date', label: t('common.date'), type: 'date', defaultValue: TODAY, half: true },
          { name: 'product', label: t('common.product'), type: 'select', options: products.map((p) => ({ value: p.id, label: `${p.name} (${p.stock})` })) },
          { name: 'qty', label: t('common.qty'), type: 'number', defaultValue: '100', half: true },
          { name: 'price', label: t('purchases.purchasePrice'), type: 'number', prefix: 'Rp', defaultValue: '11000', half: true },
          { name: 'paid', label: t('common.paid'), type: 'number', prefix: 'Rp', defaultValue: '0', half: true },
          { name: 'due', label: t('common.dueDate'), type: 'date', half: true },
        ]}
      />
    </>
  )
}

const supStats = (s: Party) => {
  const list = purchases.filter((p) => p.supplierId === s.id)
  return {
    count: list.length,
    total: list.reduce((acc, p) => acc + purchaseTotal(p), 0),
    outstanding: list.reduce((acc, p) => acc + purchaseOutstanding(p), 0),
  }
}

export function SuppliersView() {
  const { t } = useApp()
  const [open, setOpen] = useState(false)

  const columns: Column<Party>[] = [
    { key: 'id', header: 'ID', cell: (s) => <IdCell>{s.id}</IdCell> },
    { key: 'name', header: t('common.supplier'), cell: (s) => <span className="font-medium">{s.name}</span> },
    { key: 'phone', header: t('common.phone'), cell: (s) => <span className="font-mono text-xs text-muted-foreground">{s.phone}</span> },
    { key: 'address', header: t('common.address'), cell: (s) => <span className="block max-w-60 truncate text-muted-foreground">{s.address}</span> },
    { key: 'count', header: t('suppliers.totalPurchases'), align: 'right', cell: (s) => <span className="font-mono tabular-nums">{supStats(s).count}</span> },
    { key: 'total', header: t('suppliers.lifetime'), align: 'right', cell: (s) => <Money value={supStats(s).total} /> },
    { key: 'outstanding', header: t('common.outstanding'), align: 'right', cell: (s) => <Money value={supStats(s).outstanding} className={supStats(s).outstanding > 0 ? 'font-medium text-warning' : 'text-muted-foreground'} /> },
  ]

  return (
    <>
      <PageHeader breadcrumbs={[{ label: t('nav.purchasing') }, { label: t('nav.suppliers') }]} title={t('suppliers.title')} description={t('suppliers.desc')} />
      <KpiGrid>
        <KpiCard label={t('suppliers.count')} value={suppliers.length} icon={Building2} />
        <KpiCard label={t('payables.suppliersOwed')} value={suppliers.filter((s) => supStats(s).outstanding > 0).length} icon={HandCoins} tone="warning" />
        <KpiCard label={t('suppliers.lifetime')} value={formatIDR(suppliers.reduce((a, s) => a + supStats(s).total, 0))} icon={Package} />
        <KpiCard label={t('payables.total')} value={formatIDR(suppliers.reduce((a, s) => a + supStats(s).outstanding, 0))} icon={HandCoins} tone="warning" href="/payables" />
      </KpiGrid>
      <DataTable
        rows={suppliers}
        columns={columns}
        getRowId={(s) => s.id}
        searchText={(s) => `${s.id} ${s.name} ${s.phone} ${s.address}`}
        filters={[
          { value: 'all', label: t('common.all'), predicate: () => true },
          { value: 'owed', label: t('payables.suppliersOwed'), predicate: (s) => supStats(s).outstanding > 0 },
        ]}
        addLabel={t('suppliers.add')}
        onAdd={() => setOpen(true)}
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t('suppliers.add')}
        fields={[
          { name: 'name', label: t('common.supplier') },
          { name: 'phone', label: t('common.phone') },
          { name: 'address', label: t('common.address'), type: 'textarea' },
        ]}
      />
    </>
  )
}
