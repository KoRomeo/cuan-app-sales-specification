'use client'

import Link from 'next/link'
import { AlertTriangle, Coins, HandCoins, TrendingUp, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { KpiCard, KpiGrid } from '@/components/common/kpi-card'
import { PageHeader } from '@/components/common/page-header'
import { PeriodSelect } from '@/components/common/period-select'
import { SectionCard } from '@/components/common/section-card'
import { OrderStatusBadge, PaymentStatusBadge, StockStatusBadge } from '@/components/common/status-badge'
import { useApp } from '@/components/providers'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import useSWR from 'swr'
import type { Period } from '@/lib/data'

type DashboardItem = { productId: string; qty: number; price: number; discount: number; unitCost: number }
type DashboardPayment = { amount: number }
type DashboardOrder = {
  id: string
  date: string
  customerId: string
  status: 'requested' | 'ready' | 'delivered' | 'cancelled'
  dueDate: string | null
  items: DashboardItem[]
  payments: DashboardPayment[]
}
type DashboardPurchase = {
  id: string
  date: string
  supplierId: string
  dueDate: string | null
  items: Array<{ productId: string; qty: number; unitCost: number }>
  payments: DashboardPayment[]
}
type DashboardData = {
  customers: Array<{ id: string; name: string }>
  products: Array<{ id: string; name: string; stock: number; minimumStock: number; averageCost: number }>
  orders: DashboardOrder[]
  purchases: DashboardPurchase[]
  suppliers: Array<{ id: string; name: string }>
  expenses: Array<{ date: string; amount: number }>
  returns: Array<{ id: string; date: string; orderId: string; refundAmount: number; stockReturned: boolean; stockValue: number }>
}
const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url)
  const result = await response.json()
  if (!response.ok) throw new Error(result.error ?? 'Unable to load dashboard data')
  return result as T
}
const todayISO = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
const dateRange = (period: Period, today: string): [string, string] => {
  const date = new Date(`${today}T12:00:00`)
  const year = date.getFullYear()
  const month = date.getMonth()
  const monthStart = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}-01`
  const monthEnd = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, '0')}`
  switch (period) {
    case 'today': return [today, today]
    case 'thisWeek': {
      const start = new Date(date)
      start.setDate(date.getDate() - ((date.getDay() + 6) % 7))
      return [`${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`, today]
    }
    case 'thisMonth': return [monthStart(year, month), today]
    case 'lastMonth': return [monthStart(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1), monthEnd(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1)]
    case 'thisQuarter': {
      const quarterMonth = Math.floor(month / 3) * 3
      return [monthStart(year, quarterMonth), today]
    }
    case 'thisYear': return [`${year}-01-01`, today]
    default: return ['0000-01-01', '9999-12-31']
  }
}
const totalOfOrder = (order: DashboardOrder) => order.items.reduce((sum, item) => sum + item.qty * item.price - item.discount, 0)
const paidOfOrder = (order: DashboardOrder) => order.payments.reduce((sum, payment) => sum + payment.amount, 0)
const outstandingOfOrder = (order: DashboardOrder) => order.status === 'cancelled' ? 0 : Math.max(totalOfOrder(order) - paidOfOrder(order), 0)
const totalOfPurchase = (purchase: DashboardPurchase) => purchase.items.reduce((sum, item) => sum + item.qty * item.unitCost, 0)
const paidOfPurchase = (purchase: DashboardPurchase) => purchase.payments.reduce((sum, payment) => sum + payment.amount, 0)
const outstandingOfPurchase = (purchase: DashboardPurchase) => Math.max(totalOfPurchase(purchase) - paidOfPurchase(purchase), 0)
const statusOfPayment = (total: number, paid: number): 'unpaid' | 'partial' | 'paid' => paid <= 0 ? 'unpaid' : paid >= total ? 'paid' : 'partial'
const stockStatus = (product: DashboardData['products'][number]): 'normal' | 'low' | 'negative' => product.stock < 0 ? 'negative' : product.minimumStock > 0 && product.stock < product.minimumStock ? 'low' : 'normal'
const isPastDue = (dueDate: string | null, outstanding: number, today: string) => Boolean(dueDate && outstanding > 0 && dueDate < today)
import { formatCompactIDR, formatDate, formatIDR, formatPercent } from '@/lib/format'


export function DashboardView() {
  const { t, locale } = useApp()
  const [period, setPeriod] = useState<Period>('thisMonth')
  const today = todayISO()
  const range = dateRange(period, today)
  const { data: business, error: businessError } = useSWR<{ id: string }>('/api/businesses/current', fetcher)
  const { data, error } = useSWR<DashboardData>(
    business?.id ? `/api/dashboard?businessId=${encodeURIComponent(business.id)}` : null,
    fetcher,
  )

  if (businessError || error) {
    return <p role="alert" className="text-sm text-destructive">{(businessError || error)?.message}</p>
  }
  if (!business || !data) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  const { customers, products, orders, purchases, suppliers, expenses, returns } = data
  const inRange = (date: string) => date >= range[0] && date <= range[1]
  const activeOrders = orders.filter((order) => order.status !== 'cancelled')
  const periodOrders = activeOrders.filter((order) => inRange(order.date))
  const revenueOrders = periodOrders.filter((order) => order.status === 'delivered')
  const grossRevenue = revenueOrders.reduce((sum, order) => sum + totalOfOrder(order), 0)
  const periodReturns = returns.filter((item) => inRange(item.date))
  const refundTotal = periodReturns.reduce((sum, item) => sum + item.refundAmount, 0)
  const returnedStockValue = periodReturns.reduce((sum, item) => sum + item.stockValue, 0)
  const revenue = grossRevenue - refundTotal
  const cogs = revenueOrders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.qty * item.unitCost, 0), 0) - returnedStockValue
  const totalExpenses = expenses.filter((expense) => inRange(expense.date)).reduce((sum, expense) => sum + expense.amount, 0)
  const pl = { revenue, grossProfit: revenue - cogs, netProfit: revenue - cogs - totalExpenses }
  const receivableOrders = activeOrders.filter((order) => outstandingOfOrder(order) > 0)
  const totalReceivable = receivableOrders.reduce((sum, order) => sum + outstandingOfOrder(order), 0)

  const chartConfig = {
    revenue: { label: t('dash.revenue'), color: 'var(--chart-1)' },
    grossProfit: { label: t('dash.grossProfit'), color: 'var(--chart-2)' },
  } satisfies ChartConfig

  const trend = (() => {
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date()
      date.setDate(1)
      date.setMonth(date.getMonth() - (5 - index))
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthOrders = activeOrders.filter((order) => order.status === 'delivered' && order.date.startsWith(month))
      const monthReturns = returns.filter((item) => item.date.startsWith(month))
      const monthRefunds = monthReturns.reduce((sum, item) => sum + item.refundAmount, 0)
      const monthReturnedStockValue = monthReturns.reduce((sum, item) => sum + item.stockValue, 0)
      const monthGrossRevenue = monthOrders.reduce((sum, order) => sum + totalOfOrder(order), 0)
      const monthRevenue = monthGrossRevenue - monthRefunds
      const monthCogs = monthOrders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.qty * item.unitCost, 0), 0) - monthReturnedStockValue
      const monthExpenses = expenses.filter((expense) => expense.date.startsWith(month)).reduce((sum, expense) => sum + expense.amount, 0)
      return {
        month,
        revenue: monthRevenue,
        grossProfit: monthRevenue - monthCogs,
        netProfit: monthRevenue - monthCogs - monthExpenses,
        label: new Date(`${month}-01T12:00:00`).toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID', { month: 'short' }),
      }
    })
    return months
  })()

  const receivableByCustomer = customers
    .map((customer) => {
      const customerOrders = orders.filter((order) => order.customerId === customer.id)
      return {
        customer,
        amount: customerOrders.reduce((sum, order) => sum + outstandingOfOrder(order), 0),
        overdue: customerOrders.some((order) => isPastDue(order.dueDate, outstandingOfOrder(order), today)),
      }
    })
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  const supplierById = (id: string) => suppliers.find((supplier) => supplier.id === id)
  const payableBySupplier = purchases
    .filter((purchase) => outstandingOfPurchase(purchase) > 0)
    .map((purchase) => ({ purchase, supplier: supplierById(purchase.supplierId), amount: outstandingOfPurchase(purchase) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  const stockAlerts = products
    .filter((product) => stockStatus(product) !== 'normal')
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 6)

  const topProducts = (() => {
    const map = new Map<string, { qty: number; revenue: number }>()
    for (const order of periodOrders) {
      for (const item of order.items) {
        const current = map.get(item.productId) ?? { qty: 0, revenue: 0 }
        map.set(item.productId, { qty: current.qty + item.qty, revenue: current.revenue + item.qty * item.price - item.discount })
      }
    }
    return [...map.entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5)
  })()
  const topMax = topProducts[0]?.[1].revenue ?? 1
  const productById = (id: string) => products.find((product) => product.id === id)
  const customerById = (id: string) => customers.find((customer) => customer.id === id)
  const orderTotal = totalOfOrder
  const orderPaymentStatus = (order: DashboardOrder) => statusOfPayment(totalOfOrder(order), paidOfOrder(order))
  const recentOrders = [...orders].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 6)

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
                    <StockStatusBadge status={stockStatus(p)} />
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
