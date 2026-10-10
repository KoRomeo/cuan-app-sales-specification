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
import { profitAndLoss } from '@/lib/accounting'
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
  return { ...row, notes: row.notes ?? '', items: row.items.map((item) => ({ productId: item.productId, qty: item.qty, price: Number(item.price), unitCost: Number(item.unitCost ?? 0) })), payments: paymentRows.filter((payment) => payment.purchaseId === row.id).map((payment) => ({ id: payment.id, date: payment.date, amount: Number(payment.amount), account: payment.account })) }
}

function PersistedPaymentHistory({ businessId, kind }: { businessId: string | undefined; kind: 'receivable' | 'payable' }) {
  const { t } = useApp()
  const { data, error, mutate } = useSWR<PersistedPayment[]>(businessId ? `/api/payments?businessId=${encodeURIComponent(businessId)}` : null, fetcher)
  const payments = (data ?? []).filter((payment) => kind === 'receivable' ? payment.orderId : payment.purchaseId)
  return (
    <SectionCard title={t('finance.paymentHistory')} description={t('finance.persistedData')}>
      {error ? <p className="text-sm text-destructive">{error.message}</p> : payments.length === 0 ? <p className="text-sm text-muted-foreground">{t('finance.noPayments')}</p> : (
        <div className="divide-y">
          {payments.map((payment) => <div key={payment.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span><span className="font-mono text-xs">{payment.id}</span><span className="ml-2 text-muted-foreground">{formatDate(payment.date)}</span></span><span className="font-mono tabular-nums">{formatIDR(Number(payment.amount))}</span></div>)}
        </div>
      )}
      <button type="button" className="sr-only" onClick={() => mutate()}>Refresh payment history</button>
    </SectionCard>
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
        contextActions={() => [{ label: t('orders.addPayment'), icon: Wallet, onSelect: () => setOpen(true) }]}
      />
      <PersistedPaymentHistory businessId={business?.id} kind="receivable" />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t('orders.addPayment')}
        description={t('receivables.allocationHint')}
        persisted
        onSubmit={async (values) => {
          if (!business?.id) throw new Error('Business access required')
          const order = rows.find((item) => item.customerId === values.customer)
          if (!order) throw new Error('Select a customer with an outstanding order')
          const response = await fetch('/api/payments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: `PAY-${crypto.randomUUID()}`, businessId: business.id, orderId: order.id, date: values.date, amount: Number(values.amount), account: values.account }) })
          if (!response.ok) throw new Error((await response.json()).error ?? 'Unable to record payment')
          await refreshPayments()
          setOpen(false)
        }}
        fields={[
          { name: 'customer', label: t('common.customer'), type: 'select', options: customers.filter((c) => rows.some((o) => o.customerId === c.id)).map((c) => ({ value: c.id, label: c.name })) },
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
  const { data: business, error: businessError } = useSWR<{ id: string }>('/api/businesses/current', fetcher)
  const { data: persistedPurchases, error: purchasesError } = useSWR<PersistedPurchase[]>(business?.id ? `/api/purchases?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const { data: paymentRows, error: paymentsError, mutate: refreshPayments } = useSWR<PersistedPayment[]>(business?.id ? `/api/payments?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const { data: persistedSuppliers } = useSWR<PersistedParty[]>(business?.id ? `/api/suppliers?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const persisted = (persistedPurchases ?? []).map((purchase) => mapPurchase(purchase, paymentRows ?? []))
  const rows = persisted.filter((p) => purchaseOutstanding(p) > 0)
  const partyById = new Map((persistedSuppliers ?? []).map((supplier) => [supplier.id, supplier]))
  const financeError = businessError || purchasesError || paymentsError
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
        contextActions={() => [{ label: t('orders.addPayment'), icon: Wallet, onSelect: () => setOpen(true) }]}
      />
      <PersistedPaymentHistory businessId={business?.id} kind="payable" />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t('orders.addPayment')}
        persisted
        onSubmit={async (values) => {
          if (!business?.id) throw new Error('Business access required')
          const purchase = rows.find((item) => item.id === values.purchase)
          if (!purchase) throw new Error('Select a purchase with an outstanding balance')
          const response = await fetch('/api/payments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: `PAY-${crypto.randomUUID()}`, businessId: business.id, purchaseId: purchase.id, date: values.date, amount: Number(values.amount), account: values.account }) })
          if (!response.ok) throw new Error((await response.json()).error ?? 'Unable to record payment')
          await refreshPayments()
          setOpen(false)
        }}
        fields={[
          { name: 'purchase', label: t('purchases.id'), type: 'select', options: rows.map((p) => ({ value: p.id, label: `${p.id} · ${partyById.get(p.supplierId)?.name}` })) },
          { name: 'date', label: t('common.date'), type: 'date', defaultValue: TODAY, half: true },
          { name: 'account', label: t('payables.payFrom'), type: 'select', options: accountValues.map((value) => ({ value, label: translateAccountName(value, t) })), half: true },
          { name: 'amount', label: t('common.amount'), type: 'number', prefix: 'Rp', min: 1 },
        ]}
      />
    </>
  )
}

export function ExpensesView() {
  const { t } = useApp()
  const [open, setOpen] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const byCat = expenseCategories
    .map((c) => [c, expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0)] as const)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])

  const columns: Column<Expense>[] = [
    { key: 'id', header: 'ID', cell: (e) => <IdCell>{e.id}</IdCell> },
    { key: 'date', header: t('common.date'), cell: (e) => <span className="font-mono text-xs text-muted-foreground">{formatDate(e.date)}</span> },
    { key: 'category', header: t('common.category'), cell: (e) => <Pill tone="neutral">{translateExpenseCategory(e.category, t)}</Pill> },
    { key: 'description', header: t('common.description'), cell: (e) => <span className="font-medium">{e.description}</span> },
    { key: 'account', header: t('common.account'), cell: (e) => <span className="text-muted-foreground">{translateAccountName(e.account, t)}</span> },
    { key: 'status', header: t('common.status'), cell: () => <Pill tone="success">{t('expenses.statusPosted')}</Pill> },
    { key: 'amount', header: t('common.amount'), align: 'right', cell: (e) => <Money value={e.amount} /> },
  ]

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: t('nav.finance') }, { label: t('nav.expenses') }]}
        title={t('expenses.title')}
        description={t('expenses.desc')}
        actions={
          <Button size="sm" variant="outline" onClick={() => setCatOpen(true)}>
            <Tags />
            {t('expenses.addCategory')}
          </Button>
        }
      />
      <KpiGrid>
        <KpiCard label={t('expenses.total')} value={formatIDR(total)} icon={Receipt} />
        <KpiCard label={t('expenses.largest')} value={byCat[0] ? translateExpenseCategory(byCat[0][0], t) : '—'} hint={byCat[0] ? formatIDR(byCat[0][1]) : undefined} icon={Tags} tone="warning" />
        <KpiCard label={t('expenses.count')} value={expenses.length} icon={Plus} tone="neutral" />
        <KpiCard label={t('period.thisMonth')} value={formatIDR(expenses.filter((e) => inRange(e.date, periodRange('thisMonth'))).reduce((s, e) => s + e.amount, 0))} icon={CalendarClock} />
      </KpiGrid>

      <div className="grid gap-4 xl:grid-cols-4">
        <div className="xl:col-span-3">
          <DataTable
            rows={expenses}
            columns={columns}
            getRowId={(e) => e.id}
            searchText={(e) => `${e.id} ${e.category} ${e.description}`}
            filters={[{ value: 'all', label: t('common.all'), predicate: () => true }, ...byCat.slice(0, 4).map(([c]) => ({ value: c, label: translateExpenseCategory(c, t), predicate: (e: Expense) => e.category === c }))]}
            addLabel={t('expenses.add')}
            onAdd={() => setOpen(true)}
          />
        </div>
        <SectionCard title={t('common.category')}>
          <ul className="flex flex-col gap-3">
            {byCat.map(([c, v]) => (
              <li key={c}>
                <div className="flex justify-between text-sm">
                  <span>{translateExpenseCategory(c, t)}</span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">{formatPercent((v / total) * 100)}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(v / byCat[0][1]) * 100}%` }} />
                </div>
                <p className="mt-1 font-mono text-[11px] tabular-nums text-muted-foreground">{formatIDR(v)}</p>
              </li>
            ))}
            {byCat.length === 0 && <li className="text-sm text-muted-foreground">{t('expenses.noCategoryBreakdown')}</li>}
          </ul>
        </SectionCard>
      </div>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t('expenses.add')}
        fields={[
          { name: 'date', label: t('common.date'), type: 'date', defaultValue: TODAY, half: true },
          { name: 'category', label: t('common.category'), type: 'select', half: true, options: expenseCategories.map((c) => ({ value: c, label: translateExpenseCategory(c, t) })) },
          { name: 'amount', label: t('common.amount'), type: 'number', prefix: 'Rp', min: 1, half: true },
          { name: 'account', label: t('common.account'), type: 'select', half: true, options: accountValues.map((value) => ({ value, label: translateAccountName(value, t) })) },
          { name: 'description', label: t('common.description'), type: 'textarea' },
        ]}
      />
      <FormDialog open={catOpen} onOpenChange={setCatOpen} title={t('expenses.addCategory')} fields={[{ name: 'name', label: t('expenses.categoryName') }]} />
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
  const pl = profitAndLoss(periodRange(period))
  const pct = (v: number) => (pl.revenue ? formatPercent((v / pl.revenue) * 100) : '—')

  const { data: business } = useSWR<{ id: string }>('/api/businesses/current', fetcher)
  const { data: accounting } = useSWR<{ ledger?: Record<string, { debit: number; credit: number }>; ledgerBalanced?: boolean; note?: string }>(business?.id ? `/api/accounting?businessId=${encodeURIComponent(business.id)}` : null, fetcher)

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

      <SectionCard title={t('pl.statement')} description={t(`period.${period}`)} className="mx-auto max-w-3xl">
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
      <SectionCard title={t('finance.persistedLedger')} description={accounting?.note ?? t('finance.persistedData')} className="mx-auto mt-4 max-w-3xl">
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
