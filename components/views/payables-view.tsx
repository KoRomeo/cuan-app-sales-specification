'use client'

import useSWR from 'swr'
import { ClockAlert, Building2, Wallet } from 'lucide-react'
import { DataTable, IdCell, Money, type Column } from '@/components/common/data-table'
import { KpiCard, KpiGrid } from '@/components/common/kpi-card'
import { PageHeader } from '@/components/common/page-header'
import { useApp } from '@/components/providers'
import { formatDate } from '@/lib/format'

type PurchaseItem = { id: string; productId: string; qty: number | string; unitCost: number | string; discount?: number | string; discountType?: "amount" | "percent" }
type Purchase = { id: string; date: string; dueDate?: string | null; supplierId: string; status?: string; totalOverride?: number | string | null; items: PurchaseItem[] }
type Supplier = { id: string; name: string }
type Payment = { id: string; purchaseId?: string | null; amount: number | string }
const fetcher = async (url: string) => { const r = await fetch(url); const body = await r.json(); if (!r.ok) throw new Error(body.error || 'Unable to load payables'); return body }
type PayableRow = { id: string; date: string; dueDate: string | null; supplier: string; total: number; paid: number; outstanding: number; paymentStatus: 'open' | 'partial'; isOverdue: boolean }
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
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const rows: PayableRow[] = purchases.filter(p => p.status !== 'cancelled').map(p => {
    const calculatedTotal = p.items.reduce((sum, i) => { const gross = Number(i.qty) * Number(i.unitCost); const discount = i.discountType === "percent" ? gross * Number(i.discount ?? 0) / 100 : Number(i.discount ?? 0); return sum + Math.ceil(Math.max(0, gross - discount) - 1e-9) }, 0)
    const total = p.totalOverride != null ? Number(p.totalOverride) : calculatedTotal
    const paid = payments.filter(pay => pay.purchaseId === p.id).reduce((sum, pay) => sum + Number(pay.amount), 0)
    const outstanding = Math.max(0, total - paid)
    const dueDate = p.dueDate || null
    return { id: p.id, date: p.date, dueDate, supplier: supplierNames.get(p.supplierId) || p.supplierId, total, paid, outstanding, paymentStatus: paid > 0.005 ? 'partial' as const : 'open' as const, isOverdue: Boolean(dueDate && dueDate < today && outstanding > 0.005) }
  }).filter(r => r.outstanding > 0.005).sort((a,b) => (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31'))
  const columns: Column<PayableRow>[] = [
    { key: 'id', header: t('common.id'), cell: r => <IdCell>{r.id}</IdCell> },
    { key: 'date', header: t('common.date'), cell: r => formatDate(r.date) },
    { key: 'supplier', header: t('common.supplier'), className: 'w-[24%]', cell: r => <span className="block truncate font-medium" title={r.supplier}>{r.supplier}</span> },
    { key: 'dueDate', header: t('common.dueDate'), cell: r => r.dueDate ? formatDate(r.dueDate) : '—' },
    { key: 'total', header: t('common.total'), align: 'right', cell: r => <Money value={r.total} /> },
    { key: 'paid', header: t('common.paid'), align: 'right', cell: r => <Money value={r.paid} /> },
    { key: 'outstanding', header: t('common.outstanding'), align: 'right', cell: r => <Money value={r.outstanding} className="font-medium text-warning" /> },
    { key: 'status', header: t('common.status'), cell: r => <div className="flex flex-wrap items-center gap-1">{r.isOverdue && <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs text-destructive">{t('common.overdue')}</span>}<span className={r.paymentStatus === 'partial' ? 'rounded-full bg-primary/10 px-2 py-1 text-xs text-primary' : 'rounded-full bg-warning/10 px-2 py-1 text-xs text-warning'}>{r.paymentStatus === 'partial' ? t('common.partial') : t('common.open')}</span></div> },
  ]
  return <>
    <PageHeader breadcrumbs={[{ label: t('nav.purchasing') }, { label: t('nav.payables') }]} title={t('nav.payables')} description={t('finance.payablesDesc')} />
    <KpiGrid>
      <KpiCard label={t('common.outstanding')} value={<Money value={rows.reduce((s,r)=>s+r.outstanding,0)} />} icon={Wallet} tone="warning" />
      <KpiCard label={t('common.overdue')} value={rows.filter(r=>r.isOverdue).length} icon={ClockAlert} tone="destructive" />
      <KpiCard label={t('common.supplier')} value={new Set(rows.map(r=>r.supplier)).size} icon={Building2} tone="neutral" />
    </KpiGrid>
    <DataTable rows={rows} columns={columns} getRowId={r=>r.id} searchText={r=>r.id+' '+r.supplier} rowHref={r=>`/purchases/${encodeURIComponent(r.id)}`} editable={false} deletable={false} />
  </>
}
