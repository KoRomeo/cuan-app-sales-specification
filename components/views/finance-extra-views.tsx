'use client'

import useSWR from 'swr'
import { Banknote, ChartNoAxesCombined, ReceiptText } from 'lucide-react'
import { DataTable, IdCell, Money, type Column } from '@/components/common/data-table'
import { KpiCard, KpiGrid } from '@/components/common/kpi-card'
import { PageHeader } from '@/components/common/page-header'
import { SectionCard } from '@/components/common/section-card'
import { useApp } from '@/components/providers'
import { formatDate } from '@/lib/format'

const fetcher = async (url: string) => { const r = await fetch(url); const body = await r.json(); if (!r.ok) throw new Error(body.error || 'Unable to load financial data'); return body }
type Expense = { id: string; date: string; category: string; amount: string | number; account: string; description: string }
type OrderItem = { qty: string | number; price: string | number; discount?: string | number; unitCost?: string | number }
type Order = { id: string; date: string; status: string; items: OrderItem[] }
export function ExpensesView() {
  const { t, locale } = useApp()
  const { data: business } = useSWR<{id:string}>('/api/businesses/current', fetcher)
  const { data, error } = useSWR<Expense[]>(business?.id ? '/api/expenses?businessId='+encodeURIComponent(business.id) : null, fetcher)
  const label = (en:string,id:string) => locale === 'id' ? id : en
  const columns: Column<Expense>[] = [
    { key:'id', header:t('common.id'), cell:r=><IdCell>{r.id}</IdCell> },
    { key:'date', header:t('common.date'), cell:r=>formatDate(r.date) },
    { key:'category', header:t('common.category'), cell:r=><span className="font-medium">{r.category}</span> },
    { key:'description', header:t('common.description'), className:'w-[30%]', cell:r=><span className="block truncate" title={r.description}>{r.description}</span> },
    { key:'account', header:t('common.account'), cell:r=>r.account },
    { key:'amount', header:t('common.amount'), align:'right', cell:r=><Money value={Number(r.amount)} /> },
  ]
  return <>
    <PageHeader breadcrumbs={[{label:t('nav.finance')},{label:t('nav.expenses')}]} title={t('nav.expenses')} description={label('Business expenses recorded against cash and bank accounts.','Biaya usaha yang dicatat terhadap akun kas dan bank.')} />
    {error ? <p role="alert" className="text-sm text-destructive">{error.message}</p> : !business || !data ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : <>
      <KpiGrid><KpiCard label={label('Expense records','Catatan biaya')} value={data.length} icon={ReceiptText}/><KpiCard label={label('Total expenses','Total biaya')} value={<Money value={data.reduce((sum,r)=>sum+Number(r.amount),0)}/>} icon={Banknote} tone="warning"/></KpiGrid>
      <DataTable rows={data} columns={columns} getRowId={r=>r.id} searchText={r=>r.id+' '+r.category+' '+r.description+' '+r.account} editable={false} deletable={false} />
    </>}
  </>
}
export function ProfitLossView() {
  const { t, locale } = useApp()
  const { data: business } = useSWR<{id:string}>('/api/businesses/current', fetcher)
  const { data: orders, error: ordersError } = useSWR<Order[]>(business?.id ? '/api/orders?businessId='+encodeURIComponent(business.id) : null, fetcher)
  const { data: expenses, error: expensesError } = useSWR<Expense[]>(business?.id ? '/api/expenses?businessId='+encodeURIComponent(business.id) : null, fetcher)
  const label = (en:string,id:string) => locale === 'id' ? id : en
  const error = ordersError || expensesError
  if (error) return <p role="alert" className="text-sm text-destructive">{error.message}</p>
  if (!business || !orders || !expenses) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  const active = orders.filter(o=>o.status!=='cancelled')
  const revenue = active.reduce((sum,o)=>sum+o.items.reduce((sub,i)=>sub+Number(i.qty)*Number(i.price)-Number(i.discount||0),0),0)
  const cogs = active.reduce((sum,o)=>sum+o.items.reduce((sub,i)=>sub+Number(i.qty)*Number(i.unitCost||0),0),0)
  const expenseTotal = expenses.reduce((sum,e)=>sum+Number(e.amount),0)
  const gross = revenue-cogs, net = gross-expenseTotal
  return <>
    <PageHeader breadcrumbs={[{label:t('nav.finance')},{label:t('nav.profitLoss')}]} title={t('nav.profitLoss')} description={label('Revenue, cost of goods sold, expenses and net result from recorded transactions.','Pendapatan, harga pokok penjualan, biaya, dan hasil bersih dari transaksi yang tercatat.')} />
    <KpiGrid><KpiCard label={label('Revenue','Pendapatan')} value={<Money value={revenue}/>} icon={ChartNoAxesCombined}/><KpiCard label={label('Cost of goods sold','Harga pokok penjualan')} value={<Money value={cogs}/>} icon={Banknote} tone="warning"/><KpiCard label={label('Gross profit','Laba kotor')} value={<Money value={gross}/>} icon={ChartNoAxesCombined} tone={gross<0?'destructive':'success'}/><KpiCard label={label('Net profit','Laba bersih')} value={<Money value={net}/>} icon={Banknote} tone={net<0?'destructive':'success'}/></KpiGrid>
    <SectionCard title={label('Profit & loss statement','Laporan laba rugi')}>
      <div className="space-y-3 text-sm">
        <Line label={label('Revenue','Pendapatan')} value={revenue}/>
        <Line label={label('Cost of goods sold','Harga pokok penjualan')} value={-cogs}/>
        <Line label={label('Gross profit','Laba kotor')} value={gross} strong/>
        <Line label={label('Operating expenses','Biaya operasional')} value={-expenseTotal}/>
        <Line label={label('Net profit / (loss)','Laba / (rugi) bersih')} value={net} strong/>
      </div>
    </SectionCard>
  </>
}
function Line({label,value,strong=false}:{label:string;value:number;strong?:boolean}) { return <div className={'flex items-center justify-between gap-4 py-2 '+(strong?'border-t font-semibold':'')}><span>{label}</span><Money value={value}/></div> }
