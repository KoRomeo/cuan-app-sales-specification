'use client'

import useSWR from 'swr'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Boxes,
  CheckCircle2,
  PieChart,
  Scale,
  ShoppingBag,
  TriangleAlert,
  Waves,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { type Column, DataTable, IdCell, Money } from '@/components/common/data-table'
import { KpiCard, KpiGrid } from '@/components/common/kpi-card'
import { PageHeader } from '@/components/common/page-header'
import { PeriodSelect } from '@/components/common/period-select'
import { SectionCard } from '@/components/common/section-card'
import { Pill } from '@/components/common/status-badge'
import { useApp } from '@/components/providers'
import { SearchableSelect } from '@/components/common/searchable-select'
import {
  accountBalance,
  balanceSheet,
  cashFlow,
  chartOfAccounts,
  inventoryValue,
  isBalanced,
  journalEntries,
} from '@/lib/accounting'
import {
  activeOrders,
  customerById,
  customers,
  inRange,
  lineSubtotal,
  type Period,
  periodRange,
  productById,
  products,
  purchaseOutstanding,
  purchases,
  purchaseTotal,
  stockStatusOf,
  supplierById,
  suppliers,
  orderCogs,
  orderTotal,
  TODAY,
} from '@/lib/data'
import { formatDate, formatNumber, formatPercent } from '@/lib/format'
import type { TranslationKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'

function ReportHeader({
  title,
  description,
  period,
  onPeriod,
}: {
  title: string
  description: string
  period?: Period
  onPeriod?: (p: Period) => void
}) {
  const { t } = useApp()
  return (
    <PageHeader
      breadcrumbs={[{ label: t('nav.reports'), href: '/reports' }, { label: title }]}
      title={title}
      description={description}
      actions={period && onPeriod ? <PeriodSelect value={period} onChange={onPeriod} /> : undefined}
    />
  )
}

function AccountingGate({ children }: { children: React.ReactNode }) {
  const { t, features } = useApp()
  if (!features.accounting) {
    return (
      <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
        {t('reports.accountingOff')}
      </div>
    )
  }
  return <>{children}</>
}

interface ReportLink {
  href: string
  title: TranslationKey
  desc: TranslationKey
  icon: LucideIcon
  group: 'operational' | 'financial'
  accounting?: boolean
}

const reportLinks: ReportLink[] = [
  { href: '/reports/sales', title: 'reports.sales', desc: 'reports.salesDesc', icon: BarChart3, group: 'operational' },
  { href: '/reports/purchases', title: 'reports.purchase', desc: 'reports.purchaseDesc', icon: ShoppingBag, group: 'operational' },
  { href: '/reports/inventory', title: 'reports.inventory', desc: 'reports.inventoryDesc', icon: Boxes, group: 'operational' },
  { href: '/profit-loss', title: 'nav.profitLoss', desc: 'reports.plDesc', icon: PieChart, group: 'financial' },
  { href: '/reports/balance-sheet', title: 'reports.balanceSheet', desc: 'reports.bsDesc', icon: Scale, group: 'financial', accounting: true },
  { href: '/reports/cash-flow', title: 'reports.cashFlow', desc: 'reports.cfDesc', icon: Waves, group: 'financial', accounting: true },
  { href: '/reports/general-ledger', title: 'reports.ledger', desc: 'reports.glDesc', icon: BookOpen, group: 'financial', accounting: true },
]

export function ReportsHubView() {
  const { t, features } = useApp()
  const visible = reportLinks.filter((r) => !r.accounting || features.accounting)
  const groups: { label: string; items: ReportLink[] }[] = [
    { label: t('nav.reports'), items: visible.filter((r) => r.group === 'operational') },
    { label: t('reports.financial'), items: visible.filter((r) => r.group === 'financial') },
  ]

  return (
    <>
      <PageHeader breadcrumbs={[{ label: t('nav.reports') }]} title={t('reports.title')} description={t('reports.desc')} />
      <div className="flex flex-col gap-8">
        {groups.map((g) => (
          <section key={g.label} aria-label={g.label}>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{g.label}</h2>
            <div className="grid gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
              {g.items.map((r) => (
                <Link
                  key={r.href}
                  href={r.href}
                  className="group flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-primary/40 md:p-5"
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <r.icon className="size-4.5" />
                  </span>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold">{t(r.title)}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t(r.desc)}</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-medium text-primary">
                    {t('reports.open')}
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}

interface SalesRow {
  id: string
  name: string
  qty: number
  orders: number
  revenue: number
  cogs: number
}

export function SalesReportView() {
  const { t } = useApp()
  const [period, setPeriod] = useState<Period>('thisMonth')

  const { orders, revenue, cogs, byCustomer, byProduct } = useMemo(() => {
    const range = periodRange(period)
    const orders = activeOrders().filter((o) => inRange(o.date, range))
    const customerMap = new Map<string, SalesRow>()
    const productMap = new Map<string, SalesRow>()
    for (const o of orders) {
      const c = customerMap.get(o.customerId) ?? {
        id: o.customerId,
        name: customerById(o.customerId)?.name ?? o.customerId,
        qty: 0,
        orders: 0,
        revenue: 0,
        cogs: 0,
      }
      c.orders += 1
      c.revenue += orderTotal(o)
      c.cogs += orderCogs(o)
      c.qty += o.items.reduce((s, it) => s + it.qty, 0)
      customerMap.set(c.id, c)
      for (const it of o.items) {
        const p = productMap.get(it.productId) ?? {
          id: it.productId,
          name: productById(it.productId)?.name ?? it.productId,
          qty: 0,
          orders: 0,
          revenue: 0,
          cogs: 0,
        }
        p.qty += it.qty
        p.orders += 1
        p.revenue += lineSubtotal(it)
        p.cogs += it.qty * it.unitCost
        productMap.set(p.id, p)
      }
    }
    const byRevenue = (a: SalesRow, b: SalesRow) => b.revenue - a.revenue
    return {
      orders,
      revenue: orders.reduce((s, o) => s + orderTotal(o), 0),
      cogs: orders.reduce((s, o) => s + orderCogs(o), 0),
      byCustomer: [...customerMap.values()].sort(byRevenue),
      byProduct: [...productMap.values()].sort(byRevenue),
    }
  }, [period])

  const columns = (nameHeader: string): Column<SalesRow>[] => [
    { key: 'name', header: nameHeader, className: nameHeader === t('common.product') ? 'w-[32%]' : undefined, cell: (r) => <span className="block truncate font-medium" title={r.name}>{r.name}</span> },
    { key: 'qty', header: t('common.qty'), align: 'right', cell: (r) => <span className="font-mono tabular-nums">{formatNumber(r.qty)}</span> },
    { key: 'revenue', header: t('reports.revenue'), align: 'right', cell: (r) => <Money value={r.revenue} /> },
    { key: 'profit', header: t('reports.grossProfit'), align: 'right', cell: (r) => <Money value={r.revenue - r.cogs} /> },
    {
      key: 'margin',
      header: t('reports.margin'),
      align: 'right',
      cell: (r) => <span className="font-mono tabular-nums">{r.revenue ? formatPercent(((r.revenue - r.cogs) / r.revenue) * 100) : '—'}</span>,
    },
  ]

  return (
    <>
      <ReportHeader title={t('reports.sales')} description={t('reports.salesDesc')} period={period} onPeriod={setPeriod} />
      <KpiGrid>
        <KpiCard label={t('reports.revenue')} value={<Money value={revenue} />} icon={BarChart3} />
        <KpiCard label={t('reports.orders')} value={formatNumber(orders.length)} icon={ShoppingBag} tone="neutral" />
        <KpiCard
          label={t('reports.aov')}
          value={<Money value={orders.length ? revenue / orders.length : 0} />}
          icon={Scale}
          tone="warning"
        />
        <KpiCard label={t('reports.grossProfit')} value={<Money value={revenue - cogs} />} icon={PieChart} tone="success" />
      </KpiGrid>
      <div className="flex flex-col gap-6">
        <SectionCard title={t('reports.byProduct')} bodyClassName="p-0">
          <DataTable
            rows={byProduct}
            columns={columns(t('common.product'))}
            getRowId={(r) => r.id}
            searchText={(r) => r.name}
            editable={false}
            deletable={false}
            pageSize={8}
          />
        </SectionCard>
        <SectionCard title={t('reports.byCustomer')} bodyClassName="p-0">
          <DataTable
            rows={byCustomer}
            columns={columns(t('common.customer'))}
            getRowId={(r) => r.id}
            searchText={(r) => r.name}
            editable={false}
            deletable={false}
            pageSize={8}
          />
        </SectionCard>
      </div>
    </>
  )
}

export function PurchaseReportView() {
  const { t } = useApp()
  const [period, setPeriod] = useState<Period>('thisMonth')

  const { list, total, outstanding, bySupplier } = useMemo(() => {
    const range = periodRange(period)
    const list = purchases.filter((p) => inRange(p.date, range))
    const map = new Map<string, { id: string; name: string; count: number; total: number; outstanding: number }>()
    for (const p of list) {
      const s = map.get(p.supplierId) ?? {
        id: p.supplierId,
        name: supplierById(p.supplierId)?.name ?? p.supplierId,
        count: 0,
        total: 0,
        outstanding: 0,
      }
      s.count += 1
      s.total += purchaseTotal(p)
      s.outstanding += purchaseOutstanding(p)
      map.set(s.id, s)
    }
    return {
      list,
      total: list.reduce((s, p) => s + purchaseTotal(p), 0),
      outstanding: list.reduce((s, p) => s + purchaseOutstanding(p), 0),
      bySupplier: [...map.values()].sort((a, b) => b.total - a.total),
    }
  }, [period])

  type Row = (typeof bySupplier)[number]
  const columns: Column<Row>[] = [
    { key: 'name', header: t('common.supplier'), cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'count', header: t('reports.purchaseCount'), align: 'right', cell: (r) => <span className="font-mono tabular-nums">{r.count}</span> },
    { key: 'total', header: t('common.total'), align: 'right', cell: (r) => <Money value={r.total} /> },
    { key: 'outstanding', header: t('common.outstanding'), align: 'right', cell: (r) => <Money value={r.outstanding} /> },
  ]

  return (
    <>
      <ReportHeader title={t('reports.purchase')} description={t('reports.purchaseDesc')} period={period} onPeriod={setPeriod} />
      <KpiGrid>
        <KpiCard label={t('reports.purchaseTotal')} value={<Money value={total} />} icon={ShoppingBag} />
        <KpiCard label={t('reports.purchaseCount')} value={formatNumber(list.length)} icon={BarChart3} tone="neutral" />
        <KpiCard label={t('common.outstanding')} value={<Money value={outstanding} />} icon={Scale} tone="warning" />
        <KpiCard label={t('nav.suppliers')} value={formatNumber(suppliers.length)} icon={Boxes} tone="neutral" />
      </KpiGrid>
      <SectionCard title={t('reports.bySupplier')} bodyClassName="p-0">
        <DataTable
          rows={bySupplier}
          columns={columns}
          getRowId={(r) => r.id}
          searchText={(r) => r.name}
          editable={false}
          deletable={false}
        />
      </SectionCard>
    </>
  )
}

export function InventoryReportView() {
  const { t } = useApp()
  const low = products.filter((p) => stockStatusOf(p) === 'low').length
  const negative = products.filter((p) => stockStatusOf(p) === 'negative').length

  const columns: Column<(typeof products)[number]>[] = [
    { key: 'id', header: 'ID', cell: (p) => <IdCell>{p.id}</IdCell> },
    { key: 'name', header: t('common.product'), className: 'w-[32%]', cell: (p) => <span className="block truncate font-medium" title={p.name}>{p.name}</span> },
    {
      key: 'stock',
      header: t('nav.stock'),
      align: 'right',
      cell: (p) => (
        <span className={cn('font-mono tabular-nums', p.stock < 0 && 'text-destructive')}>{formatNumber(p.stock)}</span>
      ),
    },
    { key: 'min', header: t('reports.minimum'), align: 'right', cell: (p) => <span className="font-mono tabular-nums">{formatNumber(p.minimumStock)}</span> },
    { key: 'avg', header: t('reports.avgCost'), align: 'right', cell: (p) => <Money value={p.averageCost} /> },
    { key: 'value', header: t('reports.stockValue'), align: 'right', cell: (p) => <Money value={Math.max(p.stock, 0) * p.averageCost} /> },
    {
      key: 'status',
      header: t('common.status'),
      cell: (p) => {
        const s = stockStatusOf(p)
        return <Pill tone={s === 'negative' ? 'destructive' : s === 'low' ? 'warning' : 'success'}>{t(`stock.${s}`)}</Pill>
      },
    },
  ]

  return (
    <>
      <ReportHeader title={t('reports.inventory')} description={t('reports.inventoryDesc')} />
      <KpiGrid>
        <KpiCard label={t('reports.inventoryValue')} value={<Money value={inventoryValue()} />} icon={Boxes} />
        <KpiCard label={t('nav.products')} value={formatNumber(products.length)} icon={ShoppingBag} tone="neutral" />
        <KpiCard label={t('stock.low')} value={formatNumber(low)} icon={TriangleAlert} tone="warning" />
        <KpiCard label={t('stock.negative')} value={formatNumber(negative)} icon={TriangleAlert} tone="destructive" />
      </KpiGrid>
      <DataTable
        rows={products}
        columns={columns}
        getRowId={(p) => p.id}
        searchText={(p) => `${p.id} ${p.name}`}
        editable={false}
        deletable={false}
      />
    </>
  )
}

function StatementRow({
  label,
  value,
  strong,
  muted,
}: {
  label: string
  value: number
  strong?: boolean
  muted?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 py-2 text-sm',
        strong && 'border-t font-semibold',
        muted && 'text-muted-foreground',
      )}
    >
      <span>{label}</span>
      <Money value={value} />
    </div>
  )
}

export function BalanceSheetView() {
  const { t } = useApp()
  const bs = balanceSheet(TODAY)
  const balanced = bs.totalAssets === bs.totalLiabilities + bs.totalEquity

  return (
    <>
      <ReportHeader title={t('reports.balanceSheet')} description={t('reports.bsDesc')} />
      <AccountingGate>
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>{t('reports.asOf', { date: formatDate(TODAY) })}</span>
          <Pill tone={balanced ? 'success' : 'destructive'}>
            {balanced ? <CheckCircle2 className="size-3" /> : <TriangleAlert className="size-3" />}
            {balanced ? t('reports.balanced') : t('reports.notBalanced')}
          </Pill>
        </div>
        <KpiGrid>
          <KpiCard label={t('reports.totalAssets')} value={<Money value={bs.totalAssets} />} icon={Scale} />
          <KpiCard label={t('reports.totalLiabilities')} value={<Money value={bs.totalLiabilities} />} icon={Scale} tone="warning" />
          <KpiCard label={t('reports.totalEquity')} value={<Money value={bs.totalEquity} />} icon={Scale} tone="success" />
          <KpiCard label={t('reports.currentEarnings')} value={<Money value={bs.currentEarnings} />} icon={PieChart} tone="neutral" />
        </KpiGrid>
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title={t('reports.assets')}>
            {bs.assets.map((a) => (
              <StatementRow key={a.account.code} label={a.account.name} value={a.balance} muted />
            ))}
            <StatementRow label={t('reports.totalAssets')} value={bs.totalAssets} strong />
          </SectionCard>
          <div className="flex flex-col gap-6">
            <SectionCard title={t('reports.liabilities')}>
              {bs.liabilities.map((a) => (
                <StatementRow key={a.account.code} label={a.account.name} value={a.balance} muted />
              ))}
              <StatementRow label={t('reports.totalLiabilities')} value={bs.totalLiabilities} strong />
            </SectionCard>
            <SectionCard title={t('reports.equity')}>
              {bs.equity.map((a) => (
                <StatementRow key={a.account.code} label={a.account.name} value={a.balance} muted />
              ))}
              <StatementRow label={t('reports.currentEarnings')} value={bs.currentEarnings} muted />
              <StatementRow label={t('reports.totalEquity')} value={bs.totalEquity} strong />
            </SectionCard>
          </div>
        </div>
      </AccountingGate>
    </>
  )
}

export function CashFlowView() {
  const { t } = useApp()
  const [period, setPeriod] = useState<Period>('thisMonth')
  const cf = useMemo(() => cashFlow(periodRange(period)), [period])

  return (
    <>
      <ReportHeader title={t('reports.cashFlow')} description={t('reports.cfDesc')} period={period} onPeriod={setPeriod} />
      <AccountingGate>
        <KpiGrid>
          <KpiCard label={t('reports.cashIn')} value={<Money value={cf.customerPayments} />} icon={Waves} tone="success" />
          <KpiCard label={t('reports.cashOutSuppliers')} value={<Money value={cf.supplierPayments} />} icon={Waves} tone="warning" />
          <KpiCard label={t('reports.cashOutExpenses')} value={<Money value={cf.expensesPaid} />} icon={Waves} tone="warning" />
          <KpiCard label={t('reports.netCash')} value={<Money value={cf.net} />} icon={Scale} tone={cf.net < 0 ? 'destructive' : 'primary'} />
        </KpiGrid>
        <SectionCard title={t('reports.cashFlow')}>
          <StatementRow label={t('reports.cashIn')} value={cf.customerPayments} muted />
          <StatementRow label={t('reports.cashOutSuppliers')} value={cf.supplierPayments} muted />
          <StatementRow label={t('reports.cashOutExpenses')} value={cf.expensesPaid} muted />
          <StatementRow label={t('reports.netCash')} value={cf.net} strong />
        </SectionCard>
      </AccountingGate>
    </>
  )
}

interface LedgerRow {
  key: string
  date: string
  entryId: string
  reference: string
  account: string
  description: string
  debit: number
  credit: number
  balance: number
}

export function LedgerView() {
  const { t } = useApp()
  const searchParams = useSearchParams()
  const [accountName, setAccountName] = useState(() => searchParams.get("account") || "")
  const { data: business } = useSWR<{ id: string }>("/api/businesses/current", (url: string) => fetch(url).then((r) => r.json()))
  const { data, error } = useSWR<{ rows: LedgerRow[]; accounts: string[] }>(
    business?.id ? `/api/general-ledger?businessId=${encodeURIComponent(business.id)}${accountName ? `&account=${encodeURIComponent(accountName)}` : ""}` : null,
    async (url: string) => { const response = await fetch(url); const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Unable to load general ledger"); return body },
  )
  const rows = data?.rows ?? []
  const accounts = data?.accounts ?? []
  const columns: Column<LedgerRow>[] = [
    { key: "date", header: t("common.date"), cell: (r) => formatDate(r.date) },
    { key: "entry", header: t("reports.entry"), cell: (r) => <IdCell>{r.entryId}</IdCell> },
    { key: "ref", header: t("common.reference"), cell: (r) => <span className="font-mono text-xs">{r.reference}</span> },
    { key: "account", header: t("reports.account"), cell: (r) => r.account },
    { key: "desc", header: t("common.description"), cell: (r) => r.description },
    { key: "debit", header: t("reports.debit"), align: "right", cell: (r) => r.debit ? <Money value={r.debit} /> : <span className="text-muted-foreground">—</span> },
    { key: "credit", header: t("reports.credit"), align: "right", cell: (r) => r.credit ? <Money value={r.credit} /> : <span className="text-muted-foreground">—</span> },
    { key: "balance", header: t("reports.balance"), align: "right", cell: (r) => <Money value={r.balance} className="font-semibold" /> },
  ]
  return <>
    <PageHeader
      breadcrumbs={[{ label: t("nav.reports"), href: "/reports" }, { label: t("reports.ledger") }]}
      title={t("reports.ledger")}
      description={t("reports.glDesc")}
      actions={<div className="w-56"><SearchableSelect id="ledger-account-filter" value={accountName} onChange={(value) => setAccountName(String(value))} options={[{value:"",label:t("common.all")}, ...accounts.map((name) => ({value:name,label:name}))]} placeholder={t("common.all")} searchPlaceholder={t("common.search")} emptyText={t("common.noResults")} /></div>}
    />
    <AccountingGate>
      {error ? <div role="alert" className="rounded-xl border border-destructive/30 bg-card p-6 text-sm text-destructive">{error.message}</div> :
       !business || !data ? <div className="p-6 text-sm text-muted-foreground">{t("common.loading")}</div> :
       rows.length === 0 ? <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">{t("reports.noMovement")}</div> :
       <DataTable rows={rows} columns={columns} getRowId={(r) => r.key} searchText={(r) => `${r.entryId} ${r.reference} ${r.description} ${r.account}`} editable={false} deletable={false} pageSize={15} />}
    </AccountingGate>
  </>
}
