'use client'

import useSWR from 'swr'
import { DataTable, IdCell, Money, type Column } from '@/components/common/data-table'
import { KpiCard, KpiGrid } from '@/components/common/kpi-card'
import { PageHeader } from '@/components/common/page-header'
import { useApp } from '@/components/providers'
import { formatDate } from '@/lib/format'

type PurchaseItem = { id: string; productId: string; qty: number | string; unitCost: number | string }
type Purchase = { id: string; date: string; dueDate?: string | null; supplierId: string; items: PurchaseItem[] }
type Supplier = { id: string; name: string }
type Payment = { id: string; purchaseId?: string | null; amount: number | string }
const fetcher = async (url: string) => { const r = await fetch(url); const body = await r.json(); if (!r.ok) throw new Error(body.error || 'Unable to load payables'); return body }
type PayableRow = { id: string; date: string; dueDate: string | null; supplier: string; total: number; paid: number; outstanding: number; status: string }
export function PayablesView() {
  const { t } = useApp()
  const { data: business, error: businessError } = useSWR<{ id: string }>('/api/businesses/current', fetcher)
  const { data: purchases, error: purchasesError } = useSWR<Purchase[]>(business?.id ? '/api/purchases?businessId=' + encodeURIComponent(business.id) : null, fetcher)
  const { data: suppliers, error: suppliersError } = useSWR<Supplier[]>(business?.id ? '/api/suppliers?businessId=' + encodeURIComponent(business.id) : null, fetcher)
  const { data: payments, error: paymentsError } = useSWR<Payment[]>(business?.id ? '/api/payments?businessId=' + encodeURIComponent(business.id) : null, fetcher)
  const error = businessError || purchasesError || suppliersError || paymentsError
  if (error) return <p role="alert" className="text-sm text-destructive">{error.message}</p>
  if (!business || !purchases || !suppliers || !payments) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  const supplierNames = new Map(suppliers.map(s => [s.id, s.name]))
  const rows: PayableRow[] = purchases.map(p => {
    const total = p.items.reduce((sum, i) => sum + Number(i.qty) * Number(i.unitCost), 0)
    const paid = payments.filter(pay => pay.purchaseId === p.id).reduce((sum, pay) => sum + Number(pay.amount), 0)
    const outstanding = Math.max(0, total - paid)
    return { id: p.id, date: p.date, dueDate: p.dueDate || null, supplier: supplierNames.get(p.supplierId) || p.supplierId, total, paid, outstanding, status: outstanding <= 0.005 ? 'paid' : p.dueDate && p.dueDate < new Date().toISOString().slice(0,10) ? 'overdue' : 'open' }
  }).filter(r => r.outstanding > 0.005).sort((a,b) => (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31'))
  const columns: Column<PayableRow>[] = [
    { key: 'id', header: t('common.id'), cell: r => <IdCell>{r.id}</IdCell> },
    { key: 'date', header: t('common.date'), cell: r => formatDate(r.date) },
    { key: 'supplier', header: t('common.supplier'), className: 'w-[24%]', cell: r => <span className="block truncate font-medium" title={r.supplier}>{r.supplier}</span> },
    { key: 'dueDate', header: t('common.dueDate'), cell: r => r.dueDate ? formatDate(r.dueDate) : '—' },
    { key: 'total', header: t('common.total'), align: 'right', cell: r => <Money value={r.total} /> },
    { key: 'paid', header: t('common.paid'), align: 'right', cell: r => <Money value={r.paid} /> },
    { key: 'outstanding', header: t('common.outstanding'), align: 'right', cell: r => <Money value={r.outstanding} className="font-medium text-warning" /> },
    { key: 'status', header: t('common.status'), cell: r => <span className={r.status === 'overdue' ? 'rounded-full bg-destructive/10 px-2 py-1 text-xs text-destructive' : 'rounded-full bg-warning/10 px-2 py-1 text-xs text-warning'}>{r.status === 'overdue' ? t('common.overdue') : t('common.open')}</span> },
  ]
  return <>
    <PageHeader breadcrumbs={[{ label: t('nav.purchasing') }, { label: t('nav.payables') }]} title={t('nav.payables')} description={t('finance.payablesDesc')} />
    <KpiGrid>
      <KpiCard label={t('common.outstanding')} value={<Money value={rows.reduce((s,r)=>s+r.outstanding,0)} />} icon={Money as never} tone="warning" />
      <KpiCard label={t('common.overdue')} value={rows.filter(r=>r.status==='overdue').length} icon={Money as never} tone="destructive" />
      <KpiCard label={t('common.supplier')} value={new Set(rows.map(r=>r.supplier)).size} icon={Money as never} tone="neutral" />
    </KpiGrid>
    <DataTable rows={rows} columns={columns} getRowId={r=>r.id} searchText={r=>r.id+' '+r.supplier} editable={false} deletable={false} />
  </>
}
