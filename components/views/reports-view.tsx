'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Download, Search, RefreshCw } from 'lucide-react'
import { KpiCard, KpiGrid } from '@/components/common/kpi-card'
import { PageHeader } from '@/components/common/page-header'
import { SectionCard } from '@/components/common/section-card'
import { useApp } from '@/components/providers'
import { Button } from '@/components/ui/button'
import { formatIDR, formatNumber } from '@/lib/format'

type ReportTab = 'sales' | 'purchases' | 'inventory' | 'financial' | 'receivables' | 'delivery' | 'tax' | 'history'
type ReportData = {
  summary: Record<string, number>
  sales: any[]; purchases: any[]; inventory: any[]; payments: any[]; expenses: any[]
  deliveries: any[]; replacements: any[]; journals: any[]; ledger: any[]; history: any[]; salesTax: any[]
}
const businessFetcher = async (url: string): Promise<{id:string}> => { const response = await fetch(url); if (!response.ok) throw new Error('Unable to load business'); return response.json() }
const fetcher = async (url: string): Promise<ReportData> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? 'Unable to load reports')
  return response.json()
}
const todayISO = () => {
  const d = new Date()
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-')
}
const yearStart = () => todayISO().slice(0,4) + '-01-01'
const tabs: {id: ReportTab; label: string}[] = [
  {id:'sales',label:'Sales'}, {id:'purchases',label:'Purchases'}, {id:'inventory',label:'Inventory'},
  {id:'financial',label:'Financial'}, {id:'receivables',label:'Receivables & Payables'},
  {id:'delivery',label:'Delivery & Replacement'}, {id:'tax',label:'Sales Tax'}, {id:'history',label:'Activity History'},
]
function display(value: unknown, key: string) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'number') return /amount|total|price|cost|profit|cash|payable|receivable|debit|credit|value|paid|outstanding|sales|purchase/i.test(key) ? formatIDR(value) : formatNumber(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join('; ')
  return String(value)
}
function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const keys = [...new Set(rows.flatMap(row => Object.keys(row)))]
  const csv = [keys, ...rows.map(row => keys.map(key => {
    const value = row[key]
    const raw = value && typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')
    return '"' + raw.replace(/"/g, '""') + '"'
  }))].map(row => row.join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], {type:'text/csv;charset=utf-8;'}))
  const link = document.createElement('a')
  link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url)
}
function Table({ rows, search }: { rows: Record<string, unknown>[]; search: string }) {
  const filtered = useMemo(() => rows.filter(row => Object.values(row).some(value => String(value ?? '').toLowerCase().includes(search.toLowerCase()))), [rows,search])
  if (!filtered.length) return <p className="p-5 text-sm text-muted-foreground">No records found for this period or search.</p>
  const keys = [...new Set(filtered.flatMap(row => Object.keys(row)))].filter(key => !['items','lines','changes'].includes(key))
  return <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/30">{keys.map(key=><th key={key} className="whitespace-nowrap px-4 py-3 text-left font-medium capitalize">{key.replace(/([A-Z])/g,' $1')}</th>)}</tr></thead><tbody>{filtered.map((row,index)=><tr key={String(row.id ?? index)} className="border-b last:border-0 hover:bg-muted/20">{keys.map(key=><td key={key} className="max-w-xs px-4 py-3 align-top">{key==='id'||key==='reference'?<span className="font-mono text-xs">{display(row[key],key)}</span>:display(row[key],key)}</td>)}</tr>)}</tbody></table><p className="px-4 py-3 text-xs text-muted-foreground">{filtered.length} records</p></div>
}
export function ReportsView() {
  const { t, locale } = useApp()
  const [tab,setTab] = useState<ReportTab>('sales')
  const [from,setFrom] = useState(yearStart)
  const [to,setTo] = useState(todayISO)
  const [search,setSearch] = useState('')
  const {data:business} = useSWR<{id:string}>('/api/businesses/current', businessFetcher)
  const query = business?.id && from && to && from <= to ? '/api/reports?businessId='+encodeURIComponent(business.id)+'&from='+from+'&to='+to : null
  const {data,error,isLoading,mutate} = useSWR<ReportData>(query,fetcher)
  const s = data?.summary ?? {}
  const currency = (n:number|undefined) => formatIDR(n ?? 0)
  const rows = useMemo(() => {
    if (!data) return []
    switch(tab) {
      case 'sales': return data.sales
      case 'purchases': return data.purchases
      case 'inventory': return data.inventory
      case 'financial': return [...data.ledger, ...data.expenses.map(x=>({...x, kind:'expense', debit: x.amount, credit: 0}))]
      case 'receivables': return [...data.sales.filter(x=>x.outstanding>0).map(x=>({id:x.id,date:x.date,party:x.customer,total:x.total,paid:x.paid,outstanding:x.outstanding,type:'receivable'})), ...data.purchases.filter(x=>x.outstanding>0).map(x=>({id:x.id,date:x.date,party:x.supplier,total:x.total,paid:x.paid,outstanding:x.outstanding,type:'payable'}))]
      case 'delivery': return [...data.deliveries.map(x=>({...x,type:'delivery'})), ...data.replacements.map(x=>({...x,type:'replacement'}))]
      case 'tax': return data.salesTax ?? []
      case 'history': return data.history
    }
  },[data,tab])
  const title = tabs.find(x=>x.id===tab)?.label ?? 'Reports'
  const labels = locale === 'id' ? {search:'Cari laporan...',from:'Dari tanggal',to:'Sampai tanggal',export:'Ekspor CSV',refresh:'Muat ulang',sales:'Penjualan',orders:'Jumlah order',profit:'Laba kotor',purchases:'Pembelian',receivable:'Piutang tersisa',payable:'Utang tersisa',inventory:'Nilai persediaan',loading:'Memuat laporan...',error:'Gagal memuat laporan',range:'Rentang tanggal tidak valid'} : {search:'Search reports...',from:'From date',to:'To date',export:'Export CSV',refresh:'Refresh',sales:'Sales',orders:'Orders',profit:'Gross profit',purchases:'Purchases',receivable:'Outstanding receivables',payable:'Outstanding payables',inventory:'Inventory value',loading:'Loading reports...',error:'Failed to load reports',range:'Invalid date range'}
  return <>
    <PageHeader breadcrumbs={[{label:t('nav.reports')},{label:t('nav.allReports')}]} title={t('reports.title')} description={t('reports.desc')} />
    <div className="mb-5 flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
      <label className="grid gap-1 text-xs text-muted-foreground">{labels.from}<input type="date" value={from} max={to} onChange={e=>setFrom(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"/></label>
      <label className="grid gap-1 text-xs text-muted-foreground">{labels.to}<input type="date" value={to} min={from} max={todayISO()} onChange={e=>setTo(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"/></label>
      <div className="relative min-w-[190px] flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={labels.search} className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm"/></div>
      <Button variant="outline" onClick={()=>mutate()} disabled={!query}><RefreshCw className="mr-2 size-4"/>{labels.refresh}</Button>
      <Button onClick={()=>exportCsv('cuanapp-'+tab+'-'+from+'-'+to+'.csv',rows as Record<string,unknown>[])} disabled={!rows.length}><Download className="mr-2 size-4"/>{labels.export}</Button>
    </div>
    <div className="mb-5 flex flex-wrap gap-2" role="tablist">{tabs.map(item=><Button key={item.id} role="tab" aria-selected={tab===item.id} variant={tab===item.id?'default':'outline'} size="sm" onClick={()=>setTab(item.id)}>{item.label}</Button>)}</div>
    {isLoading && <p className="py-8 text-sm text-muted-foreground">{labels.loading}</p>}
    {error && <div className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">{labels.error}: {error.message}</div>}
    {from>to && <p className="text-sm text-destructive">{labels.range}</p>}
    {data && <>
      <KpiGrid>
        <KpiCard label={labels.sales} value={currency(s.sales)} />
        <KpiCard label={labels.orders} value={formatNumber(s.orders ?? 0)} />
        <KpiCard label={labels.profit} value={currency(s.grossProfit)} />
        <KpiCard label={labels.purchases} value={currency(s.purchases)} />
      </KpiGrid>
      <div className="mt-4"><KpiGrid>
        <KpiCard label={labels.receivable} value={currency(s.receivables)} tone="warning"/>
        <KpiCard label={labels.payable} value={currency(s.payables)} tone="warning"/>
        <KpiCard label={labels.inventory} value={currency(s.inventoryValue)} />
        <KpiCard label={locale==='id'?'Pajak penjualan':'Sales tax'} value={currency(s.taxCollected)} />
        <KpiCard label={locale==='id'?'Laba bersih':'Net profit'} value={currency(s.netProfit)} tone={Number(s.netProfit)>=0?'success':'warning'}/>
      </KpiGrid></div>
      <div className="mt-5"><SectionCard title={title} description={from+' — '+to} bodyClassName="p-0 md:p-0"><Table rows={rows as Record<string,unknown>[]} search={search}/></SectionCard></div>
    </>}
  </>
}
