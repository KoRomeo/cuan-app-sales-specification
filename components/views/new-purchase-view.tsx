'use client'

import Link from 'next/link'
import { useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common/page-header'
import { SectionCard, DetailRow } from '@/components/common/section-card'
import { useApp } from '@/components/providers'
import { appToast as toast } from '@/lib/toast'
import { formatIDR } from '@/lib/format'
import { TODAY } from '@/lib/data'

const fetcher = (url: string) => fetch(url).then(async r => { if (!r.ok) throw new Error((await r.json()).error ?? 'Unable to load data'); return r.json() })
type Product = { id: string; name: string; stock?: number; averageCost?: number | string }
type Supplier = { id: string; name: string }
type Item = { key: string; productId: string; qty: string; unitCost: string }

export function NewPurchaseView() {
  const { t } = useApp()
  const { mutate: globalMutate } = useSWRConfig()
  const { data: business } = useSWR<{id:string}>('/api/businesses/current', fetcher)
  const { data: suppliers, error: supplierError } = useSWR<Supplier[]>(business?.id ? '/api/suppliers?businessId='+encodeURIComponent(business.id) : null, fetcher)
  const { data: products, error: productError } = useSWR<Product[]>(business?.id ? '/api/products?businessId='+encodeURIComponent(business.id) : null, fetcher)
  const { data: accounts } = useSWR<Array<{name:string;isActive?:boolean}>>(business?.id ? '/api/financial-accounts?businessId='+encodeURIComponent(business.id) : null, fetcher)
  const [supplierId,setSupplierId] = useState('')
  const [date,setDate] = useState(TODAY)
  const [dueDate,setDueDate] = useState('')
  const [notes,setNotes] = useState('')
  const [paid,setPaid] = useState('0')
  const [account,setAccount] = useState('Cash')
  const [items,setItems] = useState<Item[]>([{key:'1',productId:'',qty:'1',unitCost:''}])
  const [saving,setSaving] = useState(false)
  if (supplierError || productError) return <p role="alert" className="text-sm text-destructive">{supplierError?.message ?? productError?.message}</p>
  if (!business || !suppliers || !products) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  const total = items.reduce((sum,item)=>sum+Math.max(0,Number(item.qty)||0)*Math.max(0,Number(item.unitCost)||0),0)
  const paidAmount = Math.max(0,Number(paid)||0)
  const updateItem = (key:string,patch:Partial<Item>) => setItems(current=>current.map(item=>item.key===key?{...item,...patch}:item))
  const save = async () => {
    if (!supplierId) { toast.error('Select a supplier.'); return }
    if (!items.length || items.some(item=>!item.productId || Number(item.qty)<=0 || !Number.isFinite(Number(item.unitCost)) || Number(item.unitCost)<0)) { toast.error('Add at least one valid purchase item.'); return }
    if (paidAmount > total) { toast.error('Payment cannot exceed purchase total.'); return }
    setSaving(true)
    try {
      const stamp=crypto.randomUUID()
      const response=await fetch('/api/purchases',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
        businessId:business.id,date,supplierId,dueDate:dueDate||null,notes,paidAmount,
        paymentId:paidAmount>0?'PAY-'+stamp:undefined,paymentDate:date,paymentAccount:account,
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
  return <div className="space-y-6">
    <PageHeader breadcrumbs={[{label:t('nav.purchasing')},{label:t('nav.purchases'),href:'/purchases'},{label:'New Purchase'}]} title="New Purchase" description="Add multiple products to one supplier purchase." actions={<Button variant="outline" nativeButton={false} render={<Link href="/purchases"/>}><ArrowLeft/> Back to purchases</Button>}/>
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <SectionCard title="Purchase items" description="Add each product, quantity, and purchase unit cost.">
          <div className="space-y-4">
            {items.map((item,index)=><div key={item.key} className="grid grid-cols-1 gap-3 rounded-lg border p-4 sm:grid-cols-12">
              <div className="sm:col-span-5"><label className="mb-1.5 block text-sm font-medium">Product</label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={item.productId} onChange={e=>updateItem(item.key,{productId:e.target.value,unitCost:item.unitCost||String(products.find(p=>p.id===e.target.value)?.averageCost??'')})}><option value="">Select product</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div className="sm:col-span-2"><label className="mb-1.5 block text-sm font-medium">Qty</label><input type="number" min="1" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={item.qty} onChange={e=>updateItem(item.key,{qty:e.target.value})}/></div>
              <div className="sm:col-span-3"><label className="mb-1.5 block text-sm font-medium">Unit purchase cost (Rp)</label><input type="number" min="0" className="h-10 w-full rounded-md border bg-background px-3 text-sm" placeholder="40000" value={item.unitCost} onChange={e=>updateItem(item.key,{unitCost:e.target.value})}/></div>
              <div className="flex items-end justify-between sm:col-span-2"><div><p className="text-xs text-muted-foreground">Subtotal</p><p className="font-semibold tabular-nums">{formatIDR(Math.max(0,Number(item.qty)||0)*Math.max(0,Number(item.unitCost)||0))}</p></div><Button variant="ghost" size="icon" aria-label="Remove item" disabled={items.length===1} onClick={()=>setItems(current=>current.filter(i=>i.key!==item.key))}><Trash2 className="size-4"/></Button></div>
            </div>)}
            <Button variant="outline" onClick={()=>setItems(current=>[...current,{key:crypto.randomUUID(),productId:'',qty:'1',unitCost:''}])}><Plus/> Add item</Button>
          </div>
        </SectionCard>
        <SectionCard title="Payment summary">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className="mb-1.5 block text-sm font-medium">Amount paid now (Rp)</label><input type="number" min="0" max={total} className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={paid} onChange={e=>setPaid(e.target.value)}/></div>
            <div><label className="mb-1.5 block text-sm font-medium">Payment account</label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={account} onChange={e=>setAccount(e.target.value)}>{(accounts??[]).filter(a=>a.isActive!==false).map(a=><option key={a.name} value={a.name}>{a.name}</option>)}{!(accounts??[]).some(a=>a.name===account)&&<option value={account}>{account}</option>}</select></div>
          </div>
          <div className="mt-5 space-y-3 rounded-lg border bg-muted/30 p-4"><DetailRow label="Total purchase">{formatIDR(total)}</DetailRow><DetailRow label="Paid now">{formatIDR(paidAmount)}</DetailRow><DetailRow label="Outstanding payable"><span className="font-semibold">{formatIDR(Math.max(0,total-paidAmount))}</span></DetailRow></div>
        </SectionCard>
      </div>
      <div className="space-y-6">
        <SectionCard title="Purchase information">
          <div className="space-y-4">
            <div><label className="mb-1.5 block text-sm font-medium">Supplier</label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={supplierId} onChange={e=>setSupplierId(e.target.value)}><option value="">Select supplier</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div><label className="mb-1.5 block text-sm font-medium">Purchase date</label><input type="date" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={date} onChange={e=>setDate(e.target.value)}/></div>
            <div><label className="mb-1.5 block text-sm font-medium">Due date</label><input type="date" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></div>
            <div><label className="mb-1.5 block text-sm font-medium">Notes</label><textarea className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm" value={notes} onChange={e=>setNotes(e.target.value)}/></div>
            <div className="rounded-lg border bg-muted/30 p-4"><p className="text-sm text-muted-foreground">Stock increase after saving</p><div className="mt-3 space-y-2">{items.filter(i=>i.productId).map(i=><div key={i.key} className="flex justify-between gap-3 text-sm"><span>{products.find(p=>p.id===i.productId)?.name} (+{Number(i.qty)||0})</span><span className="text-muted-foreground">Current: {products.find(p=>p.id===i.productId)?.stock??'—'}</span></div>)}</div></div>
          </div>
        </SectionCard>
        <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" nativeButton={false} render={<Link href="/purchases"/>}>Cancel</Button><Button onClick={save} disabled={saving}>{saving?'Saving…':'Save Purchase'}</Button></div>
      </div>
    </div>
  </div>
}
