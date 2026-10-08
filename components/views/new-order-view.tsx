'use client'

import Link from 'next/link'
import { AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { appToast as toast } from '@/lib/toast'
import { selectClass } from '@/components/common/form-dialog'
import { PageHeader } from '@/components/common/page-header'
import { SectionCard } from '@/components/common/section-card'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { useApp } from '@/components/providers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { customers, productById, products, TODAY } from '@/lib/data'
import { formatIDR } from '@/lib/format'

interface Line {
  key: number
  productId: string
  qty: number
  price: number
  discount: number
}

export function NewOrderView() {
  const { t } = useApp()
  const [lines, setLines] = useState<Line[]>([{ key: 1, productId: 'P-0001', qty: 100, price: 16000, discount: 0 }])
  const [paid, setPaid] = useState(0)
  const [previewed, setPreviewed] = useState(false)
  const [lineToRemove, setLineToRemove] = useState<number | null>(null)

  const update = (key: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  const total = lines.reduce((s, l) => s + l.qty * l.price - l.discount, 0)
  const cogs = lines.reduce((s, l) => s + l.qty * (productById(l.productId)?.averageCost ?? 0), 0)

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: t('nav.sales') }, { label: t('nav.orders'), href: '/orders' }, { label: t('orders.add') }]}
        title={t('orders.add')}
        description={t('common.prototypeNote')}
      />
      <form
        onSubmit={(event) => {
          event.preventDefault()
          setPreviewed(true)
          toast.info(t('form.previewFeedback'))
        }}
        className="grid gap-4 lg:grid-cols-3"
      >
        <div className="flex flex-col gap-4 lg:col-span-2">
          <SectionCard title={t('orders.info')}>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="customer">{t('common.customer')}</Label>
                <select id="customer" name="customerId" className={selectClass} defaultValue="C-0001" required>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="date">{t('orders.orderDate')}</Label>
                <Input id="date" name="orderDate" type="date" defaultValue={TODAY} required />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title={t('orders.orderItems')}
            action={
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setLines((prev) => [...prev, { key: Date.now(), productId: 'P-0002', qty: 1, price: 118000, discount: 0 }])}
              >
                <Plus />
                {t('common.add')}
              </Button>
            }
          >
            <ul className="flex flex-col gap-4">
              {lines.map((l) => {
                const p = productById(l.productId)
                const after = (p?.stock ?? 0) - l.qty
                return (
                  <li key={l.key} className="rounded-lg border p-3">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-12">
                      <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-5">
                        <Label htmlFor={`p-${l.key}`}>{t('common.product')}</Label>
                        <select
                          id={`p-${l.key}`}
                          name={`product-${l.key}`}
                          className={selectClass}
                          required
                          value={l.productId}
                          onChange={(e) => update(l.key, { productId: e.target.value, price: productById(e.target.value)?.sellingPrice ?? 0 })}
                        >
                          {products.map((pr) => (
                            <option key={pr.id} value={pr.id}>
                              {pr.name} ({pr.stock})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <Label htmlFor={`q-${l.key}`}>{t('common.qty')}</Label>
                        <Input id={`q-${l.key}`} name={`quantity-${l.key}`} type="number" min={1} required className="font-mono" value={l.qty} onChange={(e) => update(l.key, { qty: Number(e.target.value) })} />
                      </div>
                      <div className="flex flex-col gap-1.5 sm:col-span-3">
                        <Label htmlFor={`pr-${l.key}`}>{t('orders.sellingPrice')}</Label>
                        <Input id={`pr-${l.key}`} name={`price-${l.key}`} type="number" min={0} required className="font-mono" value={l.price} onChange={(e) => update(l.key, { price: Number(e.target.value) })} />
                      </div>
                      <div className="flex items-end justify-end sm:col-span-2">
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
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                      {after < 0 ? (
                        <span className="flex items-center gap-1.5 text-destructive">
                          <AlertTriangle className="size-3.5" />
                          {t('orders.negativeWarning', { product: p?.name ?? '', stock: after })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {t('stock.current')}: <span className="font-mono">{p?.stock}</span> → <span className="font-mono">{after}</span>
                        </span>
                      )}
                      <span className="font-mono font-medium tabular-nums">{formatIDR(l.qty * l.price - l.discount)}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </SectionCard>

          <SectionCard title={t('common.notes')}>
            <Textarea rows={3} placeholder="…" />
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
                <Input id="paid" name="paidAmount" type="number" min={0} max={Math.max(total, 0)} className="font-mono" value={paid} onChange={(e) => setPaid(Number(e.target.value))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="due">{t('common.dueDate')}</Label>
                <Input id="due" type="date" />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('common.outstanding')}</span>
                <span className="font-mono font-semibold tabular-nums text-warning">{formatIDR(Math.max(total - paid, 0))}</span>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <Button type="button" variant="outline" className="flex-1" render={<Link href="/orders" />}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" className="flex-1">{t('form.validateAction')}</Button>
            </div>
            {previewed && <p role="status" aria-live="polite" className="mt-3 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs leading-5 text-muted-foreground">{t('form.previewFeedback')}</p>}
          </SectionCard>
        </div>
      </form>
      <ConfirmDialog
        open={lineToRemove !== null}
        onOpenChange={(open) => {
          if (!open) setLineToRemove(null)
        }}
        title={t('orders.removeLineTitle')}
        description={t('orders.removeLineDescription')}
        confirmLabel={t('orders.removeLineAction')}
        previewOnly
        onConfirm={() => {
          if (lineToRemove === null) return
          setLines((previous) => previous.filter((line) => line.key !== lineToRemove))
          setPreviewed(false)
          toast.info(t('form.previewFeedback'))
        }}
      />
    </>
  )
}
