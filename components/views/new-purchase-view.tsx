'use client'

import Link from 'next/link'
import { useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common/page-header'
import { SectionCard } from '@/components/common/section-card'
import { useApp } from '@/components/providers'
import { appToast as toast } from '@/lib/toast'
import { formatIDR } from '@/lib/format'
import { TODAY } from '@/lib/data'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const fetcher = (url: string) => fetch(url).then(async r => { if (!r.ok) throw new Error((await r.json()).error ?? 'Unable to load data'); return r.json() })
type Product = { id: string; name: string; averageCost?: number | string }
type StockRow = { productId: string; stock: number | string }
type Supplier = { id: string; name: string }
type Item = { key: string; productId: string; qty: string; unitCost: string }
const MAX_PURCHASE_QTY = 999999
const MAX_UNIT_PRICE = 999999999999

export function NewPurchaseView() {
  const { t } = useApp()
  const { mutate: globalMutate } = useSWRConfig()
  const { data: business } = useSWR<{id:string}>('/api/businesses/current', fetcher)
  const { data: suppliers, error: supplierError } = useSWR<Supplier[]>(business?.id ? '/api/suppliers?businessId='+encodeURIComponent(business.id) : null, fetcher)
  const { data: products, error: productError } = useSWR<Product[]>(business?.id ? '/api/products?businessId='+encodeURIComponent(business.id) : null, fetcher)
  const { data: stockRows } = useSWR<StockRow[]>(business?.id ? '/api/stock?businessId='+encodeURIComponent(business.id) : null, fetcher)
  const [supplierId,setSupplierId] = useState('')
  const [date,setDate] = useState(TODAY)
  const [dueDate,setDueDate] = useState('')
  const [notes,setNotes] = useState('')
  const [paid,setPaid] = useState('0')
  const [items,setItems] = useState<Item[]>([{key:'1',productId:'',qty:'1',unitCost:''}])
  const [saving,setSaving] = useState(false)
  if (supplierError || productError) return <p role="alert" className="text-sm text-destructive">{supplierError?.message ?? productError?.message}</p>
  if (!business || !suppliers || !products) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  const currentStock = (productId:string) => Number(stockRows?.find(row=>row.productId===productId)?.stock ?? 0)
  const total = items.reduce((sum,item)=>sum+Math.max(0,Number(item.qty)||0)*Math.max(0,Number(item.unitCost)||0),0)
  const paidAmount = Math.max(0,Number(paid)||0)
  const updateItem = (key:string,patch:Partial<Item>) => setItems(current=>current.map(item=>item.key===key?{...item,...patch}:item))
  const save = async () => {
    if (!supplierId) { toast.error('Select a supplier.'); return }
    if (!items.length || items.some(item=>!item.productId || !Number.isInteger(Number(item.qty)) || Number(item.qty)<=0 || Number(item.qty)>MAX_PURCHASE_QTY || !Number.isFinite(Number(item.unitCost)) || Number(item.unitCost)<0 || Number(item.unitCost)>MAX_UNIT_PRICE)) { toast.error('Add at least one valid purchase item.'); return }
    if (paidAmount > total) { toast.error('Payment cannot exceed purchase total.'); return }
    setSaving(true)
    try {
      const stamp=crypto.randomUUID()
      const response=await fetch('/api/purchases',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
        businessId:business.id,date,supplierId,dueDate:dueDate||null,notes,paidAmount,
        paymentId:paidAmount>0?'PAY-'+stamp:undefined,paymentDate:date,paymentAccount:'Cash',
        items:items.map(item=>({id:'PI-'+crypto.randomUUID(),productId:item.productId,qty:Number(item.qty),unitCost:Number(item.unitCost)}))
      })})
      const result=await response.json()
      if(!response.ok) throw new Error(result.error??'Unable to save purchase')
      await Promise.all([
        globalMutate('/api/purchases?businessId='+encodeURIComponent(business.id)),
        globalMutate('/api/payments?businessId='+encodeURIComponent(business.id)),
        globalMutate('/api/products?businessId='+encodeURIComponent(business.id)),
        globalMutate('/api/stock?businessId='+encodeURIComponent(business.id)),
        globalMutate('/api/accounting?businessId='+encodeURIComponent(business.id)),
        globalMutate('/api/dashboard?businessId='+encodeURIComponent(business.id))
      ])
      toast.success(t('form.savedFeedback'))
      window.location.href='/purchases/'+encodeURIComponent(result.id)
    } catch(error) { toast.error(error instanceof Error?error.message:'Unable to save purchase') }
    finally { setSaving(false) }
  }
  return <div className="space-y-4">
    <PageHeader breadcrumbs={[{label:t('nav.purchasing')},{label:t('nav.purchases'),href:'/purchases'},{label:'New Purchase'}]} title="New Purchase" description="Enter purchase details, then save to increase stock and record any initial payment." actions={<Button variant="outline" nativeButton={false} render={<Link href="/purchases"/>}>Back to purchases</Button>}/>
    <form onSubmit={event=>{event.preventDefault();void save()}} className="grid gap-4 lg:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
        <SectionCard title="Purchase Information">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor="supplier">{t('common.supplier')}</Label><select id="supplier" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={supplierId} onChange={e=>setSupplierId(e.target.value)} required><option value="">Select supplier</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="purchase-date">Purchase Date</Label><Input id="purchase-date" type="date" value={date} onChange={e=>setDate(e.target.value)} required /></div>
          </div>
        </SectionCard>
        <SectionCard title="Purchase Items">
          <ul className="flex flex-col gap-4">
            {items.map(item=>{
              const product=products.find(p=>p.id===item.productId)
              const qty=Math.max(0,Number(item.qty)||0)
              const stock=currentStock(item.productId)
              return <li key={item.key} className="rounded-lg border p-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-12">
                  <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-4"><Label htmlFor={'product-'+item.key}>Product</Label><select id={'product-'+item.key} className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={item.productId} required onChange={e=>updateItem(item.key,{productId:e.target.value,unitCost:''})}><option value="">Select product</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2"><Label htmlFor={'qty-'+item.key}>{t('common.qty')}</Label><Input id={'qty-'+item.key} type="number" min={1} max={MAX_PURCHASE_QTY} step={1} value={item.qty} onChange={e=>updateItem(item.key,{qty:e.target.value})} required className="font-mono"/></div>
                  <div className="flex flex-col gap-1.5 sm:col-span-3"><Label htmlFor={'cost-'+item.key}>Purchase Price (Rp)</Label><Input id={'cost-'+item.key} type="number" min={0} max={MAX_UNIT_PRICE} value={item.unitCost} onChange={e=>updateItem(item.key,{unitCost:e.target.value})} required className="font-mono"/></div>
                  <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2"><Label>Subtotal</Label><div className="flex h-10 min-w-0 items-center"><p title={formatIDR(qty*Math.max(0,Number(item.unitCost)||0))} className="truncate font-mono text-sm font-semibold tabular-nums">{formatIDR(qty*Math.max(0,Number(item.unitCost)||0))}</p></div></div>
                  <div className="flex flex-col gap-1.5 sm:col-span-1"><Label className="invisible">Remove</Label><div className="flex h-10 items-center justify-center"><Button type="button" variant="ghost" size="icon-sm" aria-label="Remove item" disabled={items.length===1} onClick={()=>setItems(current=>current.filter(row=>row.key!==item.key))}><Trash2 className="size-4"/></Button></div></div>
                </div>
                {item.productId&&<div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>Stock after purchase: <span className="font-mono">{stock.toLocaleString('id-ID')} → {(stock+qty).toLocaleString('id-ID')}</span></span><span>{product?.name} (+{qty.toLocaleString('id-ID')})</span></div>}
              </li>
            })}
          </ul>
          <div className="mt-4"><Button type="button" variant="outline" onClick={()=>setItems(current=>[...current,{key:crypto.randomUUID(),productId:'',qty:'1',unitCost:''}])}><Plus/> Add item</Button></div>
        </SectionCard>
        <SectionCard title={t('common.notes')}><Textarea name="notes" rows={3} placeholder="…" value={notes} onChange={e=>setNotes(e.target.value)}/></SectionCard>
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <SectionCard title="Payment Summary" className="lg:sticky lg:top-20">
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">{t('common.total')}</dt><dd className="font-mono text-lg font-semibold tabular-nums">{formatIDR(total)}</dd></div>
            <div className="flex justify-between text-xs"><dt className="text-muted-foreground">Purchase Cost</dt><dd className="font-mono tabular-nums text-muted-foreground">{formatIDR(total)}</dd></div>
            <div className="flex justify-between text-xs"><dt className="text-muted-foreground">Stock Increase</dt><dd className="font-mono tabular-nums text-success">+{items.reduce((sum,item)=>sum+Math.max(0,Number(item.qty)||0),0)} units</dd></div>
          </dl>
          <div className="mt-4 flex flex-col gap-3 border-t pt-4">
            <div className="flex flex-col gap-1.5"><Label htmlFor="paid">Paid</Label><Input id="paid" type="number" min={0} max={Math.max(total,0)} className="font-mono" value={paid} onChange={e=>setPaid(e.target.value)}/></div>
            {total > 0 && paidAmount < total && <div className="flex flex-col gap-1.5"><Label htmlFor="due-date">{t('common.dueDate')}</Label><Input id="due-date" type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></div>}
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t('common.outstanding')}</span><span className="font-mono font-semibold tabular-nums text-warning">{formatIDR(Math.max(total-paidAmount,0))}</span></div>
          </div>
          <div className="mt-5 flex gap-2"><Button type="button" variant="outline" className="flex-1" nativeButton={false} render={<Link href="/purchases"/>}>{t('common.cancel')}</Button><Button type="submit" className="flex-1" disabled={saving}>{saving?'Saving…':'Save Purchase'}</Button></div>
        </SectionCard>
      </div>
    </form>
  </div>
}
