'use client'

import { Check, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSWRConfig } from 'swr'
import useSWR from 'swr'
import { appToast as toast } from '@/lib/toast'
import { SearchableSelect } from '@/components/common/searchable-select'
import { PageHeader } from '@/components/common/page-header'
import { SectionCard } from '@/components/common/section-card'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useApp } from '@/components/providers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TODAY } from '@/lib/data'
import { formatIDR } from '@/lib/format'

const fetcher = (url: string) => fetch(url).then(async (response) => {
  if (!response.ok) throw new Error((await response.json()).error ?? 'Unable to load order data')
  return response.json()
})
type Party = { id: string; name: string }
type Product = { id: string; name: string; sellingPrice: string | number; averageCost: string | number; stock?: string | number }
type StockRow = { productId: string; stock: number | string }
type FinancialAccountRow = { id: string; name: string; type: 'cash' | 'bank'; active: boolean }
const MAX_ORDER_QTY = 999999

interface Line {
  key: number
  productId: string
  qty: number
  price: number
  discount: number
  discountType: 'amount' | 'percent'
}

type OrderDraft = {
  customerId: string
  orderDate: string
  dueDate: string
  notes: string
  lines: Line[]
  paid: string
  paymentAccount: string
}

export function NewOrderView() {
  const { locale, t } = useApp()
  const router = useRouter()
  const { mutate: globalMutate } = useSWRConfig()
  const { data: business, error: businessError } = useSWR<{ id: string }>('/api/businesses/current', fetcher)
  const { data: customerRows, error: customersError } = useSWR<Party[]>(business?.id ? `/api/customers?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const { data: productRows, error: productsError } = useSWR<Product[]>(business?.id ? `/api/products?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const { data: stockRows } = useSWR<StockRow[]>(business?.id ? `/api/stock?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const { data: financialAccounts } = useSWR<FinancialAccountRow[]>(business?.id ? `/api/financial-accounts?businessId=${encodeURIComponent(business.id)}` : null, fetcher)
  const error = businessError || customersError || productsError
  const productsById = new Map((productRows ?? []).map((product) => [product.id, { ...product, sellingPrice: Number(product.sellingPrice), averageCost: Number(product.averageCost), stock: Number(stockRows?.find((row) => row.productId === product.id)?.stock ?? product.stock ?? 0) }]))
  const [lines, setLines] = useState<Line[]>([])
  const [customerId, setCustomerId] = useState('')
  const [paid, setPaid] = useState('0')
  const [paymentAccount, setPaymentAccount] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [lineToRemove, setLineToRemove] = useState<number | null>(null)
  const [orderDate, setOrderDate] = useState(TODAY)
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [draftReady, setDraftReady] = useState(false)
  const [draftExists, setDraftExists] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const draftKey = business?.id ? `cuanapp:order-draft:${business.id}` : null

  useEffect(() => {
    if (!draftKey) return
    try {
      const raw = sessionStorage.getItem(draftKey)
      if (raw) {
        const draft = JSON.parse(raw) as OrderDraft
        setCustomerId(draft.customerId ?? '')
        setOrderDate(draft.orderDate || TODAY)
        setDueDate(draft.dueDate ?? '')
        setNotes(draft.notes ?? '')
        setLines(Array.isArray(draft.lines) ? draft.lines : [])
        setPaid(draft.paid ?? '0')
        setPaymentAccount(draft.paymentAccount ?? '')
        setDraftExists(true)
        setLastSaved(new Date())
      }
    } catch {
      sessionStorage.removeItem(draftKey)
    } finally {
      setDraftReady(true)
    }
  }, [draftKey])

  useEffect(() => {
    if (!draftReady || lines.length > 0 || !productRows?.[0]) return
    setLines([{ key: 1, productId: productRows[0].id, qty: 1, price: Number(productRows[0].sellingPrice), discount: 0, discountType: 'amount' }])
  }, [draftReady, lines.length, productRows])

  useEffect(() => {
    if (!draftReady || !draftKey) return
    const draft: OrderDraft = { customerId, orderDate, dueDate, notes, lines, paid, paymentAccount }
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(draft))
      setDraftExists(Boolean(customerId || notes || dueDate || lines.length || Number(paid) > 0 || paymentAccount))
      setLastSaved(new Date())
    } catch {
      toast.error(locale === 'id' ? 'Draft tidak dapat disimpan di browser ini.' : 'Unable to save draft in this browser.')
    }
  }, [draftReady, draftKey, customerId, orderDate, dueDate, notes, lines, paid, paymentAccount, locale])

  useEffect(() => {
    const interceptInternalNavigation = (event: MouseEvent) => {
      if (!draftExists || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest('a[href]') as HTMLAnchorElement | null
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return
      let destination: URL
      try { destination = new URL(anchor.href) } catch { return }
      if (destination.origin !== window.location.origin) return
      const nextPath = destination.pathname + destination.search + destination.hash
      if (destination.pathname === window.location.pathname) return
      event.preventDefault()
      event.stopPropagation()
      setPendingNavigation(nextPath)
      setLeaveOpen(true)
    }
    document.addEventListener('click', interceptInternalNavigation, true)
    return () => document.removeEventListener('click', interceptInternalNavigation, true)
  }, [draftExists])

  const saveDraftNow = () => {
    if (!draftKey) return
    sessionStorage.setItem(draftKey, JSON.stringify({ customerId, orderDate, dueDate, notes, lines, paid, paymentAccount } satisfies OrderDraft))
    setDraftExists(true)
    setLastSaved(new Date())
    toast.success(locale === 'id' ? 'Draft order berhasil disimpan.' : 'Order draft saved.')
  }

  const discardDraft = () => {
    if (draftKey) sessionStorage.removeItem(draftKey)
    setCustomerId('')
    setOrderDate(TODAY)
    setDueDate('')
    setNotes('')
    setLines(productRows?.[0] ? [{ key: 1, productId: productRows[0].id, qty: 1, price: Number(productRows[0].sellingPrice), discount: 0, discountType: 'amount' }] : [])
    setPaid('0')
    setPaymentAccount('')
    setDraftExists(false)
    setLastSaved(null)
    toast.success(locale === 'id' ? 'Draft order dibuang.' : 'Order draft discarded.')
  }

  const update = (key: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  const lineDiscount = (line: Line) => line.discountType === 'percent' ? line.qty * line.price * line.discount / 100 : line.discount
  const total = lines.reduce((s, l) => s + l.qty * l.price - lineDiscount(l), 0)
  const stockAfterOrder = (productId: string) => {
    const product = productsById.get(productId)
    const quantity = lines.filter((line) => line.productId === productId).reduce((sum, line) => sum + line.qty, 0)
    return { current: product?.stock ?? 0, after: (product?.stock ?? 0) - quantity, quantity }
  }
  const cogs = lines.reduce((s, l) => s + l.qty * (productsById.get(l.productId)?.averageCost ?? 0), 0)
  const activeFinancialAccounts = (financialAccounts ?? []).filter((account) => account.active)
  const selectedPaymentAccount = paymentAccount || activeFinancialAccounts.find((account) => account.name.toLowerCase() === 'cash')?.name || activeFinancialAccounts[0]?.name || ''
  if (error) return <p role="alert" className="text-sm text-destructive">{error.message}</p>
  if (!business || !customerRows || !productRows) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: t('nav.sales') }, { label: t('nav.orders'), href: '/orders' }, { label: t('orders.add') }]}
        title={t('orders.add')}
        description="Enter the order details, then save to create the order and record any initial payment."
      />
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          if (isSaving) return
          if (Number(paid || 0) > 0 && !selectedPaymentAccount) { toast.error(t('returns.createAccountHint')); return }
          if (lines.some((line) => !Number.isInteger(line.qty) || line.qty < 1 || line.qty > MAX_ORDER_QTY || !Number.isFinite(line.price) || line.price < 0 || !Number.isFinite(line.discount) || line.discount < 0 || (line.discountType === 'percent' ? line.discount > 100 : line.discount > line.qty * line.price))) {
            toast.error('Quantity must be between 1 and 999,999 and price must be valid.')
            return
          }
          setIsSaving(true)
          try {
            const business = await fetch('/api/businesses/current').then((response) => response.ok ? response.json() : Promise.reject(new Error('Business access required')))
            const response = await fetch('/api/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
              id: `ORD-${Date.now()}`, businessId: business.id, date: orderDate, customerId, status: 'requested', dueDate: dueDate || null, notes: notes || null, paidAmount: Number(paid || 0), paymentAccount: selectedPaymentAccount, paymentDate: orderDate, paymentId: Number(paid || 0) > 0 ? `PAY-ORD-${Date.now()}` : undefined,
              items: lines.map((line) => ({ id: `OI-${Date.now()}-${line.key}`, productId: line.productId, qty: line.qty, price: line.price, discount: line.discount, discountType: line.discountType, unitCost: productsById.get(line.productId)?.averageCost ?? 0 })),
            }) })
            const result = await response.json()
            if (!response.ok) throw new Error(result.error ?? 'Unable to save order')
            await Promise.all([
              globalMutate(`/api/orders?businessId=${encodeURIComponent(business.id)}`),
              globalMutate(`/api/payments?businessId=${encodeURIComponent(business.id)}`),
              globalMutate(`/api/products?businessId=${encodeURIComponent(business.id)}`),
              globalMutate(`/api/stock?businessId=${encodeURIComponent(business.id)}`),
              globalMutate(`/api/accounting?businessId=${encodeURIComponent(business.id)}`),
              globalMutate(`/api/dashboard?businessId=${encodeURIComponent(business.id)}`),
            ])
            if (draftKey) sessionStorage.removeItem(draftKey)
            setDraftExists(false)
            toast.success(t('form.savedFeedback'))
            router.push(`/orders/${encodeURIComponent(result.id)}`)
          } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save order') } finally { setIsSaving(false) }
        }}
        className="grid gap-4 lg:grid-cols-3"
      >
        <div className="flex flex-col gap-4 lg:col-span-2">
          <SectionCard title={t('orders.info')}>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="customer">{t('common.customer')}</Label>
                <SearchableSelect id="customer" name="customerId" value={customerId} onChange={(value) => setCustomerId(String(value))} options={customerRows.map((customer) => ({ value: customer.id, label: customer.name }))} placeholder={t('common.select')} searchPlaceholder={t('common.search')} emptyText={t('common.noResults')} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="date">{t('orders.orderDate')}</Label>
                <Input id="date" name="orderDate" type="date" value={orderDate} onChange={(event) => setOrderDate(event.target.value)} required />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title={t('orders.orderItems')}
          >
            <ul className="flex flex-col gap-4">
              {lines.map((l) => {
                const p = productsById.get(l.productId)
                const stock = stockAfterOrder(l.productId)
                return (
                  <li key={l.key} className="rounded-lg border p-3">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-12">
                      <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-3">
                        <Label htmlFor={`p-${l.key}`}>{t('common.product')}</Label>
                        <SearchableSelect id={`p-${l.key}`} name={`product-${l.key}`} value={l.productId} onChange={(value) => update(l.key, { productId: String(value), price: productsById.get(String(value))?.sellingPrice ?? 0 })} options={productRows.map((product) => ({ value: product.id, label: product.name, description: `${t('inventory.stock')}: ${productsById.get(product.id)?.stock ?? 0}` }))} placeholder={t('common.select')} searchPlaceholder={t('common.search')} emptyText={t('common.noResults')} required />
                      </div>
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <Label htmlFor={`q-${l.key}`}>{t('common.qty')}</Label>
                        <Input id={`q-${l.key}`} name={`quantity-${l.key}`} type="number" min={1} max={MAX_ORDER_QTY} required className="font-mono" value={l.qty} onChange={(e) => update(l.key, { qty: Number(e.target.value) })} />
                      </div>
                      <div className="flex flex-col gap-1.5 sm:col-span-3">
                        <Label htmlFor={`pr-${l.key}`}>{t('orders.sellingPrice')}</Label>
                        <Input id={`pr-${l.key}`} name={`price-${l.key}`} type="number" min={0} required className="font-mono" value={l.price} onChange={(e) => update(l.key, { price: Number(e.target.value) })} />
                      </div>
                      <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
                        <Label>{t('orders.discount')}</Label>
                        <div className="flex gap-1"><select aria-label="Discount type" className="h-10 w-[76px] rounded-md border bg-background px-2 text-sm" value={l.discountType} onChange={(e) => update(l.key, { discountType: e.target.value as 'amount' | 'percent', discount: 0 })}><option value="amount">Rp</option><option value="percent">%</option></select><Input aria-label="Discount value" type="number" min={0} max={l.discountType === 'percent' ? 100 : l.qty * l.price} step="any" value={l.discount} onChange={(e) => update(l.key, { discount: Number(e.target.value) })} /></div>
                      </div>
                      <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-3"><Label>{t('orders.subtotal')}</Label><div className="flex h-10 min-w-0 items-center"><span title={formatIDR(l.qty * l.price - lineDiscount(l))} className="truncate font-mono text-sm font-semibold tabular-nums">{formatIDR(l.qty * l.price - lineDiscount(l))}</span></div></div>
                      <div className="flex flex-col gap-1.5 sm:col-span-1">
                        <Label className="invisible">Remove</Label>
                        <div className="flex h-10 items-center justify-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t('common.delete')}
                            disabled={lines.length === 1}
                            onClick={() => setLineToRemove(l.key)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>Stock after order: <span className="font-mono">{stock.current.toLocaleString('id-ID')} → {stock.after.toLocaleString('id-ID')}</span></span>
                      <span>{p?.name} ({stock.quantity > 0 ? '−' : ''}{stock.quantity.toLocaleString('id-ID')})</span>
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="mt-4">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setLines((prev) => [...prev, { key: Date.now(), productId: productRows[0]?.id ?? '', qty: 1, price: Number(productRows[0]?.sellingPrice ?? 0), discount: 0, discountType: 'amount' }])}
              >
                <Plus />
                {t('common.add')}
              </Button>
            </div>
          </SectionCard>

          <SectionCard title={t('common.notes')}>
            <Textarea name="notes" rows={3} placeholder="…" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </SectionCard>
        </div>

        <div className="flex flex-col gap-4">
          <SectionCard title={t('orders.paymentSummary')} className="lg:sticky lg:top-20">
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t('common.total')}</dt>
                <dd className="font-mono text-lg font-semibold tabular-nums">{formatIDR(total)}</dd>
              </div>
              <div className="flex justify-between text-xs">
                <dt className="text-muted-foreground">{t('orders.cogs')}</dt>
                <dd className="font-mono tabular-nums text-muted-foreground">{formatIDR(cogs)}</dd>
              </div>
              <div className="flex justify-between text-xs">
                <dt className="text-muted-foreground">{t('orders.profit')}</dt>
                <dd className={`font-mono tabular-nums ${total - cogs >= 0 ? 'text-success' : 'text-destructive'}`}>{formatIDR(total - cogs)}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-col gap-3 border-t pt-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="paid">{t('common.paid')}</Label>
                <Input id="paid" name="paidAmount" type="number" min={0} max={Math.max(total, 0)} className="font-mono" value={paid} onChange={(e) => setPaid(e.target.value)} />
              </div>
              {total > 0 && Number(paid || 0) < total && <div className="flex flex-col gap-1.5">
                <Label htmlFor="due">{t('common.dueDate')}</Label>
                <Input id="due" name="dueDate" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              </div>}
              {Number(paid || 0) > 0 && <div className="flex flex-col gap-1.5">
                <Label htmlFor="sale-payment-account">{(locale === 'id' ? 'Terima pembayaran ke akun kas/bank' : 'Receive payment into cash/bank account')}</Label>
                <SearchableSelect id="sale-payment-account" value={selectedPaymentAccount} onChange={(value) => setPaymentAccount(String(value))} options={activeFinancialAccounts.map((account) => ({ value: account.name, label: account.name, description: account.type === 'cash' ? t('fin.cash') : t('fin.bank') }))} placeholder={t('returns.selectCashBank')} searchPlaceholder={t('common.search')} emptyText={t('common.noResults')} required />
                {activeFinancialAccounts.length === 0 && <p className="text-xs text-destructive">{t('returns.createAccountHint')}</p>}
              </div>}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('common.outstanding')}</span>
                <span className="font-mono font-semibold tabular-nums text-warning">{formatIDR(Math.max(total - Number(paid || 0), 0))}</span>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-success" />{draftExists ? (locale === 'id' ? 'Draft tersimpan otomatis' : 'Draft saved automatically') : (locale === 'id' ? 'Draft siap disimpan' : 'Draft ready to save')}</span>
                {lastSaved && <span>{locale === 'id' ? 'Tersimpan' : 'Saved'} {lastSaved.toLocaleTimeString(locale === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => { setPendingNavigation('/orders'); setLeaveOpen(true) }}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" className="flex-1" disabled={isSaving || (Number(paid || 0) > 0 && !selectedPaymentAccount)}>{isSaving ? 'Saving…' : (locale === 'id' ? 'Simpan Order' : 'Save Order')}</Button>
              </div>
            </div>
          </SectionCard>
        </div>
      </form>
      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{locale === 'id' ? 'Simpan pekerjaan Order?' : 'Save your Order progress?'}</DialogTitle>
            <DialogDescription>{locale === 'id' ? 'Kamu sedang meninggalkan halaman Order. Pilih untuk menyimpan draft sementara atau membuangnya.' : 'You are leaving the Order page. Choose whether to save this progress as a draft or discard it.'}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse sm:flex-row">
            <Button type="button" variant="outline" onClick={() => { discardDraft(); router.push(pendingNavigation ?? '/orders'); setPendingNavigation(null) }}><Trash2 />{locale === 'id' ? 'Buang Draft' : 'Discard Draft'}</Button>
            <Button type="button" onClick={() => { saveDraftNow(); setLeaveOpen(false); router.push(pendingNavigation ?? '/orders'); setPendingNavigation(null) }}><Save />{locale === 'id' ? 'Simpan Draft' : 'Save Draft'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={lineToRemove !== null}
        onOpenChange={(open) => {
          if (!open) setLineToRemove(null)
        }}
        title={t('orders.removeLineTitle')}
        description="Remove this item from the order before saving?"
        confirmLabel={t('common.delete')}
        onConfirm={() => {
          if (lineToRemove === null) return
          setLines((previous) => previous.filter((line) => line.key !== lineToRemove))
          toast.success('Item removed')
        }}
      />
    </>
  )
}
