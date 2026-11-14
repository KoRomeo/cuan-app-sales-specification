'use client'

import useSWR from 'swr'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Banknote, ChartNoAxesCombined, ReceiptText } from 'lucide-react'
import { DataTable, IdCell, Money, type Column } from '@/components/common/data-table'
import { KpiCard, KpiGrid } from '@/components/common/kpi-card'
import { PageHeader } from '@/components/common/page-header'
import { SectionCard } from '@/components/common/section-card'
import { useApp } from '@/components/providers'
import { formatDate } from '@/lib/format'

const fetcher = async (url: string) => { const r = await fetch(url); const body = await r.json(); if (!r.ok) throw new Error(body.error || 'Unable to load financial data'); return body }
type Expense = { id: string; date: string; category: string; amount: string | number; account: string; description: string }
type ExpenseAccount = { id: string; name: string; active: boolean }
const today = () => new Date().toLocaleDateString('en-CA')
type OrderItem = { qty: string | number; price: string | number; discount?: string | number; discountType?: 'amount' | 'percent'; unitCost?: string | number }
type Order = { id: string; date: string; status: string; items: OrderItem[] }
type ReturnRow = { id: string; date: string; refundAmount: string | number; stockValue?: number; replacementCost?: number }
export function ExpensesView() {
  const { t, locale } = useApp()
  const { data: business } = useSWR<{id:string}>('/api/businesses/current', fetcher)
  const { data, error } = useSWR<Expense[]>(business?.id ? '/api/expenses?businessId='+encodeURIComponent(business.id) : null, fetcher)
  const label = (en:string,id:string) => locale === 'id' ? id : en
  const columns: Column<Expense>[] = [
    { key:'id', header:t('common.id'), cell:r=><IdCell>{r.id}</IdCell> },
    { key:'date', header:t('common.date'), cell:r=>formatDate(r.date), sortValue:r=>r.date },
    { key:'category', header:t('common.category'), cell:r=><span className="font-medium">{r.category}</span> },
    { key:'description', header:t('common.description'), className:'w-[30%]', cell:r=><span className="block truncate" title={r.description}>{r.description}</span> },
    { key:'account', header:t('common.account'), cell:r=>r.account },
    { key:'amount', header:t('common.amount'), align:'right', cell:r=><Money value={Number(r.amount)} />, sortValue:r=>Number(r.amount) },
  ]
  return <>
    <PageHeader breadcrumbs={[{label:t('nav.finance')},{label:t('nav.expenses')}]} title={t('nav.expenses')} description={label('Track operating expenses and their accounting entries.','Pantau biaya operasional dan pencatatan akuntansinya.')} />
    {error ? <p role="alert" className="text-sm text-destructive">{error.message}</p> : !business || !data ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : <>
      <KpiGrid><KpiCard label={label('Expense records','Catatan biaya')} value={data.length} icon={ReceiptText}/><KpiCard label={label('Total expenses','Total biaya')} value={<Money value={data.reduce((sum,r)=>sum+Number(r.amount),0)}/>} icon={Banknote} tone="warning"/></KpiGrid>
      <DataTable rows={data} columns={columns} getRowId={r=>r.id} searchText={r=>r.id+' '+r.category+' '+r.description+' '+r.account} editable={false} deletable={false} toolbarExtra={<Button onClick={()=>{ window.location.href='/expenses/new' }}>{label('Record expense','Catat biaya')}</Button>} />
    </>}
  </>
}

export function ExpenseNewView() {
  const { t, locale } = useApp()
  const router = useRouter()
  const { data: business } = useSWR<{id:string}>('/api/businesses/current', fetcher)
  const { data: accounts } = useSWR<ExpenseAccount[]>(business?.id ? '/api/financial-accounts?businessId='+encodeURIComponent(business.id) : null, fetcher)
  const [date, setDate] = useState(today())
  const [category, setCategory] = useState('Operating expense')
  const [amount, setAmount] = useState('')
  const [account, setAccount] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const label = (en:string,id:string) => locale === 'id' ? id : en
  const activeAccounts = (accounts ?? []).filter(item => item.active)
  return <>
    <PageHeader breadcrumbs={[{label:t('nav.finance'),href:'/expenses'},{label:t('nav.expenses'),href:'/expenses'},{label:label('New expense','Biaya baru')}]} title={label('Record expense','Catat biaya')} description={label('Enter the expense details. A journal entry will be created when saved.','Masukkan detail biaya. Jurnal akan dibuat saat data disimpan.')} />
    <SectionCard title={label('Expense details','Detail biaya')} description={label('Choose the account the money was paid from.','Pilih akun asal pembayaran biaya.')}>
      <form className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" onSubmit={async event => {
        event.preventDefault(); setFormError('')
        if (!business?.id || !account || !category.trim() || !description.trim() || Number(amount) <= 0 || !Number.isFinite(Number(amount))) { setFormError(label('Complete all fields and enter an amount greater than zero.','Lengkapi semua kolom dan masukkan nominal lebih dari nol.')); return }
        setSaving(true)
        try {
          const response = await fetch('/api/expenses', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({businessId:business.id,date,category:category.trim(),amount:Number(amount),account,description:description.trim()}) })
          const result = await response.json()
          if (!response.ok) throw new Error(result.error || label('Unable to save expense.','Biaya gagal disimpan.'))
          router.push('/expenses')
          router.refresh()
        } catch (err) { setFormError(err instanceof Error ? err.message : label('Unable to save expense.','Biaya gagal disimpan.')) }
        finally { setSaving(false) }
      }}>
        <label className="grid gap-1 text-sm"><span>{t('common.date')}</span><input required type="date" value={date} onChange={e=>setDate(e.target.value)} className="h-9 rounded-md border bg-background px-3" /></label>
        <label className="grid gap-1 text-sm"><span>{t('common.category')}</span><input required value={category} onChange={e=>setCategory(e.target.value)} placeholder={label('e.g. Transport, rent, utilities','mis. Transportasi, sewa, utilitas')} className="h-9 rounded-md border bg-background px-3" /></label>
        <label className="grid gap-1 text-sm"><span>{t('common.amount')}</span><input required type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0" className="h-9 rounded-md border bg-background px-3" /></label>
        <label className="grid gap-1 text-sm"><span>{t('common.account')}</span><select required value={account} onChange={e=>setAccount(e.target.value)} className="h-9 rounded-md border bg-background px-3"><option value="">{label('Select cash or bank account','Pilih akun kas atau bank')}</option>{activeAccounts.map(item=><option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
        <label className="grid gap-1 text-sm sm:col-span-2"><span>{t('common.description')}</span><input required value={description} onChange={e=>setDescription(e.target.value)} placeholder={label('What was this expense for?','Untuk keperluan apa biaya ini?')} className="h-9 rounded-md border bg-background px-3" /></label>
        {formError && <p role="alert" className="text-sm text-destructive sm:col-span-2 xl:col-span-3">{formError}</p>}
        {accounts && activeAccounts.length===0 && <p className="text-sm text-destructive sm:col-span-2 xl:col-span-3">{label('Create or activate a Cash & Bank account first.','Buat atau aktifkan akun Kas & Bank terlebih dahulu.')}</p>}
        <div className="flex justify-end gap-2 sm:col-span-2 xl:col-span-3"><Button type="button" variant="outline" onClick={()=>router.push('/expenses')}>{label('Cancel','Batal')}</Button><Button type="submit" disabled={saving || !business?.id || activeAccounts.length===0}>{saving ? label('Saving…','Menyimpan…') : label('Save expense','Simpan biaya')}</Button></div>
      </form>
    </SectionCard>
  </>
}
export function ProfitLossView() {
  const { t, locale } = useApp()
  const { data: business } = useSWR<{id:string}>('/api/businesses/current', fetcher)
  const { data: orders, error: ordersError } = useSWR<Order[]>(business?.id ? '/api/orders?businessId='+encodeURIComponent(business.id) : null, fetcher)
  const { data: expenses, error: expensesError } = useSWR<Expense[]>(business?.id ? '/api/expenses?businessId='+encodeURIComponent(business.id) : null, fetcher)
  const { data: returns, error: returnsError } = useSWR<ReturnRow[]>(business?.id ? '/api/returns?businessId='+encodeURIComponent(business.id) : null, fetcher)
  const label = (en:string,id:string) => locale === 'id' ? id : en
  const error = ordersError || expensesError || returnsError
  if (error) return <p role="alert" className="text-sm text-destructive">{error.message}</p>
  if (!business || !orders || !expenses || !returns) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  const active = orders.filter(o=>o.status!=='cancelled')
  const lineNet = (i: OrderItem) => { const gross = Number(i.qty)*Number(i.price); return Math.max(0, gross - (i.discountType === 'percent' ? gross*Number(i.discount ?? 0)/100 : Number(i.discount ?? 0))) }
  const grossRevenue = active.reduce((sum,o)=>sum+o.items.reduce((sub,i)=>sub+lineNet(i),0),0)
  const refundTotal = returns.reduce((sum,r)=>sum+Number(r.refundAmount),0)
  const returnedStockValue = returns.reduce((sum,r)=>sum+Number(r.stockValue ?? 0),0)
  const replacementCost = returns.reduce((sum,r)=>sum+Number(r.replacementCost ?? 0),0)
  const revenue = grossRevenue - refundTotal
  const cogs = active.reduce((sum,o)=>sum+o.items.reduce((sub,i)=>sub+Number(i.qty)*Number(i.unitCost||0),0),0) - returnedStockValue
  const expenseTotal = expenses.reduce((sum,e)=>sum+Number(e.amount),0)
  const gross = revenue-cogs-replacementCost, net = gross-expenseTotal
  return <>
    <PageHeader breadcrumbs={[{label:t('nav.finance')},{label:t('nav.profitLoss')}]} title={t('nav.profitLoss')} description={label('Revenue, cost of goods sold, expenses and net result from recorded transactions.','Pendapatan, harga pokok penjualan, biaya, dan hasil bersih dari transaksi yang tercatat.')} />
    <KpiGrid><KpiCard label={label('Revenue','Pendapatan')} value={<Money value={revenue}/>} icon={ChartNoAxesCombined}/><KpiCard label={label('Cost of goods sold','Harga pokok penjualan')} value={<Money value={cogs}/>} icon={Banknote} tone="warning"/><KpiCard label={label('Gross profit','Laba kotor')} value={<Money value={gross}/>} icon={ChartNoAxesCombined} tone={gross<0?'destructive':'success'}/><KpiCard label={label('Net profit','Laba bersih')} value={<Money value={net}/>} icon={Banknote} tone={net<0?'destructive':'success'}/></KpiGrid>
    <SectionCard title={label('Profit & loss statement','Laporan laba rugi')}>
      <div className="space-y-3 text-sm">
        <Line label={label('Revenue','Pendapatan')} value={grossRevenue}/>
        <Line label={label('Returns / refunds','Retur / pengembalian')} value={-refundTotal}/>
        <Line label={label('Cost of goods sold','Harga pokok penjualan')} value={-cogs}/>
        <Line label={label('Replacement cost','Biaya penggantian')} value={-replacementCost}/>
        <Line label={label('Gross profit','Laba kotor')} value={gross} strong/>
        <Line label={label('Operating expenses','Biaya operasional')} value={-expenseTotal}/>
        <Line label={label('Net profit / (loss)','Laba / (rugi) bersih')} value={net} strong/>
      </div>
    </SectionCard>
  </>
}
function Line({label,value,strong=false}:{label:string;value:number;strong?:boolean}) { return <div className={'flex items-center justify-between gap-4 py-2 '+(strong?'border-t font-semibold':'')}><span>{label}</span><Money value={value}/></div> }
