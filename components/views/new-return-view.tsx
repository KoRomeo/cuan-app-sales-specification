'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { useSWRConfig } from 'swr'
import { useEffect, useState } from 'react'
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
type FinancialAccountRow = { id: string; name: string; type: string; active: boolean; currentBalance?: number }
type ReturnEditData = { id: string; date: string; orderId: string; stockReturned: boolean; refundAmount: string | number; notes: string | null; refundAccount: string | null; items: Array<{ productId: string; qty: number }> }
type Line = { key: number; productId: string; qty: number }

export function NewReturnView() {
  const { t } = useApp()
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('editId')
  const initialOrderId = searchParams.get('orderId')
  const initialProductId = searchParams.get('productId')
  const { mutate: globalMutate } = useSWRConfig()
  const { data: business, error: businessError } = useSWR<{ id: string }>('/api/businesses/current', fetcher)
  const { data: orders, error: ordersError } = useSWR<OrderRow[]>(business?.id ? `/api/orders?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const { data: customers } = useSWR<CustomerRow[]>(business?.id ? `/api/customers?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const { data: payments } = useSWR<PaymentRow[]>(business?.id ? `/api/payments?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const { data: products } = useSWR<ProductRow[]>(business?.id ? `/api/products?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const { data: financialAccounts } = useSWR<FinancialAccountRow[]>(business?.id ? `/api/financial-accounts?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const { data: previousReturns } = useSWR<Array<{ id: string; orderId: string; items: Array<{ productId: string; qty: number }>; refundAmount: string | number }>>(business?.id ? `/api/returns?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const { data: editData, error: editError } = useSWR<ReturnEditData>(editId ? `/api/returns/${encodeURIComponent(editId)}` : null, fetcher)
  const [orderId, setOrderId] = useState('')
  const [returnMode, setReturnMode] = useState<'replacement' | 'refund'>('replacement')
  const [stockReturned, setStockReturned] = useState<'yes' | 'no'>('no')
  const refundCustomer = returnMode === 'refund' ? 'yes' : 'no'
  const [refundAmount, setRefundAmount] = useState('0')
  const [refundAccount, setRefundAccount] = useState('')
  const [returnDate, setReturnDate] = useState(TODAY)
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<Line[]>([{ key: 1, productId: '', qty: 1 }])
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (editId && editData) {
      setOrderId(editData.orderId)
      setReturnDate(editData.date)
      setStockReturned(editData.stockReturned ? 'yes' : 'no')
      setReturnMode(Number(editData.refundAmount) > 0 ? 'refund' : 'replacement')
      setRefundAmount(String(editData.refundAmount ?? 0))
      setRefundAccount(editData.refundAccount ?? '')
      setNotes(editData.notes ?? '')
      setLines(editData.items.map((item, index) => ({ key: index + 1, productId: item.productId, qty: Number(item.qty) })))
      return
    }
    if (!editId && initialOrderId && orders && previousReturns && !orderId) {
      const nextOrder = orders.find((row) => row.id === initialOrderId)
      if (!nextOrder) return
      setOrderId(nextOrder.id)
      const remainingQty = (productId: string) => Number(nextOrder.items.find((item) => item.productId === productId)?.qty ?? 0) - previousReturns.filter((row) => row.orderId === nextOrder.id).flatMap((row) => row.items ?? []).filter((item) => item.productId === productId).reduce((sum, item) => sum + Number(item.qty), 0)
      const first = initialProductId && remainingQty(initialProductId) > 0 ? initialProductId : nextOrder.items.find((item) => remainingQty(item.productId) > 0)?.productId
      setLines([{ key: Date.now(), productId: first ?? '', qty: 1 }])
    }
  }, [editId, editData, initialOrderId, initialProductId, orders, previousReturns, orderId])
  const order = orders?.find((row) => row.id === orderId)
  const customer = customers?.find((row) => row.id === order?.customerId)
  const productName = (id: string) => products?.find((row) => row.id === id)?.name ?? id
  const orderedLines = (order?.items ?? []).map((item) => ({ ...item, price: Number(item.price), discount: Number(item.discount ?? 0) }))
  const returnedQty = (productId: string) => (previousReturns ?? []).filter((row) => row.orderId === orderId && row.id !== editId).flatMap((row) => row.items ?? []).filter((item) => item.productId === productId).reduce((sum, item) => sum + Number(item.qty), 0)
  const eligibleLines = orderedLines.map((item) => ({ ...item, remaining: Math.max(0, Number(item.qty) - returnedQty(item.productId)) })).filter((item) => item.remaining > 0)
  const linePrice = (line: Line) => {
    const sold = orderedLines.find((item) => item.productId === line.productId)
    return sold ? Math.max(0, line.qty * sold.price - (sold.discount * line.qty / Number(sold.qty))) : 0
  }
  const total = lines.reduce((sum, line) => sum + linePrice(line), 0)
  const eligiblePaid = Math.max((payments ?? []).filter((payment) => payment.orderId === orderId).reduce((sum, payment) => sum + Number(payment.amount), 0) - (previousReturns ?? []).filter((row) => row.orderId === orderId && row.id !== editId).reduce((sum, row) => sum + Number(row.refundAmount), 0), 0)
  const maxRefund = Math.min(total, eligiblePaid)
  const activeFinancialAccounts = (financialAccounts ?? []).filter((account) => account.active)
  const selectedRefundAccount = refundAccount || activeFinancialAccounts.find((account) => account.name.toLowerCase() === 'cash')?.name || activeFinancialAccounts[0]?.name || ''
  const invalidLine = lines.some((line) => !line.productId || !Number.isInteger(line.qty) || line.qty < 1 || line.qty > (eligibleLines.find((item) => item.productId === line.productId)?.remaining ?? 0))
  if (businessError || ordersError || editError) return <p role="alert" className="text-sm text-destructive">{(businessError || ordersError || editError)?.message}</p>
  if (!business || !orders || !customers || !products || !previousReturns || !payments || (editId && !editData)) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>

  return <>
    <PageHeader
      breadcrumbs={[{ label: t('nav.sales') }, { label: t('nav.returns'), href: '/returns' }, { label: t('returns.recordTitle') }]}
      title={editId ? t('common.edit') : t('returns.recordTitle')}
      description={t('returns.recordDescription')}
      actions={<Button variant="outline" size="sm" nativeButton={false} render={<Link href={editId ? `/returns/${encodeURIComponent(editId)}` : '/returns'} />}><ArrowLeft /> {t('returns.backToList')}</Button>}
    />
    <form className="grid gap-4 lg:grid-cols-3" onSubmit={async (event) => {
      event.preventDefault()
      if (!business?.id || !orderId || invalidLine || !lines.length) { toast.error(t('returns.selectOrderError')); return }
      const refund = Number(refundAmount || 0)
      if (refundCustomer === 'yes' && (!Number.isFinite(refund) || refund < 0 || refund > maxRefund)) { toast.error(t('returns.refundValidation')); return }
      setSaving(true)
      try {
        const response = await fetch(editId ? `/api/returns/${encodeURIComponent(editId)}` : '/api/returns', { method: editId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          businessId: business.id, orderId, date: returnDate, stockReturned: stockReturned === 'yes',
          refundCustomer: refundCustomer === 'yes', refundAmount: refundCustomer === 'yes' ? refund : 0,
          refundAccount: refundCustomer === 'yes' && refund > 0 ? selectedRefundAccount : null, notes,
          items: lines.map(({ productId, qty }) => ({ productId, qty })),
        }) })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error ?? t('returns.saveFailed'))
        await Promise.all([
          globalMutate(`/api/returns?businessId=${encodeURIComponent(business.id)}`),
          globalMutate(editId ? `/api/returns/${encodeURIComponent(editId)}` : null),
          globalMutate(`/api/replacements?businessId=${encodeURIComponent(business.id)}`),
          globalMutate(`/api/orders?businessId=${encodeURIComponent(business.id)}`),
          globalMutate(`/api/products?businessId=${encodeURIComponent(business.id)}`),
          globalMutate(`/api/stock?businessId=${encodeURIComponent(business.id)}`),
          globalMutate(`/api/accounting?businessId=${encodeURIComponent(business.id)}`),
          globalMutate(`/api/financial-accounts?businessId=${encodeURIComponent(business.id)}`),
          globalMutate(`/api/dashboard?businessId=${encodeURIComponent(business.id)}`),
        ])
        toast.success(editId ? t('returns.updated') : t('returns.saved'))
        router.push(editId ? `/returns/${encodeURIComponent(editId)}` : '/returns')
      } catch (error) { toast.error(error instanceof Error ? error.message : t('returns.saveFailed')) } finally { setSaving(false) }
    }}>
      <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
        <SectionCard title={t('returns.information')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5"><Label htmlFor="return-customer">{t('common.customer')}</Label><div className="flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm">{customer?.name ?? t('returns.selectOrderFirst')}</div></div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="return-order">{t('returns.linkedOrder')}</Label><select id="return-order" className={selectClass} value={orderId} disabled={!!editId} onChange={(event) => { setOrderId(event.target.value); const next = orders.find((row) => row.id === event.target.value); const first = (next?.items ?? []).find((item) => Number(item.qty) - (previousReturns ?? []).filter((row) => row.orderId === (next?.id ?? '')).flatMap((row) => row.items ?? []).filter((returnedItem) => returnedItem.productId === item.productId).reduce((sum, item) => sum + Number(item.qty), 0) > 0); setLines([{ key: Date.now(), productId: first?.productId ?? '', qty: 1 }]); setRefundAmount('0') }} required><option value="">{t('returns.selectOrder')}</option>{orders.filter((row) => row.status !== 'cancelled').map((row) => <option key={row.id} value={row.id}>{row.id} — {customers.find((c) => c.id === row.customerId)?.name ?? row.customerId}</option>)}</select></div>
            <div className="flex flex-col gap-1.5"><Label>{t('returns.orderDate')}</Label><div className="flex h-10 items-center rounded-md border bg-muted/30 px-3 font-mono text-sm">{order?.date ?? '—'}</div></div>
          </div>
          <div className="mt-4 border-t pt-4">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">{t('returns.mode')}</legend>
              <label className={`flex cursor-pointer flex-col gap-1 rounded-md border px-3 py-3 text-sm ${returnMode === 'replacement' ? 'border-primary bg-primary/5' : ''}`}>
                <span className="flex items-center gap-2"><input type="radio" name="returnMode" value="replacement" checked={returnMode === 'replacement'} onChange={() => { setReturnMode('replacement'); setRefundAmount('0') }} />{t('returns.replacementMode')}</span>
                <span className="pl-6 text-xs text-muted-foreground">{t('returns.replacementModeHint')}</span>
              </label>
              <label className={`flex cursor-pointer flex-col gap-1 rounded-md border px-3 py-3 text-sm ${returnMode === 'refund' ? 'border-primary bg-primary/5' : ''}`}>
                <span className="flex items-center gap-2"><input type="radio" name="returnMode" value="refund" checked={returnMode === 'refund'} onChange={() => { setReturnMode('refund'); setRefundAmount(String(maxRefund)) }} />{t('returns.refundMode')}</span>
                <span className="pl-6 text-xs text-muted-foreground">{t('returns.refundModeHint')}</span>
              </label>
            </fieldset>
          </div>
          <div className="mt-4 border-t pt-4">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">{t('returns.restockPrompt')}</legend>
              <label className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-3 text-sm ${stockReturned === 'yes' ? 'border-primary bg-primary/5' : ''}`}>
                <input type="radio" name="stockReturned" value="yes" checked={stockReturned === 'yes'} onChange={() => setStockReturned('yes')} />
                {t('returns.restockYes')}
              </label>
              <label className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-3 text-sm ${stockReturned === 'no' ? 'border-primary bg-primary/5' : ''}`}>
                <input type="radio" name="stockReturned" value="no" checked={stockReturned === 'no'} onChange={() => setStockReturned('no')} />
                {t('returns.restockNo')}
              </label>
            </fieldset>
          </div>
        </SectionCard>
        <SectionCard title={t('returns.itemsSection')}>
          <ul className="flex flex-col gap-3">{lines.map((line) => {
            const sold = orderedLines.find((item) => item.productId === line.productId)
            const remaining = eligibleLines.find((item) => item.productId === line.productId)?.remaining ?? 0
            const subtotal = linePrice(line)
            return <li key={line.key} className="rounded-lg border p-3"><div className="grid grid-cols-2 gap-3 sm:grid-cols-12">
              <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-4"><Label>{t('common.product')}</Label><select className={selectClass} value={line.productId} onChange={(event) => setLines((prev) => prev.map((item) => item.key === line.key ? {...item, productId:event.target.value,qty:1} : item))} required><option value="">Select product</option>{eligibleLines.map((item) => <option key={item.productId} value={item.productId}>{productName(item.productId)} ({t('returns.remaining')} {item.remaining})</option>)}</select></div>
              <div className="flex flex-col gap-1.5 sm:col-span-2"><Label>{t('returns.qtyReturned')}</Label><Input type="number" min={1} max={remaining || 1} value={line.qty} onChange={(event) => setLines((prev) => prev.map((item) => item.key===line.key?{...item,qty:Number(event.target.value)}:item))} required /></div>
              <div className="flex flex-col gap-1.5 sm:col-span-2"><Label>{t('returns.priceRp')}</Label><div className="flex h-10 items-center rounded-md border bg-muted/30 px-3 font-mono text-sm">{sold ? formatIDR(Number(sold.price)) : '—'}</div></div>
              <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-3"><Label>{t('returns.subtotal')}</Label><div className="flex h-10 items-center truncate font-mono text-sm font-semibold text-destructive" title={formatIDR(subtotal)}>−{formatIDR(subtotal)}</div></div>
              <div className="flex flex-col gap-1.5 sm:col-span-1"><Label className="invisible">{t('returns.removeItem')}</Label><div className="flex h-10 items-center justify-center"><Button type="button" variant="ghost" size="icon-sm" aria-label={t('returns.removeItem')} disabled={lines.length===1} onClick={() => setLines((prev) => prev.filter((item) => item.key!==line.key))}><Trash2 /></Button></div></div>
            </div></li>
          })}</ul>
          <div className="mt-4"><Button type="button" variant="outline" size="sm" disabled={!order || eligibleLines.length < 2 || lines.length >= eligibleLines.length || eligibleLines.every((item) => lines.some((line) => line.productId === item.productId))} onClick={() => {const available=eligibleLines.find((item)=>!lines.some((line)=>line.productId===item.productId));if(available)setLines((prev)=>[...prev,{key:Date.now(),productId:available.productId,qty:1}])}}><Plus /> {t('returns.addItem')}</Button></div>
          {!order && <p className="mt-2 text-xs text-muted-foreground">{t('returns.chooseProductHelp')}</p>}
        </SectionCard>
        <SectionCard title={t('common.notes')}><Textarea rows={3} value={notes} onChange={(event)=>setNotes(event.target.value)} placeholder={t('returns.notesPlaceholder')} /></SectionCard>
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <SectionCard title={t('returns.summary')} className="lg:sticky lg:top-20">
          <dl className="flex flex-col gap-3 text-sm"><div className="flex justify-between"><dt className="text-muted-foreground">{t('returns.returnTotal')}</dt><dd className="font-mono text-lg font-semibold tabular-nums">{formatIDR(total)}</dd></div></dl>
          {refundCustomer==='yes' && <div className="mt-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5"><Label htmlFor="refund-amount">{t('returns.totalRefund')} (Rp)</Label><Input id="refund-amount" type="number" min={1} max={maxRefund} value={refundAmount} onChange={(event)=>setRefundAmount(event.target.value)} required /><p className="text-xs text-muted-foreground">{t('returns.maximumRefund', { amount: formatIDR(maxRefund) })}</p>{maxRefund <= 0 && <p className="text-xs text-destructive">{t('returns.noRefundableBalance')}</p>}</div>
            {Number(refundAmount) > 0 && <div className="flex flex-col gap-1.5"><Label htmlFor="refund-account">{t('returns.refundAccount')}</Label><select id="refund-account" className={selectClass} value={selectedRefundAccount} onChange={(event)=>setRefundAccount(event.target.value)} required><option value="">{t('returns.selectCashBank')}</option>{activeFinancialAccounts.map((account)=><option key={account.id} value={account.name}>{account.name}</option>)}</select>{activeFinancialAccounts.length===0 && <p className="text-xs text-destructive">{t('returns.createAccountHint')}</p>}</div>}
          </div>}
          <div className="mt-4 flex flex-col gap-1.5"><Label htmlFor="return-date">{t('common.date')}</Label><Input id="return-date" type="date" value={returnDate} onChange={(event)=>setReturnDate(event.target.value)} required /></div>
          <div className="mt-5 flex gap-2 border-t pt-4"><Button type="button" variant="outline" className="flex-1" nativeButton={false} render={<Link href="/returns" />}>{t('common.cancel')}</Button><Button type="submit" className="flex-1" disabled={saving||!orderId||invalidLine||!lines.length||(refundCustomer==='yes'&&(Number(refundAmount)<=0||Number(refundAmount)>maxRefund||!selectedRefundAccount))}>{saving?t('returns.saving'):t('returns.save')}</Button></div>
        </SectionCard>
      </div>
    </form>
  </>
}
