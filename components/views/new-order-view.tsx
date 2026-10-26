'use client'

import Link from 'next/link'
import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSWRConfig } from 'swr'
import useSWR from 'swr'
import { appToast as toast } from '@/lib/toast'
import { SearchableSelect } from '@/components/common/searchable-select'
import { PageHeader } from '@/components/common/page-header'
import { SectionCard } from '@/components/common/section-card'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
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
}

export function NewOrderView() {
  const { t } = useApp()
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

  useEffect(() => {
    if (lines.length === 0 && productRows?.[0]) setLines([{ key: 1, productId: productRows[0].id, qty: 1, price: Number(productRows[0].sellingPrice), discount: 0 }])
  }, [lines.length, productRows])

  const update = (key: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  const total = lines.reduce((s, l) => s + l.qty * l.price - l.discount, 0)
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
          if (lines.some((line) => !Number.isInteger(line.qty) || line.qty < 1 || line.qty > MAX_ORDER_QTY || !Number.isFinite(line.price) || line.price < 0)) {
            toast.error('Quantity must be between 1 and 999,999 and price must be valid.')
            return
          }
          setIsSaving(true)
          try {
            const form = new FormData(event.currentTarget)
            const business = await fetch('/api/businesses/current').then((response) => response.ok ? response.json() : Promise.reject(new Error('Business access required')))
            const response = await fetch('/api/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
              id: `ORD-${Date.now()}`, businessId: business.id, date: form.get('orderDate'), customerId: form.get('customerId'), status: 'requested', dueDate: form.get('dueDate') || null, notes: form.get('notes') || null, paidAmount: Number(paid || 0), paymentAccount: selectedPaymentAccount, paymentDate: form.get('orderDate'), paymentId: Number(paid || 0) > 0 ? `PAY-ORD-${Date.now()}` : undefined,
              items: lines.map((line) => ({ id: `OI-${Date.now()}-${line.key}`, productId: line.productId, qty: line.qty, price: line.price, discount: line.discount, unitCost: productsById.get(line.productId)?.averageCost ?? 0 })),
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
                <Input id="date" name="orderDate" type="date" defaultValue={TODAY} required />
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
                      <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-4">
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
                        <Label>Subtotal</Label>
                        <div className="flex h-10 min-w-0 items-center">
                          <span title={formatIDR(l.qty * l.price - l.discount)} className="truncate font-mono text-sm font-semibold tabular-nums">{formatIDR(l.qty * l.price - l.discount)}</span>
                        </div>
                      </div>
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
                onClick={() => setLines((prev) => [...prev, { key: Date.now(), productId: productRows[0]?.id ?? '', qty: 1, price: Number(productRows[0]?.sellingPrice ?? 0), discount: 0 }])}
              >
                <Plus />
                {t('common.add')}
              </Button>
            </div>
          </SectionCard>

          <SectionCard title={t('common.notes')}>
            <Textarea name="notes" rows={3} placeholder="…" />
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
                <Input id="due" name="dueDate" type="date" />
              </div>}
              {Number(paid || 0) > 0 && <div className="flex flex-col gap-1.5">
                <Label htmlFor="sale-payment-account">{t('common.paymentAccount')}</Label>
                <SearchableSelect id="sale-payment-account" value={selectedPaymentAccount} onChange={(value) => setPaymentAccount(String(value))} options={activeFinancialAccounts.map((account) => ({ value: account.name, label: account.name, description: account.type === 'cash' ? t('accounts.cash') : t('accounts.bank') }))} placeholder={t('returns.selectCashBank')} searchPlaceholder={t('common.search')} emptyText={t('common.noResults')} required />
                {activeFinancialAccounts.length === 0 && <p className="text-xs text-destructive">{t('returns.createAccountHint')}</p>}
              </div>}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('common.outstanding')}</span>
                <span className="font-mono font-semibold tabular-nums text-warning">{formatIDR(Math.max(total - Number(paid || 0), 0))}</span>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <Button type="button" variant="outline" className="flex-1" nativeButton={false} render={<Link href="/orders" />}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" className="flex-1" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save Order'}</Button>
            </div>
          </SectionCard>
        </div>
      </form>
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
