'use client'

import useSWR from 'swr'
import { DataTable, IdCell, Money, type Column } from '@/components/common/data-table'
import { KpiCard, KpiGrid } from '@/components/common/kpi-card'
import { PageHeader } from '@/components/common/page-header'
import { useApp } from '@/components/providers'
import { formatDate } from '@/lib/format'

type OrderItem = { id: string; productId: string; qty: number | string; price: number | string; discount?: number | string }
type Order = { id: string; date: string; dueDate?: string | null; customerId: string; status: string; items: OrderItem[] }
type Customer = { id: string; name: string }
type Payment = { id: string; orderId?: string | null; purchaseId?: string | null; amount: number | string }
const fetcher = async (url: string) => { const r = await fetch(url); const body = await r.json(); if (!r.ok) throw new Error(body.error || 'Unable to load receivables'); return body }
type ReceivableRow = { id: string; date: string; dueDate: string | null; customer: string; total: number; paid: number; outstanding: number; status: string }
export function ReceivablesView() {
  const { t } = useApp()
  const { data: business, error: businessError } = useSWR<{ id: string }>('/api/businesses/current', fetcher)
  const { data: orders, error: ordersError } = useSWR<Order[]>(business?.id ? '/api/orders?businessId=' + encodeURIComponent(business.id) : null, fetcher)
  const { data: customers, error: customersError } = useSWR<Customer[]>(business?.id ? '/api/customers?businessId=' + encodeURIComponent(business.id) : null, fetcher)
  const { data: payments, error: paymentsError } = useSWR<Payment[]>(business?.id ? '/api/payments?businessId=' + encodeURIComponent(business.id) : null, fetcher)
  const error = businessError || ordersError || customersError || paymentsError
  if (error) return <p role="alert" className="text-sm text-destructive">{error.message}</p>
  if (!business || !orders || !customers || !payments) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  const customerNames = new Map(customers.map(c => [c.id, c.name]))
  const rows: ReceivableRow[] = orders.filter(o => o.status !== 'cancelled').map(o => {
    const total = o.items.reduce((sum, i) => sum + Number(i.qty) * Number(i.price) - Number(i.discount || 0), 0)
    const paid = payments.filter(p => p.orderId === o.id).reduce((sum, p) => sum + Number(p.amount), 0)
    const outstanding = Math.max(0, total - paid)
    return { id: o.id, date: o.date, dueDate: o.dueDate || null, customer: customerNames.get(o.customerId) || o.customerId, total, paid, outstanding, status: outstanding <= 0.005 ? 'paid' : o.dueDate && o.dueDate < new Date().toISOString().slice(0, 10) ? 'overdue' : 'open' }
  }).filter(r => r.outstanding > 0.005).sort((a,b) => (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31'))
  const columns: Column<ReceivableRow>[] = [
    { key: 'id', header: t('common.id'), cell: r => <IdCell>{r.id}</IdCell> },
    { key: 'date', header: t('common.date'), cell: r => formatDate(r.date) },
    { key: 'customer', header: t('common.customer'), className: 'w-[24%]', cell: r => <span className="block truncate font-medium" title={r.customer}>{r.customer}</span> },
    { key: 'dueDate', header: t('common.dueDate'), cell: r => r.dueDate ? formatDate(r.dueDate) : '—' },
    { key: 'total', header: t('common.total'), align: 'right', cell: r => <Money value={r.total} /> },
    { key: 'paid', header: t('common.paid'), align: 'right', cell: r => <Money value={r.paid} /> },
    { key: 'outstanding', header: t('common.outstanding'), align: 'right', cell: r => <Money value={r.outstanding} className="font-medium text-warning" /> },
    { key: 'status', header: t('common.status'), cell: r => <span className={r.status === 'overdue' ? 'rounded-full bg-destructive/10 px-2 py-1 text-xs text-destructive' : 'rounded-full bg-warning/10 px-2 py-1 text-xs text-warning'}>{r.status === 'overdue' ? t('common.overdue') : t('common.open')}</span> },
  ]
  return <>
    <PageHeader breadcrumbs={[{ label: t('nav.sales') }, { label: t('nav.receivables') }]} title={t('nav.receivables')} description={t('finance.receivablesDesc')} />
    <KpiGrid>
      <KpiCard label={t('common.outstanding')} value={<Money value={rows.reduce((s,r)=>s+r.outstanding,0)} />} icon={Money as never} tone="warning" />
      <KpiCard label={t('common.overdue')} value={rows.filter(r=>r.status==='overdue').length} icon={Money as never} tone="destructive" />
      <KpiCard label={t('common.customer')} value={new Set(rows.map(r=>r.customer)).size} icon={Money as never} tone="neutral" />
    </KpiGrid>
    <DataTable rows={rows} columns={columns} getRowId={r=>r.id} searchText={r=>r.id+' '+r.customer} editable={false} deletable={false} />
  </>
}
