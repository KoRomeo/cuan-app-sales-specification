'use client'

import { useMemo, useState } from 'react'
import { DataTable, IdCell, Money, type Column } from '@/components/common/data-table'
import { KpiCard, KpiGrid } from '@/components/common/kpi-card'
import { PageHeader } from '@/components/common/page-header'
import { PeriodSelect } from '@/components/common/period-select'
import { SectionCard } from '@/components/common/section-card'
import { useApp } from '@/components/providers'
import { Button } from '@/components/ui/button'
import { balanceSheet, cashFlow, chartOfAccounts, generalLedger, profitAndLoss } from '@/lib/accounting'
import {
  activeOrders,
  customerById,
  inRange,
  type Period,
  periodRange,
  productById,
  products,
  purchases,
  purchaseTotal,
  supplierById,
  TODAY,
  orderTotal,
} from '@/lib/data'
import { formatDate, formatIDR, formatNumber } from '@/lib/format'

type ReportTab = 'sales' | 'purchase' | 'inventory' | 'financial'
type FinancialTab = 'profitLoss' | 'balanceSheet' | 'cashFlow' | 'ledger'

interface TotalRow {
  id: string
  name: string
  count: number
  total: number
}

function aggregate(entries: { key: string; name: string; amount: number }[]): TotalRow[] {
  const map = new Map<string, TotalRow>()
  for (const e of entries) {
    const row = map.get(e.key) ?? { id: e.key, name: e.name, count: 0, total: 0 }
    row.count += 1
    row.total += e.amount
    map.set(e.key, row)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

function StatementRow({ label, value, strong, indent }: { label: string; value: number; strong?: boolean; indent?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-2.5 text-sm ${strong ? 'font-semibold' : ''} ${indent ? 'pl-4 text-muted-foreground' : ''}`}>
      <span>{label}</span>
      <Money value={value} />
    </div>
  )
}

export function ReportsView() {
  const { t } = useApp()
  const [tab, setTab] = useState<ReportTab>('sales')
  const [financial, setFinancial] = useState<FinancialTab>('profitLoss')
  const [period, setPeriod] = useState<Period>('thisMonth')
  const [ledgerAccount, setLedgerAccount] = useState('1100')
  const range = periodRange(period)

  const salesRows = useMemo(
    () => activeOrders().filter((o) => inRange(o.date, range)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [period],
  )
  const byCustomer = aggregate(salesRows.map((o) => ({ key: o.customerId, name: customerById(o.customerId)?.name ?? o.customerId, amount: orderTotal(o) })))
  const byProduct = aggregate(
    salesRows.flatMap((o) => o.items.map((it) => ({ key: it.productId, name: productById(it.productId)?.name ?? it.productId, amount: it.qty * it.price - it.discount }))),
  )
  const bySupplier = aggregate(
    purchases.filter((p) => inRange(p.date, range)).map((p) => ({ key: p.supplierId, name: supplierById(p.supplierId)?.name ?? p.supplierId, amount: purchaseTotal(p) })),
  )

  const totalColumns = (label: string): Column<TotalRow>[] => [
    { key: 'name', header: label, cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'count', header: t('common.items'), align: 'right', cell: (r) => <span className="font-mono tabular-nums">{r.count}</span> },
    { key: 'total', header: t('common.total'), align: 'right', cell: (r) => <Money value={r.total} /> },
  ]

  const pl = profitAndLoss(range)
  const bs = balanceSheet(range[1] > TODAY ? TODAY : range[1])
  const cf = cashFlow(range)
  const ledger = generalLedger(ledgerAccount, range)

  const tabs: { value: ReportTab; label: string }[] = [
    { value: 'sales', label: t('reports.sales') },
    { value: 'purchase', label: t('reports.purchase') },
    { value: 'inventory', label: t('reports.inventory') },
    { value: 'financial', label: t('reports.financial') },
  ]
  const financialTabs: { value: FinancialTab; label: string }[] = [
    { value: 'profitLoss', label: t('nav.profitLoss') },
    { value: 'balanceSheet', label: t('reports.balanceSheet') },
    { value: 'cashFlow', label: t('reports.cashFlow') },
    { value: 'ledger', label: t('reports.ledger') },
  ]

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: t('nav.reports') }, { label: t('nav.allReports') }]}
        title={t('reports.title')}
        description={t('reports.desc')}
        actions={<PeriodSelect value={period} onChange={setPeriod} />}
      />

      <div role="tablist" aria-label={t('reports.title')} className="mb-6 flex flex-wrap gap-2">
        {tabs.map((x) => (
          <Button key={x.value} role="tab" aria-selected={tab === x.value} variant={tab === x.value ? 'default' : 'outline'} size="sm" onClick={() => setTab(x.value)}>
            {x.label}
          </Button>
        ))}
      </div>

      {tab === 'sales' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title={t('reports.byCustomer')} bodyClassName="p-0 md:p-0">
            <DataTable rows={byCustomer} columns={totalColumns(t('common.customer'))} getRowId={(r) => r.id} searchText={(r) => r.name} pageSize={8} />
          </SectionCard>
          <SectionCard title={t('reports.byProduct')} bodyClassName="p-0 md:p-0">
            <DataTable rows={byProduct} columns={totalColumns(t('common.product'))} getRowId={(r) => r.id} searchText={(r) => r.name} pageSize={8} />
          </SectionCard>
        </div>
      )}

      {tab === 'purchase' && (
        <SectionCard title={t('reports.bySupplier')} bodyClassName="p-0 md:p-0">
          <DataTable rows={bySupplier} columns={totalColumns(t('common.supplier'))} getRowId={(r) => r.id} searchText={(r) => r.name} pageSize={10} />
        </SectionCard>
      )}

      {tab === 'inventory' && (
        <SectionCard title={t('reports.inventory')} bodyClassName="p-0 md:p-0">
          <DataTable
            rows={products}
            getRowId={(p) => p.id}
            searchText={(p) => `${p.id} ${p.name}`}
            pageSize={12}
            columns={[
              { key: 'id', header: 'ID', cell: (p) => <IdCell>{p.id}</IdCell> },
              { key: 'name', header: t('common.product'), cell: (p) => <span className="font-medium">{p.name}</span> },
              { key: 'stock', header: t('reports.units'), align: 'right', cell: (p) => <span className={`font-mono tabular-nums ${p.stock < 0 ? 'text-destructive' : ''}`}>{formatNumber(p.stock)}</span> },
              { key: 'avg', header: t('stock.current'), align: 'right', cell: (p) => <Money value={p.averageCost} /> },
              { key: 'value', header: t('common.total'), align: 'right', cell: (p) => <Money value={p.stock * p.averageCost} /> },
            ]}
          />
        </SectionCard>
      )}

      {tab === 'financial' && (
        <>
          <div role="tablist" className="mb-4 flex flex-wrap gap-2">
            {financialTabs.map((x) => (
              <Button key={x.value} role="tab" aria-selected={financial === x.value} variant={financial === x.value ? 'secondary' : 'ghost'} size="sm" onClick={() => setFinancial(x.value)}>
                {x.label}
              </Button>
            ))}
          </div>

          {financial === 'profitLoss' && (
            <SectionCard title={t('pl.statement')} description={t(`period.${period}`)} className="mx-auto max-w-3xl">
              <div className="divide-y">
                <StatementRow label={t('pl.revenue')} value={pl.revenue} strong />
                <StatementRow label={t('pl.cogs')} value={-pl.cogs} indent />
                <StatementRow label={t('pl.grossProfit')} value={pl.grossProfit} strong />
                <StatementRow label={t('pl.transport')} value={-pl.transport} indent />
                {pl.expenseByCategory.map(([c, v]) => (
                  <StatementRow key={c} label={c} value={-v} indent />
                ))}
                <StatementRow label={t('pl.netProfit')} value={pl.netProfit} strong />
              </div>
            </SectionCard>
          )}

          {financial === 'balanceSheet' && (
            <div className="mx-auto grid max-w-3xl gap-4">
              <KpiGrid>
                <KpiCard label={t('reports.assets')} value={formatIDR(bs.assets)} />
                <KpiCard label={t('reports.liabilities')} value={formatIDR(bs.liabilities)} tone="warning" />
                <KpiCard label={t('reports.equity')} value={formatIDR(bs.equity)} tone="success" />
              </KpiGrid>
              <SectionCard title={t('reports.balanceSheet')} description={formatDate(range[1] > TODAY ? TODAY : range[1])}>
                <div className="divide-y">
                  <StatementRow label={t('reports.assets')} value={bs.assets} strong />
                  <StatementRow label={t('reports.cash')} value={bs.cash} indent />
                  <StatementRow label={t('reports.inventoryAsset')} value={bs.inventory} indent />
                  <StatementRow label={t('reports.ar')} value={bs.receivables} indent />
                  <StatementRow label={t('reports.liabilities')} value={bs.liabilities} strong />
                  <StatementRow label={t('reports.ap')} value={bs.payables} indent />
                  <StatementRow label={t('reports.equity')} value={bs.equity} strong />
                  <StatementRow label={t('reports.retained')} value={bs.equity} indent />
                </div>
              </SectionCard>
            </div>
          )}

          {financial === 'cashFlow' && (
            <SectionCard title={t('reports.cashFlow')} description={t(`period.${period}`)} className="mx-auto max-w-3xl">
              <div className="divide-y">
                <StatementRow label={t('reports.cashIn')} value={cf.cashIn} />
                <StatementRow label={t('reports.cashOutSuppliers')} value={-cf.cashOutSuppliers} />
                <StatementRow label={t('reports.cashOutExpenses')} value={-cf.cashOutExpenses} />
                <StatementRow label={t('reports.netCash')} value={cf.net} strong />
              </div>
            </SectionCard>
          )}

          {financial === 'ledger' && (
            <SectionCard
              title={t('reports.ledger')}
              description={t(`period.${period}`)}
              bodyClassName="p-0 md:p-0"
              action={
                <select
                  aria-label={t('common.account')}
                  value={ledgerAccount}
                  onChange={(e) => setLedgerAccount(e.target.value)}
                  className="h-8 rounded-md border bg-background px-2 text-xs"
                >
                  {chartOfAccounts.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.code} · {a.name}
                    </option>
                  ))}
                </select>
              }
            >
              <DataTable
                key={ledgerAccount}
                rows={ledger}
                getRowId={(r) => `${r.entryId}-${r.debit}-${r.credit}`}
                searchText={(r) => `${r.entryId} ${r.memo}`}
                pageSize={10}
                columns={[
                  { key: 'date', header: t('common.date'), cell: (r) => <span className="font-mono text-xs text-muted-foreground">{formatDate(r.date)}</span> },
                  { key: 'entry', header: t('common.reference'), cell: (r) => <IdCell>{r.entryId}</IdCell> },
                  { key: 'memo', header: t('common.description'), cell: (r) => r.memo },
                  { key: 'debit', header: t('reports.debit'), align: 'right', cell: (r) => (r.debit ? <Money value={r.debit} /> : '—') },
                  { key: 'credit', header: t('reports.credit'), align: 'right', cell: (r) => (r.credit ? <Money value={r.credit} /> : '—') },
                  { key: 'balance', header: t('common.outstanding'), align: 'right', cell: (r) => <Money value={r.balance} /> },
                ]}
              />
            </SectionCard>
          )}
        </>
      )}
    </>
  )
}
