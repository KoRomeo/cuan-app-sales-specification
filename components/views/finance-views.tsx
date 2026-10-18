'use client'

import { AlertTriangle, CalendarClock, HandCoins, Plus, Receipt, Tags, Users, Wallet } from 'lucide-react'
import { useState } from 'react'
import useSWR from 'swr'
import { DataTable, IdCell, Money, type Column } from '@/components/common/data-table'
import { FormDialog } from '@/components/common/form-dialog'
import { KpiCard, KpiGrid } from '@/components/common/kpi-card'
import { PageHeader } from '@/components/common/page-header'
import { PeriodSelect } from '@/components/common/period-select'
import { SectionCard } from '@/components/common/section-card'
import { Pill } from '@/components/common/status-badge'
import { useApp } from '@/components/providers'
import { Button } from '@/components/ui/button'
import {
  customerById,
  customers,
  type Expense,
  expenseCategories,
  expenses,
  inRange,
  isOverdue,
  type Order,
  orderOutstanding,
  orders,
  orderTotal,
  type Period,
  periodRange,
  type Purchase,
  purchaseOutstanding,
  purchases,
  purchaseTotal,
  supplierById,
  TODAY,
} from '@/lib/data'
import { formatDate, formatIDR, formatPercent } from '@/lib/format'
import { translateAccountName, translateExpenseCategory } from '@/lib/i18n'

const accountValues = ['Cash', 'Bank BCA', 'Bank Mandiri'] as const
const in7Days = '2026-10-13'
const fetcher = (url: string) => fetch(url).then((response) => { if (!response.ok) throw new Error('Unable to load finance data'); return response.json() })

type PersistedPayment = { id: string; date: string; amount: string; account: string; orderId: string | null; purchaseId: string | null }
type PersistedParty = { id: string; name: string; phone?: string | null; address?: string | null }
type PersistedOrder = { id: string; date: string; customerId: string; status: Order['status']; dueDate: string | null; notes: string | null; items: Array<{ productId: string; qty: number; price: string | number; discount?: string | number; unitCost: string | number }> }
type PersistedPurchase = { id: string; date: string; supplierId: string; dueDate: string | null; notes: string | null; items: Array<{ productId: string; qty: number; price: string | number; unitCost?: string | number }> }

function mapOrder(row: PersistedOrder, paymentRows: PersistedPayment[]): Order {
  return { ...row, notes: row.notes ?? '', items: row.items.map((item) => ({ ...item, price: Number(item.price), discount: Number(item.discount ?? 0), unitCost: Number(item.unitCost) })), payments: paymentRows.filter((payment) => payment.orderId === row.id).map((payment) => ({ id: payment.id, date: payment.date, amount: Number(payment.amount), account: payment.account })), delivery: null }
}
function mapPurchase(row: PersistedPurchase, paymentRows: PersistedPayment[]): Purchase {
  return { ...row, notes: row.notes ?? '', items: row.items.map((item) => ({ productId: item.productId, qty: item.qty, price: Number(item.price ?? item.unitCost ?? 0), unitCost: Number(item.unitCost ?? item.price ?? 0) })), payments: paymentRows.filter((payment) => payment.purchaseId === row.id).map((payment) => ({ id: payment.id, date: payment.date, amount: Number(payment.amount), account: payment.account })) }
}

function PersistedPaymentHistory({ businessId, kind }: { businessId: string | undefined; kind: 'receivable' | 'payable' }) {
  const { t } = useApp()
  const { data, error, mutate } = useSWR<PersistedPayment[]>(businessId ? `/api/payments?businessId=${encodeURIComponent(businessId)}` : null, fetcher)
  const payments = (data ?? []).filter((payment) => kind === 'receivable' ? payment.orderId : payment.purchaseId)
  return (
    <div className="mt-6">
    <SectionCard title={t('finance.paymentHistory')} description={t('finance.persistedData')}>
      {error ? <p className="text-sm text-destructive">{error.message}</p> : payments.length === 0 ? <p className="text-sm text-muted-foreground">{t('finance.noPayments')}</p> : (
        <div className="divide-y">
          {payments.map((payment) => <div key={payment.id} className="flex items-center justify-between gap-4 px-1 py-3 text-sm"><span><span className="font-mono text-xs">{payment.id}</span><span className="ml-2 text-muted-foreground">{formatDate(payment.date)}</span></span><span className="font-mono tabular-nums">{formatIDR(Number(payment.amount))}</span></div>)}
        </div>
      )}
      <button type="button" className="sr-only" onClick={() => mutate()}>Refresh payment history</button>
    </SectionCard>
    </div>
  )
}

function DueCell({ due, outstanding }: { due: string | null; outstanding: number }) {
  const { t } = useApp()
  if (!due) return <span className="text-xs text-muted-foreground">{t('common.noDueDate')}</span>
  if (isOverdue(due, outstanding))
    return (
      <span className="flex items-center gap-2">
        <span className="font-mono text-xs text-destructive">{formatDate(due)}</span>
        <Pill tone="destructive">{t('common.overdue')}</Pill>
      </span>
    )
  return <span className="font-mono text-xs text-muted-foreground">{formatDate(due)}</span>
}

export function ReceivablesView() {
  const { t } = useApp()
  const [open, setOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const { data: business, error: businessError } = useSWR<{ id: string }>('/api/businesses/current', fetcher)
  const { data: persistedOrders, error: ordersError } = useSWR<PersistedOrder[]>(business?.id ? `/api/orders?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const { data: paymentRows, error: paymentsError, mutate: refreshPayments } = useSWR<PersistedPayment[]>(business?.id ? `/api/payments?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const { data: persistedCustomers } = useSWR<PersistedParty[]>(business?.id ? `/api/customers?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const persisted = (persistedOrders ?? []).map((order) => mapOrder(order, paymentRows ?? []))
  const rows = persisted.filter((o) => orderOutstanding(o) > 0).sort((a, b) => (a.date < b.date ? -1 : 1))
  const partyById = new Map((persistedCustomers ?? []).map((customer) => [customer.id, customer]))
  const financeError = businessError || ordersError || paymentsError
  const total = rows.reduce((s, o) => s + orderOutstanding(o), 0)
  const overdue = rows.filter((o) => isOverdue(o.dueDate, orderOutstanding(o)))

  const columns: Column<Order>[] = [
    { key: 'id', header: t('orders.id'), cell: (o) => <IdCell>{o.id}</IdCell> },
    { key: 'date', header: t('common.date'), cell: (o) => <span className="font-mono text-xs text-muted-foreground">{formatDate(o.date)}</span> },
    { key: 'customer', header: t('common.customer'), cell: (o) => <span className="font-medium">{partyById.get(o.customerId)?.name}</span> },
    { key: 'due', header: t('common.dueDate'), sortValue: (o) => o.dueDate, cell: (o) => <DueCell due={o.dueDate} outstanding={orderOutstanding(o)} /> },
    { key: 'total', header: t('common.total'), align: 'right', cell: (o) => <Money value={orderTotal(o)} className="text-muted-foreground" /> },
    { key: 'outstanding', header: t('common.outstanding'), align: 'right', cell: (o) => <Money value={orderOutstanding(o)} className="font-semibold text-warning" /> },
  ]

  if (financeError) return <p role="alert" className="text-sm text-destructive">{financeError.message}</p>
  if (!business || !persistedOrders || !paymentRows || !persistedCustomers) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: t('nav.finance') }, { label: t('nav.receivables') }]}
        title={t('receivables.title')}
        description={t('receivables.desc')}
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Wallet />
            {t('orders.addPayment')}
          </Button>
        }
      />
      <KpiGrid>
        <KpiCard label={t('receivables.total')} value={formatIDR(total)} icon={HandCoins} tone="warning" />
        <KpiCard label={t('receivables.overdue')} value={formatIDR(overdue.reduce((s, o) => s + orderOutstanding(o), 0))} hint={`${overdue.length} ${t('common.orders')}`} icon={AlertTriangle} tone="destructive" />
        <KpiCard label={t('receivables.dueSoon')} value={rows.filter((o) => o.dueDate && o.dueDate >= TODAY && o.dueDate <= in7Days).length} icon={CalendarClock} />
        <KpiCard label={t('receivables.customersOwing')} value={new Set(rows.map((o) => o.customerId)).size} icon={Users} tone="neutral" />
      </KpiGrid>
      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(o) => o.id}
        searchText={(o) => `${o.id} ${partyById.get(o.customerId)?.name}`}
        filters={[
          { value: 'all', label: t('common.all'), predicate: () => true },
          { value: 'overdue', label: t('common.overdue'), predicate: (o) => isOverdue(o.dueDate, orderOutstanding(o)) },
          { value: 'nodue', label: t('common.noDueDate'), predicate: (o) => !o.dueDate },
        ]}
        rowHref={(o) => `/orders/${o.id}`}
        editable={false}
        deletable={false}
        contextActions={(order) => [{ label: t('orders.addPayment'), icon: Wallet, onSelect: () => { setSelectedOrder(order); setOpen(true) } }]}
      />
      <PersistedPaymentHistory businessId={business?.id} kind="receivable" />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t('orders.addPayment')}
        description={selectedOrder ? `${partyById.get(selectedOrder.customerId)?.name ?? selectedOrder.customerId} · ${selectedOrder.id} · ${t('common.outstanding')}: ${formatIDR(orderOutstanding(selectedOrder))}` : t('receivables.allocationHint')}
        persisted
        onSubmit={async (values) => {
          if (!business?.id) throw new Error('Business access required')
          const order = selectedOrder
          if (!order || !rows.some((item) => item.id === order.id)) throw new Error('Select an order with an outstanding balance')
          const response = await fetch('/api/payments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: `PAY-${crypto.randomUUID()}`, businessId: business.id, orderId: order.id, date: values.date, amount: Number(values.amount), account: values.account }) })
          if (!response.ok) throw new Error((await response.json()).error ?? 'Unable to record payment')
          await refreshPayments()
          setOpen(false)
          setSelectedOrder(null)
        }}
        fields={[
          { name: 'date', label: t('common.date'), type: 'date', defaultValue: TODAY, half: true },
          { name: 'account', label: t('receivables.receiveTo'), type: 'select', options: accountValues.map((value) => ({ value, label: translateAccountName(value, t) })), half: true },
          { name: 'amount', label: t('receivables.paymentAmount'), type: 'number', prefix: 'Rp', min: 1 },
        ]}
      />
    </>
  )
}

export function PayablesView() {
  const { t } = useApp()
  const [open, setOpen] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)
  const { data: business, error: businessError } = useSWR<{ id: string }>('/api/businesses/current', fetcher)
  const { data: persistedPurchases, error: purchasesError } = useSWR<PersistedPurchase[]>(business?.id ? `/api/purchases?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const { data: paymentRows, error: paymentsError, mutate: refreshPayments } = useSWR<PersistedPayment[]>(business?.id ? `/api/payments?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const { data: persistedSuppliers, error: suppliersError } = useSWR<PersistedParty[]>(business?.id ? `/api/suppliers?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const persisted = (persistedPurchases ?? []).map((purchase) => mapPurchase(purchase, paymentRows ?? []))
  const rows = persisted.filter((p) => purchaseOutstanding(p) > 0)
  const partyById = new Map((persistedSuppliers ?? []).map((supplier) => [supplier.id, supplier]))
  const financeError = businessError || purchasesError || paymentsError || suppliersError
  const total = rows.reduce((s, p) => s + purchaseOutstanding(p), 0)
  const overdue = rows.filter((p) => isOverdue(p.dueDate, purchaseOutstanding(p)))

  const columns: Column<Purchase>[] = [
    { key: 'id', header: t('purchases.id'), cell: (p) => <IdCell>{p.id}</IdCell> },
    { key: 'date', header: t('common.date'), cell: (p) => <span className="font-mono text-xs text-muted-foreground">{formatDate(p.date)}</span> },
    { key: 'supplier', header: t('common.supplier'), cell: (p) => <span className="font-medium">{partyById.get(p.supplierId)?.name}</span> },
    { key: 'due', header: t('common.dueDate'), sortValue: (p) => p.dueDate, cell: (p) => <DueCell due={p.dueDate} outstanding={purchaseOutstanding(p)} /> },
    { key: 'total', header: t('common.total'), align: 'right', cell: (p) => <Money value={purchaseTotal(p)} className="text-muted-foreground" /> },
    { key: 'outstanding', header: t('common.outstanding'), align: 'right', cell: (p) => <Money value={purchaseOutstanding(p)} className="font-semibold text-warning" /> },
  ]

  if (financeError) return <p role="alert" className="text-sm text-destructive">{financeError.message}</p>
  if (!business || !persistedPurchases || !paymentRows || !persistedSuppliers) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: t('nav.finance') }, { label: t('nav.payables') }]}
        title={t('payables.title')}
        description={t('payables.desc')}
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Wallet />
            {t('orders.addPayment')}
          </Button>
        }
      />
      <KpiGrid>
        <KpiCard label={t('payables.total')} value={formatIDR(total)} icon={HandCoins} tone="warning" />
        <KpiCard label={t('receivables.overdue')} value={formatIDR(overdue.reduce((s, p) => s + purchaseOutstanding(p), 0))} icon={AlertTriangle} tone="destructive" />
        <KpiCard label={t('receivables.dueSoon')} value={rows.filter((p) => p.dueDate && p.dueDate >= TODAY && p.dueDate <= in7Days).length} icon={CalendarClock} />
        <KpiCard label={t('payables.suppliersOwed')} value={new Set(rows.map((p) => p.supplierId)).size} icon={Users} tone="neutral" />
      </KpiGrid>
      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(p) => p.id}
        searchText={(p) => `${p.id} ${partyById.get(p.supplierId)?.name}`}
        filters={[
          { value: 'all', label: t('common.all'), predicate: () => true },
          { value: 'overdue', label: t('common.overdue'), predicate: (p) => isOverdue(p.dueDate, purchaseOutstanding(p)) },
          { value: 'nodue', label: t('common.noDueDate'), predicate: (p) => !p.dueDate },
        ]}
        editable={false}
        deletable={false}
        contextActions={(purchase) => [{ label: t('orders.addPayment'), icon: Wallet, onSelect: () => { setSelectedPurchase(purchase); setOpen(true) } }]}
      />
      <PersistedPaymentHistory businessId={business?.id} kind="payable" />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t('orders.addPayment')}
        description={selectedPurchase ? `${partyById.get(selectedPurchase.supplierId)?.name ?? selectedPurchase.supplierId} · ${selectedPurchase.id} · ${t('common.outstanding')}: ${formatIDR(purchaseOutstanding(selectedPurchase))}` : t('payables.desc')}
        persisted
        onSubmit={async (values) => {
          if (!business?.id) throw new Error('Business access required')
          const purchase = selectedPurchase
          if (!purchase || !rows.some((item) => item.id === purchase.id)) throw new Error('Select a purchase with an outstanding balance')
          const response = await fetch('/api/payments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: `PAY-${crypto.randomUUID()}`, businessId: business.id, purchaseId: purchase.id, date: values.date, amount: Number(values.amount), account: values.account }) })
          if (!response.ok) throw new Error((await response.json()).error ?? 'Unable to record payment')
          await refreshPayments()
          setOpen(false)
          setSelectedPurchase(null)
        }}
        fields={[
          { name: 'date', label: t('common.date'), type: 'date', defaultValue: TODAY, half: true },
          { name: 'account', label: t('payables.payFrom'), type: 'select', options: accountValues.map((value) => ({ value, label: translateAccountName(value, t) })), half: true },
          { name: 'amount', label: t('common.amount'), type: 'number', prefix: 'Rp', min: 1 },
        ]}
      />
    </>
  )
}

type PersistedExpense = { id: string; date: string; category: string; amount: string | number; account: string; description: string }

export function ExpensesView() {
  const { t } = useApp()
  const [open, setOpen] = useState(false)
  const { data: business } = useSWR<{ id: string }>('/api/businesses/current', fetcher)
  const { data: expenseRows, error, isLoading, mutate } = useSWR<PersistedExpense[]>(
    business?.id ? `/api/expenses?businessId=${encodeURIComponent(business.id)}` : null,
    fetcher,
  )
  const rows = expenseRows ?? []
  const total = rows.reduce((sum, expense) => sum + Number(expense.amount), 0)
  const byCat = [...new Set(rows.map((expense) => expense.category))]
    .map((category) => [category, rows.filter((expense) => expense.category === category).reduce((sum, expense) => sum + Number(expense.amount), 0)] as const)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])

  const columns: Column<PersistedExpense>[] = [
    { key: 'id', header: 'ID', cell: (expense) => <IdCell>{expense.id}</IdCell> },
    { key: 'date', header: t('common.date'), cell: (expense) => <span className="font-mono text-xs text-muted-foreground">{formatDate(expense.date)}</span> },
    { key: 'category', header: t('common.category'), cell: (expense) => <Pill tone="neutral">{translateExpenseCategory(expense.category, t)}</Pill> },
    { key: 'description', header: t('common.description'), cell: (expense) => <span className="font-medium">{expense.description}</span> },
    { key: 'account', header: t('common.account'), cell: (expense) => <span className="text-muted-foreground">{translateAccountName(expense.account, t)}</span> },
    { key: 'status', header: t('common.status'), cell: () => <Pill tone="success">{t('expenses.statusPosted')}</Pill> },
    { key: 'amount', header: t('common.amount'), align: 'right', cell: (expense) => <Money value={Number(expense.amount)} /> },
  ]

  const saveExpense = async (values: Record<string, string>) => {
    if (!business?.id) throw new Error('Business not found')
    const amount = Number(values.amount)
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Amount must be greater than zero')
    const response = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: business.id, date: values.date, category: values.category,
        amount, account: values.account, description: values.description?.trim(),
      }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Failed to create expense')
    await mutate()
    setOpen(false)
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: t('nav.finance') }, { label: t('nav.expenses') }]}
        title={t('expenses.title')}
        description={t('expenses.desc')}
      />
      <KpiGrid>
        <KpiCard label={t('expenses.total')} value={formatIDR(total)} icon={Receipt} />
        <KpiCard label={t('expenses.largest')} value={byCat[0] ? translateExpenseCategory(byCat[0][0], t) : '—'} hint={byCat[0] ? formatIDR(byCat[0][1]) : undefined} icon={Tags} tone="warning" />
        <KpiCard label={t('expenses.count')} value={rows.length} icon={Plus} tone="neutral" />
        <KpiCard label={t('period.thisMonth')} value={formatIDR(rows.filter((expense) => inRange(expense.date, periodRange('thisMonth'))).reduce((sum, expense) => sum + Number(expense.amount), 0))} icon={CalendarClock} />
      </KpiGrid>

      {error ? <p className="py-4 text-sm text-destructive">Failed to load expenses. Please refresh and try again.</p> : isLoading || !business ? <p className="py-4 text-sm text-muted-foreground">Loading expenses...</p> : (
        <div className="grid gap-4 xl:grid-cols-4">
          <div className="xl:col-span-3">
            <DataTable
              rows={rows}
              columns={columns}
              getRowId={(expense) => expense.id}
              searchText={(expense) => `${expense.id} ${expense.category} ${expense.description}`}
              filters={[{ value: 'all', label: t('common.all'), predicate: () => true }, ...byCat.slice(0, 4).map(([category]) => ({ value: category, label: translateExpenseCategory(category, t), predicate: (expense: PersistedExpense) => expense.category === category }))]}
              addLabel={t('expenses.add')}
              onAdd={() => setOpen(true)}
            />
          </div>
          <SectionCard title={t('common.category')}>
            <ul className="flex flex-col gap-3">
              {byCat.map(([category, value]) => (
                <li key={category}>
                  <div className="flex justify-between text-sm"><span>{translateExpenseCategory(category, t)}</span><span className="font-mono text-xs tabular-nums text-muted-foreground">{formatPercent(total ? value / total * 100 : 0)}</span></div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${byCat[0]?.[1] ? value / byCat[0][1] * 100 : 0}%` }} /></div>
                  <p className="mt-1 font-mono text-[11px] tabular-nums text-muted-foreground">{formatIDR(value)}</p>
                </li>
              ))}
              {byCat.length === 0 && <li className="text-sm text-muted-foreground">{t('expenses.noCategoryBreakdown')}</li>}
            </ul>
          </SectionCard>
        </div>
      )}

      <FormDialog
        key={open ? 'new-expense-open' : 'new-expense-closed'}
        open={open}
        onOpenChange={setOpen}
        title={t('expenses.add')}
        persisted
        fields={[
          { name: 'date', label: t('common.date'), type: 'date', defaultValue: TODAY, half: true, required: true },
          { name: 'category', label: t('common.category'), type: 'select', half: true, required: true, options: expenseCategories.map((category) => ({ value: category, label: translateExpenseCategory(category, t) })) },
          { name: 'amount', label: t('common.amount'), type: 'number', prefix: 'Rp', min: 1, half: true, required: true },
          { name: 'account', label: t('common.account'), type: 'select', half: true, required: true, options: accountValues.map((value) => ({ value, label: translateAccountName(value, t) })) },
          { name: 'description', label: t('common.description'), type: 'textarea', required: true },
        ]}
        onSubmit={saveExpense}
      />
    </>
  )
}

function PlRow({ label, value, strong, negative, indent }: { label: string; value: number; strong?: boolean; negative?: boolean; indent?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-2.5 text-sm ${strong ? 'font-semibold' : ''} ${indent ? 'pl-4 text-muted-foreground' : ''}`}>
      <span>{label}</span>
      <span className={`font-mono tabular-nums ${strong && value < 0 ? 'text-destructive' : ''}`}>
        {negative ? `(${formatIDR(value)})` : formatIDR(value)}
      </span>
    </div>
  )
}

export function ProfitLossView() {
  const { t } = useApp()
  const [period, setPeriod] = useState<Period>('thisMonth')
  const [startDate, endDate] = periodRange(period)
  const { data: business } = useSWR<{ id: string }>('/api/businesses/current', fetcher)
  const { data: accounting } = useSWR<{
    ledger?: Record<string, { debit: number; credit: number }>
    ledgerBalanced?: boolean
    note?: string
    salesRevenue?: number
    costOfGoodsSold?: number
    totalExpenses?: number
  }>(business?.id ? `/api/accounting?businessId=${encodeURIComponent(business.id)}&startDate=${startDate}&endDate=${endDate}` : null, fetcher)
  const revenue = Number(accounting?.salesRevenue ?? 0)
  const cogs = Number(accounting?.costOfGoodsSold ?? 0)
  const operatingExpenses = Number(accounting?.totalExpenses ?? 0)
  const pl = {
    revenue,
    cogs,
    grossProfit: revenue - cogs,
    operating: operatingExpenses,
    transport: 0,
    expenseByCategory: [] as Array<[string, number]>,
    netProfit: revenue - cogs - operatingExpenses,
  }
  const pct = (v: number) => (pl.revenue ? formatPercent((v / pl.revenue) * 100) : '—')

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: t('nav.finance') }, { label: t('nav.profitLoss') }]}
        title={t('pl.title')}
        description={t('pl.desc')}
        actions={<PeriodSelect value={period} onChange={setPeriod} />}
      />
      <KpiGrid>
        <KpiCard label={t('pl.revenue')} value={formatIDR(pl.revenue)} icon={HandCoins} />
        <KpiCard label={t('pl.grossProfit')} value={formatIDR(pl.grossProfit)} hint={`${pct(pl.grossProfit)} ${t('dash.margin')}`} icon={Wallet} tone="success" />
        <KpiCard label={t('pl.operating')} value={formatIDR(pl.operating)} icon={Receipt} tone="warning" />
        <KpiCard label={t('pl.netProfit')} value={formatIDR(pl.netProfit)} hint={`${pct(pl.netProfit)} ${t('dash.margin')}`} icon={Wallet} tone={pl.netProfit < 0 ? 'destructive' : 'success'} />
      </KpiGrid>

      <SectionCard title={t('pl.statement')} description={t(`period.${period}`)} className="w-full max-w-none">
        <div className="divide-y">
          <PlRow label={t('pl.revenue')} value={pl.revenue} strong />
          <PlRow label={t('pl.cogs')} value={pl.cogs} negative indent />
          <div className="rounded-md bg-success/8 px-3">
            <PlRow label={t('pl.grossProfit')} value={pl.grossProfit} strong />
          </div>
          <div className="py-1">
            <p className="pt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('pl.operating')}</p>
            <PlRow label={t('pl.transport')} value={pl.transport} negative indent />
            {pl.expenseByCategory.map(([c, v]) => (
              <PlRow key={c} label={c} value={v} negative indent />
            ))}
            <PlRow label={t('pl.operating')} value={pl.operating} negative />
          </div>
          <div className={`rounded-md px-3 ${pl.netProfit < 0 ? 'bg-destructive/8' : 'bg-primary/8'}`}>
            <PlRow label={t('pl.netProfit')} value={pl.netProfit} strong />
          </div>
        </div>
      </SectionCard>
      <SectionCard title={t('finance.persistedLedger')} description={accounting?.note ?? t('finance.persistedData')} className="mt-4 w-full max-w-none">
        <div className="flex items-center justify-between border-b pb-3 text-sm">
          <span>{t('finance.ledgerStatus')}</span>
          <Pill tone={accounting?.ledgerBalanced ? 'success' : 'destructive'}>{accounting?.ledgerBalanced ? t('finance.balanced') : t('finance.unavailable')}</Pill>
        </div>
        <div className="divide-y">
          {Object.entries(accounting?.ledger ?? {}).map(([account, values]) => <div key={account} className="flex items-center justify-between py-2 text-sm"><span>{translateAccountName(account, t)}</span><span className="font-mono text-xs tabular-nums">D {formatIDR(values.debit)} · K {formatIDR(values.credit)}</span></div>)}
          {!accounting && <p className="py-3 text-sm text-muted-foreground">{t('finance.noLedger')}</p>}
        </div>
      </SectionCard>
    </>
  )
}
