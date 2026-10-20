'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { useSWRConfig } from 'swr'
import { useState } from 'react'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { SectionCard } from '@/components/common/section-card'
import { useApp } from '@/components/providers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { selectClass } from '@/components/common/form-dialog'
import { appToast as toast } from '@/lib/toast'
import { TODAY } from '@/lib/data'
import { formatIDR } from '@/lib/format'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error((await response.json()).error ?? 'Unable to load return data')
  return response.json()
}
type ProductLine = { productId: string; qty: number; price: number | string; discount?: number | string }
type OrderRow = { id: string; customerId: string; date: string; status: string; items: ProductLine[] }
type CustomerRow = { id: string; name: string }
type PaymentRow = { orderId: string | null; amount: number | string }
type ProductRow = { id: string; name: string }
type Line = { key: number; productId: string; qty: number }

export function NewReturnView() {
  const { t } = useApp()
  const router = useRouter()
  const { mutate: globalMutate } = useSWRConfig()
  const { data: business, error: businessError } = useSWR<{ id: string }>('/api/businesses/current', fetcher)
  const { data: orders, error: ordersError } = useSWR<OrderRow[]>(business?.id ? `/api/orders?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const { data: customers } = useSWR<CustomerRow[]>(business?.id ? `/api/customers?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const { data: payments } = useSWR<PaymentRow[]>(business?.id ? `/api/payments?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const { data: products } = useSWR<ProductRow[]>(business?.id ? `/api/products?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const { data: previousReturns } = useSWR<Array<{ orderId: string; items: Array<{ productId: string; qty: number }>; refundAmount: string | number }>>(business?.id ? `/api/returns?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const [orderId, setOrderId] = useState('')
  const [stockReturned, setStockReturned] = useState('yes')
  const [refundCustomer, setRefundCustomer] = useState('no')
  const [refundAmount, setRefundAmount] = useState('0')
  const [returnDate, setReturnDate] = useState(TODAY)
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>([{ key: 1, productId: '', qty: 1 }])
  const [saving, setSaving] = useState(false)
  const order = orders?.find((row) => row.id === orderId)
  const customer = customers?.find((row) => row.id === order?.customerId)
  const productName = (id: string) => products?.find((row) => row.id === id)?.name ?? id
  const orderedLines = (order?.items ?? []).map((item) => ({ ...item, price: Number(item.price), discount: Number(item.discount ?? 0) }))
  const returnedQty = (productId: string) => (previousReturns ?? []).filter((row) => row.orderId === orderId).flatMap((row) => row.items ?? []).filter((item) => item.productId === productId).reduce((sum, item) => sum + Number(item.qty), 0)
  const eligibleLines = orderedLines.map((item) => ({ ...item, remaining: Math.max(0, Number(item.qty) - returnedQty(item.productId)) })).filter((item) => item.remaining > 0)
  const linePrice = (line: Line) => {
    const sold = orderedLines.find((item) => item.productId === line.productId)
    return sold ? Math.max(0, line.qty * sold.price - (sold.discount * line.qty / Number(sold.qty))) : 0
  }
  const total = lines.reduce((sum, line) => sum + linePrice(line), 0)
  const totalPaid = (orders ? 0 : 0) + 0
  const orderLines = order?.items ?? []
  const invalidLine = lines.some((line) => !line.productId || !Number.isInteger(line.qty) || line.qty < 1 || line.qty > (eligibleLines.find((item) => item.productId === line.productId)?.remaining ?? 0))
  if (businessError || ordersError) return <p role="alert" className="text-sm text-destructive">{(businessError || ordersError)?.message}</p>
  if (!business || !orders || !customers || !products || !previousReturns || !payments) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>

  return <>
    <PageHeader
      breadcrumbs={[{ label: t('nav.sales') }, { label: t('nav.returns'), href: '/returns' }, { label: 'Record Return' }]}
      title="Record Return"
      description="Record returned items, choose whether they re-enter stock, and record any customer refund."
      actions={<Button variant="outline" size="sm" nativeButton={false} render={<Link href="/returns" />}><ArrowLeft /> Back to returns</Button>}
    />
    <form className="grid gap-4 lg:grid-cols-3" onSubmit={async (event) => {
      event.preventDefault()
      if (!business?.id || !orderId || invalidLine || !lines.length) { toast.error('Select an order and valid returned quantities.'); return }
      const refund = Number(refundAmount || 0)
      if (refundCustomer === 'yes' && (!Number.isFinite(refund) || refund < 0 || refund > maxRefund)) { toast.error('Refund must be between Rp0 and the return total.'); return }
      setSaving(true)
      try {
        const response = await fetch('/api/returns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          businessId: business.id, orderId, date: returnDate, stockReturned: stockReturned === 'yes',
          refundCustomer: refundCustomer === 'yes', refundAmount: refundCustomer === 'yes' ? refund : 0, notes,
          items: lines.map(({ productId, qty }) => ({ productId, qty })),
        }) })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error ?? 'Failed to record return')
        await Promise.all([
          globalMutate(`/api/returns?businessId=${encodeURIComponent(business.id)}`),
          globalMutate(`/api/replacements?businessId=${encodeURIComponent(business.id)}`),
          globalMutate(`/api/orders?businessId=${encodeURIComponent(business.id)}`),
          globalMutate(`/api/products?businessId=${encodeURIComponent(business.id)}`),
          globalMutate(`/api/stock?businessId=${encodeURIComponent(business.id)}`),
          globalMutate(`/api/accounting?businessId=${encodeURIComponent(business.id)}`),
          globalMutate(`/api/dashboard?businessId=${encodeURIComponent(business.id)}`),
        ])
        toast.success('Return recorded successfully')
        router.push('/returns')
      } catch (error) { toast.error(error instanceof Error ? error.message : 'Failed to record return') } finally { setSaving(false) }
    }}>
      <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
        <SectionCard title="Return information">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5"><Label htmlFor="return-customer">Customer</Label><div className="flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm">{customer?.name ?? 'Select an order first'}</div></div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="return-order">Order ID</Label><select id="return-order" className={selectClass} value={orderId} onChange={(event) => { setOrderId(event.target.value); const next = orders.find((row) => row.id === event.target.value); const first = (next?.items ?? []).find((item) => Number(item.qty) - returnedQty(item.productId) > 0); setLines([{ key: Date.now(), productId: first?.productId ?? '', qty: 1 }]); setRefundAmount('0') }} required><option value="">Select order</option>{orders.filter((row) => row.status !== 'cancelled').map((row) => <option key={row.id} value={row.id}>{row.id} — {customers.find((c) => c.id === row.customerId)?.name ?? row.customerId}</option>)}</select></div>
            <div className="flex flex-col gap-1.5"><Label>Order date</Label><div className="flex h-10 items-center rounded-md border bg-muted/30 px-3 font-mono text-sm">{order?.date ?? '—'}</div></div>
          </div>
          <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2">
            <fieldset className="flex flex-col gap-2"><legend className="mb-2 text-sm font-medium">Return items to sellable stock?</legend><div className="flex gap-2">{[{value:'yes',label:'Yes, restock'},{value:'no',label:'No, keep out of stock'}].map((option) => <label key={option.value} className={`flex flex-1 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${stockReturned===option.value?'border-primary bg-primary/5':''}`}><input type="radio" name="stockReturned" value={option.value} checked={stockReturned===option.value} onChange={() => setStockReturned(option.value)} />{option.label}</label>)}</div></fieldset>
            <fieldset className="flex flex-col gap-2"><legend className="mb-2 text-sm font-medium">Refund money to customer?</legend><div className="flex gap-2">{[{value:'yes',label:'Yes, refund'},{value:'no',label:'No refund'}].map((option) => <label key={option.value} className={`flex flex-1 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${refundCustomer===option.value?'border-primary bg-primary/5':''}`}><input type="radio" name="refundCustomer" value={option.value} checked={refundCustomer===option.value} onChange={() => {setRefundCustomer(option.value);if(option.value==='no')setRefundAmount('0');else setRefundAmount(String(maxRefund))}} />{option.label}</label>)}</div></fieldset>
          </div>
        </SectionCard>
        <SectionCard title="Return items">
          <ul className="flex flex-col gap-3">{lines.map((line) => {
            const sold = orderedLines.find((item) => item.productId === line.productId)
            const remaining = eligibleLines.find((item) => item.productId === line.productId)?.remaining ?? 0
            const subtotal = linePrice(line)
            return <li key={line.key} className="rounded-lg border p-3"><div className="grid grid-cols-2 gap-3 sm:grid-cols-12">
              <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-4"><Label>Product</Label><select className={selectClass} value={line.productId} onChange={(event) => setLines((prev) => prev.map((item) => item.key === line.key ? {...item, productId:event.target.value,qty:1} : item))} required><option value="">Select product</option>{eligibleLines.map((item) => <option key={item.productId} value={item.productId}>{productName(item.productId)} (remaining {item.remaining})</option>)}</select></div>
              <div className="flex flex-col gap-1.5 sm:col-span-2"><Label>Qty returned</Label><Input type="number" min={1} max={remaining || 1} value={line.qty} onChange={(event) => setLines((prev) => prev.map((item) => item.key===line.key?{...item,qty:Number(event.target.value)}:item))} required /></div>
              <div className="flex flex-col gap-1.5 sm:col-span-2"><Label>Price (Rp)</Label><div className="flex h-10 items-center rounded-md border bg-muted/30 px-3 font-mono text-sm">{sold ? formatIDR(Number(sold.price)) : '—'}</div></div>
              <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-3"><Label>Subtotal</Label><div className="flex h-10 items-center truncate font-mono text-sm font-semibold text-destructive" title={formatIDR(subtotal)}>−{formatIDR(subtotal)}</div></div>
              <div className="flex flex-col gap-1.5 sm:col-span-1"><Label className="invisible">Remove</Label><div className="flex h-10 items-center justify-center"><Button type="button" variant="ghost" size="icon-sm" aria-label="Remove item" disabled={lines.length===1} onClick={() => setLines((prev) => prev.filter((item) => item.key!==line.key))}><Trash2 /></Button></div></div>
            </div></li>
          })}</ul>
          <div className="mt-4"><Button type="button" variant="outline" size="sm" disabled={!order || eligibleLines.length < 2 || lines.length >= eligibleLines.length || eligibleLines.every((item) => lines.some((line) => line.productId === item.productId))} onClick={() => {const available=eligibleLines.find((item)=>!lines.some((line)=>line.productId===item.productId));if(available)setLines((prev)=>[...prev,{key:Date.now(),productId:available.productId,qty:1}])}}><Plus /> Add item</Button></div>
          {!order && <p className="mt-2 text-xs text-muted-foreground">Select an order to choose products from its original items.</p>}
        </SectionCard>
        <SectionCard title="Notes"><Textarea rows={3} value={notes} onChange={(event)=>setNotes(event.target.value)} placeholder="Reason or additional return details…" /></SectionCard>
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <SectionCard title="Return summary" className="lg:sticky lg:top-20">
          <dl className="flex flex-col gap-3 text-sm"><div className="flex justify-between"><dt className="text-muted-foreground">Return total</dt><dd className="font-mono text-lg font-semibold tabular-nums text-destructive">−{formatIDR(total)}</dd></div></dl>
          {refundCustomer==='yes' && <div className="mt-4 flex flex-col gap-1.5"><Label htmlFor="refund-amount">Refund amount (Rp)</Label><Input id="refund-amount" type="number" min={0} max={maxRefund} value={refundAmount} onChange={(event)=>setRefundAmount(event.target.value)} required /><p className="text-xs text-muted-foreground">Maximum refundable: ${formatIDR(maxRefund)} based on this order's remaining paid balance.</p></div>}
          <div className="mt-4 flex flex-col gap-1.5"><Label htmlFor="return-date">Return date</Label><Input id="return-date" type="date" value={returnDate} onChange={(event)=>setReturnDate(event.target.value)} required /></div>
          <div className="mt-5 flex gap-2 border-t pt-4"><Button type="button" variant="outline" className="flex-1" nativeButton={false} render={<Link href="/returns" />}>Cancel</Button><Button type="submit" className="flex-1" disabled={saving||!orderId||invalidLine||!lines.length}>{saving?'Saving…':'Save Return'}</Button></div>
        </SectionCard>
      </div>
    </form>
  </>
}
