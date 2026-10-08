'use client'

import Link from 'next/link'
import { AlertTriangle, Coins, HandCoins, TrendingUp, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { KpiCard, KpiGrid } from '@/components/common/kpi-card'
import { PageHeader } from '@/components/common/page-header'
import { PeriodSelect } from '@/components/common/period-select'
import { SectionCard } from '@/components/common/section-card'
import { OrderStatusBadge, PaymentStatusBadge, StockStatusBadge } from '@/components/common/status-badge'
import { useApp } from '@/components/providers'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  activeOrders,
  customerById,
  customers,
  inRange,
  isOverdue,
  monthlyTrend,
  orderOutstanding,
  orderPaymentStatus,
  orders,
  orderTotal,
  type Period,
  periodRange,
  productById,
  products,
  purchaseOutstanding,
  purchases,
  stockStatusOf,
  supplierById,
} from '@/lib/data'
import { profitAndLoss } from '@/lib/accounting'
import { formatCompactIDR, formatDate, formatIDR, formatPercent } from '@/lib/format'

const monthLabels: Record<string, [string, string]> = {
  '05': ['May', 'Mei'],
  '06': ['Jun', 'Jun'],
  '07': ['Jul', 'Jul'],
  '08': ['Aug', 'Agu'],
  '09': ['Sep', 'Sep'],
  '10': ['Oct', 'Okt'],
}

export function DashboardView() {
  const { t, locale } = useApp()
  const [period, setPeriod] = useState<Period>('thisMonth')
  const range = periodRange(period)
  const pl = profitAndLoss(range)
  const periodOrders = activeOrders().filter((o) => inRange(o.date, range))

  const receivableOrders = orders.filter((o) => orderOutstanding(o) > 0)
  const totalReceivable = receivableOrders.reduce((s, o) => s + orderOutstanding(o), 0)

  const chartConfig = {
    revenue: { label: t('dash.revenue'), color: 'var(--chart-1)' },
    grossProfit: { label: t('dash.grossProfit'), color: 'var(--chart-2)' },
  } satisfies ChartConfig

  const trend = useMemo(() => {
    const sep = profitAndLoss(['2026-09-01', '2026-09-30'])
    const oct = profitAndLoss(['2026-10-01', '2026-10-31'])
    const all = [
      ...monthlyTrend,
      { month: '2026-09', revenue: sep.revenue, grossProfit: sep.grossProfit, netProfit: sep.netProfit },
      { month: '2026-10', revenue: oct.revenue, grossProfit: oct.grossProfit, netProfit: oct.netProfit },
    ]
    return all.map((m) => ({ ...m, label: monthLabels[m.month.slice(5)][locale === 'en' ? 0 : 1] }))
  }, [locale])

  const receivableByCustomer = customers
    .map((c) => ({
      customer: c,
      amount: orders.filter((o) => o.customerId === c.id).reduce((s, o) => s + orderOutstanding(o), 0),
      overdue: orders.some((o) => o.customerId === c.id && isOverdue(o.dueDate, orderOutstanding(o))),
    }))
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  const payableBySupplier = purchases
    .filter((p) => purchaseOutstanding(p) > 0)
    .map((p) => ({ purchase: p, supplier: supplierById(p.supplierId), amount: purchaseOutstanding(p) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  const stockAlerts = products
    .filter((p) => stockStatusOf(p) !== 'normal')
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 6)

  const topProducts = useMemo(() => {
    const map = new Map<string, { qty: number; revenue: number }>()
    for (const o of periodOrders) {
      for (const it of o.items) {
        const cur = map.get(it.productId) ?? { qty: 0, revenue: 0 }
        map.set(it.productId, { qty: cur.qty + it.qty, revenue: cur.revenue + it.qty * it.price - it.discount })
      }
    }
    return [...map.entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5)
  }, [periodOrders])
  const topMax = topProducts[0]?.[1].revenue ?? 1

  const recentOrders = [...orders].sort((a, b) => (a.id < b.id ? 1 : -1)).slice(0, 6)

  return (
    <>
      <PageHeader
        title={t('dash.title')}
        description={t('dash.desc')}
        actions={<PeriodSelect value={period} onChange={setPeriod} />}
      />

      <KpiGrid>
        <KpiCard
          label={t('dash.revenue')}
          value={formatIDR(pl.revenue)}
          icon={TrendingUp}
          hint={t('dash.fromOrders', { n: periodOrders.length })}
          href="/reports"
        />
        <KpiCard
          label={t('dash.grossProfit')}
          value={formatIDR(pl.grossProfit)}
          icon={Coins}
          tone="success"
          hint={`${pl.revenue ? formatPercent((pl.grossProfit / pl.revenue) * 100) : '0%'} ${t('dash.margin')}`}
          href="/profit-loss"
        />
        <KpiCard
          label={t('dash.netProfit')}
          value={formatIDR(pl.netProfit)}
          icon={Wallet}
          tone={pl.netProfit < 0 ? 'destructive' : 'success'}
          hint={`${pl.revenue ? formatPercent((pl.netProfit / pl.revenue) * 100) : '0%'} ${t('dash.margin')}`}
          href="/profit-loss"
        />
        <KpiCard
          label={t('dash.receivables')}
          value={formatIDR(totalReceivable)}
          icon={HandCoins}
          tone="warning"
          hint={t('dash.openInvoices', { n: receivableOrders.length })}
          href="/receivables"
        />
      </KpiGrid>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title={t('dash.trend')} description={t('dash.trendDesc')} className="lg:col-span-2">
          <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
            <AreaChart data={trend} margin={{ left: 4, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fillProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-grossProfit)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-grossProfit)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={64}
                tickFormatter={(v: number) => formatCompactIDR(v)}
              />
              <ChartTooltip content={<ChartTooltipContent formatter={(v, name) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="text-muted-foreground">{chartConfig[name as keyof typeof chartConfig]?.label}</span>
                  <span className="font-mono font-medium tabular-nums">{formatIDR(Number(v))}</span>
                </div>
              )} />} />
              <Area dataKey="revenue" type="monotone" stroke="var(--color-revenue)" fill="url(#fillRevenue)" strokeWidth={2} />
              <Area dataKey="grossProfit" type="monotone" stroke="var(--color-grossProfit)" fill="url(#fillProfit)" strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        </SectionCard>

        <SectionCard title={t('dash.stockAlerts')} href="/stock" hrefLabel={t('common.viewAll')} bodyClassName="p-0 md:p-0">
          {stockAlerts.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">{t('dash.allHealthy')}</p>
          ) : (
            <ul className="divide-y">
              {stockAlerts.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 md:px-5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {p.stock < 0 && <AlertTriangle className="size-4 shrink-0 text-destructive" />}
                    <span className="truncate text-sm">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-sm font-semibold tabular-nums ${p.stock < 0 ? 'text-destructive' : 'text-warning'}`}>
                      {p.stock}
                    </span>
                    <StockStatusBadge status={stockStatusOf(p)} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title={t('dash.outReceivables')} href="/receivables" hrefLabel={t('common.viewAll')} bodyClassName="p-0 md:p-0">
          <ul className="divide-y">
            {receivableByCustomer.length === 0 ? (
              <li className="p-5 text-sm text-muted-foreground">{t('dash.noReceivables')}</li>
            ) : (
              receivableByCustomer.map((r) => (
                <li key={r.customer.id} className="flex items-center justify-between gap-3 px-4 py-2.5 md:px-5">
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <span className="truncate">{r.customer.name}</span>
                    {r.overdue && <span className="rounded bg-destructive/12 px-1.5 py-0.5 text-[10px] font-medium text-destructive">{t('common.overdue')}</span>}
                  </span>
                  <span className="font-mono text-sm font-medium tabular-nums">{formatIDR(r.amount)}</span>
                </li>
              ))
            )}
          </ul>
        </SectionCard>

        <SectionCard title={t('dash.outPayables')} href="/payables" hrefLabel={t('common.viewAll')} bodyClassName="p-0 md:p-0">
          <ul className="divide-y">
            {payableBySupplier.length === 0 ? (
              <li className="p-5 text-sm text-muted-foreground">{t('dash.noPayables')}</li>
            ) : (
              payableBySupplier.map((r) => (
                <li key={r.purchase.id} className="flex items-center justify-between gap-3 px-4 py-2.5 md:px-5">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{r.supplier?.name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {r.purchase.id} · {r.purchase.dueDate ? formatDate(r.purchase.dueDate) : t('common.noDueDate')}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-medium tabular-nums">{formatIDR(r.amount)}</span>
                </li>
              ))
            )}
          </ul>
        </SectionCard>

        <SectionCard title={t('dash.topProducts')} description={t(`period.${period}`)}>
          <ul className="flex flex-col gap-3.5">
            {topProducts.map(([id, v]) => (
              <li key={id}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{productById(id)?.name}</span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">{formatCompactIDR(v.revenue)}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(v.revenue / topMax) * 100}%` }} />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {v.qty} {t('dash.unitsSold')}
                </p>
              </li>
            ))}
            {topProducts.length === 0 && <li className="text-sm text-muted-foreground">{t('dash.noProductsSold')}</li>}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title={t('dash.recentOrders')} href="/orders" hrefLabel={t('common.viewAll')} className="mt-4" bodyClassName="p-0 md:p-0">
        <div className="overflow-x-auto">
          <table aria-label={t('dash.recentOrders')} className="w-full min-w-[640px] text-sm">
            <thead className="sr-only">
              <tr>
                <th scope="col">{t('history.recordId')}</th>
                <th scope="col">{t('common.customer')}</th>
                <th scope="col">{t('common.date')}</th>
                <th scope="col">{t('common.status')}</th>
                <th scope="col">{t('dash.paymentStatus')}</th>
                <th scope="col">{t('common.total')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentOrders.map((o) => (
                <tr key={o.id} className="transition-colors hover:bg-muted/40">
                  <td className="px-4 py-3 md:px-5">
                    <Link href={`/orders/${o.id}`} className="font-mono text-xs font-medium text-primary hover:underline">
                      {o.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{customerById(o.customerId)?.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{formatDate(o.date)}</td>
                  <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                  <td className="px-4 py-3"><PaymentStatusBadge status={orderPaymentStatus(o)} /></td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums md:px-5">{formatIDR(orderTotal(o))}</td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted-foreground">
                    {t('dash.noRecentOrders')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </>
  )
}
