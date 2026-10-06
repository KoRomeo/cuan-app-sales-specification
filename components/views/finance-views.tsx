'use client'

import { AlertTriangle, CalendarClock, HandCoins, Plus, Receipt, Tags, Users, Wallet } from 'lucide-react'
import { useState } from 'react'
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

const accounts = ['Cash', 'Bank BCA', 'Bank Mandiri'].map((v) => ({ value: v, label: v }))
const in7Days = '2026-10-13'

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
  const rows = orders.filter((o) => orderOutstanding(o) > 0).sort((a, b) => (a.date < b.date ? -1 : 1))
  const total = rows.reduce((s, o) => s + orderOutstanding(o), 0)
  const overdue = rows.filter((o) => isOverdue(o.dueDate, orderOutstanding(o)))

  const columns: Column<Order>[] = [
    { key: 'id', header: t('orders.id'), cell: (o) => <IdCell>{o.id}</IdCell> },
    { key: 'date', header: t('common.date'), cell: (o) => <span className="font-mono text-xs text-muted-foreground">{formatDate(o.date)}</span> },
    { key: 'customer', header: t('common.customer'), cell: (o) => <span className="font-medium">{customerById(o.customerId)?.name}</span> },
    { key: 'due', header: t('common.dueDate'), sortValue: (o) => o.dueDate, cell: (o) => <DueCell due={o.dueDate} outstanding={orderOutstanding(o)} /> },
    { key: 'total', header: t('common.total'), align: 'right', cell: (o) => <Money value={orderTotal(o)} className="text-muted-foreground" /> },
    { key: 'outstanding', header: t('common.outstanding'), align: 'right', cell: (o) => <Money value={orderOutstanding(o)} className="font-semibold text-warning" /> },
  ]

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
        searchText={(o) => `${o.id} ${customerById(o.customerId)?.name}`}
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
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t('orders.addPayment')}
        description={t('receivables.allocationHint')}
        fields={[
          { name: 'customer', label: t('common.customer'), type: 'select', options: customers.filter((c) => rows.some((o) => o.customerId === c.id)).map((c) => ({ value: c.id, label: c.name })) },
          { name: 'date', label: t('common.date'), type: 'date', defaultValue: TODAY, half: true },
          { name: 'account', label: t('receivables.receiveTo'), type: 'select', options: accounts, half: true },
          { name: 'amount', label: t('receivables.paymentAmount'), type: 'number', prefix: 'Rp' },
        ]}
      />
    </>
  )
}

export function PayablesView() {
  const { t } = useApp()
  const [open, setOpen] = useState(false)
  const rows = purchases.filter((p) => purchaseOutstanding(p) > 0)
  const total = rows.reduce((s, p) => s + purchaseOutstanding(p), 0)
  const overdue = rows.filter((p) => isOverdue(p.dueDate, purchaseOutstanding(p)))

  const columns: Column<Purchase>[] = [
    { key: 'id', header: t('purchases.id'), cell: (p) => <IdCell>{p.id}</IdCell> },
    { key: 'date', header: t('common.date'), cell: (p) => <span className="font-mono text-xs text-muted-foreground">{formatDate(p.date)}</span> },
    { key: 'supplier', header: t('common.supplier'), cell: (p) => <span className="font-medium">{supplierById(p.supplierId)?.name}</span> },
    { key: 'due', header: t('common.dueDate'), sortValue: (p) => p.dueDate, cell: (p) => <DueCell due={p.dueDate} outstanding={purchaseOutstanding(p)} /> },
    { key: 'total', header: t('common.total'), align: 'right', cell: (p) => <Money value={purchaseTotal(p)} className="text-muted-foreground" /> },
    { key: 'outstanding', header: t('common.outstanding'), align: 'right', cell: (p) => <Money value={purchaseOutstanding(p)} className="font-semibold text-warning" /> },
  ]

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
        searchText={(p) => `${p.id} ${supplierById(p.supplierId)?.name}`}
        filters={[
          { value: 'all', label: t('common.all'), predicate: () => true },
          { value: 'overdue', label: t('common.overdue'), predicate: (p) => isOverdue(p.dueDate, purchaseOutstanding(p)) },
          { value: 'nodue', label: t('common.noDueDate'), predicate: (p) => !p.dueDate },
        ]}
        editable={false}
        deletable={false}
        contextActions={() => [{ label: t('orders.addPayment'), icon: Wallet, onSelect: () => setOpen(true) }]}
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t('orders.addPayment')}
        fields={[
          { name: 'purchase', label: t('purchases.id'), type: 'select', options: rows.map((p) => ({ value: p.id, label: `${p.id} · ${supplierById(p.supplierId)?.name}` })) },
          { name: 'date', label: t('common.date'), type: 'date', defaultValue: TODAY, half: true },
          { name: 'account', label: t('payables.payFrom'), type: 'select', options: accounts, half: true },
          { name: 'amount', label: t('common.amount'), type: 'number', prefix: 'Rp' },
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
    { key: 'category', header: t('common.category'), cell: (e) => <Pill tone="neutral">{e.category}</Pill> },
    { key: 'description', header: t('common.description'), cell: (e) => <span className="font-medium">{e.description}</span> },
    { key: 'account', header: t('common.account'), cell: (e) => <span className="text-muted-foreground">{e.account}</span> },
    { key: 'status', header: t('common.status'), cell: () => <Pill tone="success">Posted</Pill> },
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
        <KpiCard label={t('expenses.largest')} value={byCat[0]?.[0] ?? '—'} hint={byCat[0] ? formatIDR(byCat[0][1]) : undefined} icon={Tags} tone="warning" />
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
            filters={[{ value: 'all', label: t('common.all'), predicate: () => true }, ...byCat.slice(0, 4).map(([c]) => ({ value: c, label: c, predicate: (e: Expense) => e.category === c }))]}
            addLabel={t('expenses.add')}
            onAdd={() => setOpen(true)}
          />
        </div>
        <SectionCard title={t('common.category')}>
          <ul className="flex flex-col gap-3">
            {byCat.map(([c, v]) => (
              <li key={c}>
                <div className="flex justify-between text-sm">
                  <span>{c}</span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">{formatPercent((v / total) * 100)}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(v / byCat[0][1]) * 100}%` }} />
                </div>
                <p className="mt-1 font-mono text-[11px] tabular-nums text-muted-foreground">{formatIDR(v)}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t('expenses.add')}
        fields={[
          { name: 'date', label: t('common.date'), type: 'date', defaultValue: TODAY, half: true },
          { name: 'category', label: t('common.category'), type: 'select', half: true, options: expenseCategories.map((c) => ({ value: c, label: c })) },
          { name: 'amount', label: t('common.amount'), type: 'number', prefix: 'Rp', half: true },
          { name: 'account', label: t('common.account'), type: 'select', half: true, options: accounts },
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
    </>
  )
}
