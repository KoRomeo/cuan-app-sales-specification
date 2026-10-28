'use client'

import Link from 'next/link'
import { useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { ArrowLeft, History, Pencil, Trash2, UserRound, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/common/form-dialog'
import { PageHeader } from '@/components/common/page-header'
import { DetailRow, SectionCard } from '@/components/common/section-card'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { PaymentStatusBadge } from '@/components/common/status-badge'
import { useApp } from '@/components/providers'
import { purchaseOutstanding, purchasePaid, purchasePaymentStatus, purchaseTotal, TODAY } from '@/lib/data'
import { formatDate, formatIDR } from '@/lib/format'
import { appToast as toast } from '@/lib/toast'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const body = await response.text()
  let data: any = null
  if (body) { try { data = JSON.parse(body) } catch { data = null } }
  if (!response.ok) throw new Error(data?.error ?? 'Unable to load purchase details')
  if (data === null) throw new Error('The server returned an invalid response')
  return data
}
type PurchaseDetail = {
  id: string; date: string; supplierId: string; dueDate: string | null; notes: string | null
  supplier: { id: string; name: string; contact?: string | null; address?: string | null } | null
  items: Array<{ id: string; productId: string; qty: number; unitCost: string | number }>
  products: Array<{ id: string; name: string; stock: string | number; averageCost: string | number }>
  payments: Array<{ id: string; date: string; amount: string | number; account: string }>
  sourceInvoice: { id: string; fileName: string; createdAt: string; mimeType: string | null } | null
}
export function PurchaseDetailView({ purchaseId }: { purchaseId: string }) {
  const { t } = useApp()
  const { mutate: globalMutate } = useSWRConfig()
  const [payOpen, setPayOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [dueDateEditing, setDueDateEditing] = useState(false)
  const [dueDateValue, setDueDateValue] = useState('')
  const [dueDateSaving, setDueDateSaving] = useState(false)
  const { data: business } = useSWR<{ id: string }>('/api/businesses/current', fetcher)
  const { data: accounts } = useSWR<Array<{ id: string; name: string; active: boolean }>>(business?.id ? '/api/financial-accounts?businessId=' + encodeURIComponent(business.id) : null, fetcher)
  const { data, error, mutate } = useSWR<PurchaseDetail>(business?.id ? '/api/purchases/' + encodeURIComponent(purchaseId) + '?businessId=' + encodeURIComponent(business.id) : null, fetcher)

  if (error) return <div role="alert" className="space-y-3 text-sm text-destructive"><p>{error.message}</p><Button variant="outline" onClick={() => mutate()}>Retry</Button></div>
  if (!business || !data || !accounts) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  const purchase = { ...data, notes: data.notes ?? '', items: data.items.map((item) => ({ productId: item.productId, qty: Number(item.qty), price: Number(item.unitCost) })), payments: data.payments.map((payment) => ({ ...payment, amount: Number(payment.amount) })) }
  const total = purchaseTotal(purchase as any)
  const paid = purchasePaid(purchase as any)
  const outstanding = purchaseOutstanding(purchase as any)
  const productById = new Map(data.products.map((product) => [product.id, { ...product, stock: Number(product.stock), averageCost: Number(product.averageCost) }]))
  const saveDueDate = async () => {
    setDueDateSaving(true)
    try {
      const response = await fetch('/api/purchases/' + encodeURIComponent(data.id) + '?businessId=' + encodeURIComponent(business.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate: dueDateValue || null }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'Unable to update due date')
      await mutate()
      await globalMutate((key) => typeof key === 'string' && key.includes('/api/payables'))
      setDueDateEditing(false)
      toast.success(t('common.saved'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update due date')
    } finally {
      setDueDateSaving(false)
    }
  }
  const totalQuantity = purchase.items.reduce((sum: number, item: { qty: number }) => sum + item.qty, 0)
  const uniqueProducts = new Set(purchase.items.map((item: { productId: string }) => item.productId)).size
  return <>
    <PageHeader
      breadcrumbs={[{ label: t('nav.purchasing') }, { label: t('nav.purchases'), href: '/purchases' }]}
      title={<span className="font-mono">{data.id}</span>}
      meta={<PaymentStatusBadge status={purchasePaymentStatus(purchase as any)} />}
      actions={<>
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/purchases" />}><ArrowLeft /> Back to purchases</Button>
        <Button variant="outline" size="sm" className="text-destructive hover:bg-pink-100 hover:text-red-700 dark:hover:bg-red-950/40" disabled={data.payments.length > 0} onClick={() => setDeleteOpen(true)}><Trash2 /> Delete purchase</Button>
      </>}
    />
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
        {data.sourceInvoice && <SectionCard title="Source invoice">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0"><p className="truncate font-medium" title={data.sourceInvoice.fileName}>{data.sourceInvoice.fileName}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(data.sourceInvoice.createdAt).toLocaleString()}</p></div>
            <Button variant="outline" size="sm" nativeButton={false} render={<a href={"/api/purchase-documents/" + encodeURIComponent(data.sourceInvoice.id) + "/file?businessId=" + encodeURIComponent(business.id)} target="_blank" rel="noreferrer" />}><History /> View invoice</Button>
          </div>
        </SectionCard>}
        <SectionCard title="Purchase items" bodyClassName="p-0 md:p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <th scope="col" className="h-10 w-[42%] px-4 text-left font-medium md:px-5">Product</th>
                <th scope="col" className="h-10 px-4 text-right font-medium">Qty</th>
                <th scope="col" className="h-10 px-4 text-right font-medium">Purchase price</th>
                <th scope="col" className="h-10 px-4 text-right font-medium">Subtotal</th>
              </tr></thead>
              <tbody className="divide-y">
                {purchase.items.map((item: { productId: string; qty: number; price: number }, index: number) => {
                  const product = productById.get(item.productId)
                  return <tr key={data.items[index]?.id ?? item.productId}>
                    <td className="w-[42%] px-4 py-3 md:px-5">
                      <p className="truncate font-medium" title={product?.name ?? item.productId}>{product?.name ?? item.productId}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{item.productId}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Current stock: <span className="font-mono tabular-nums">{product ? product.stock.toLocaleString('id-ID') : '—'}</span></p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{item.qty.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{formatIDR(item.price)}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium tabular-nums">{formatIDR(item.qty * item.price)}</td>
                  </tr>
                })}
              </tbody>
              <tfoot><tr className="border-t bg-muted/30">
                <td colSpan={3} className="px-4 py-3 text-right text-sm font-medium md:px-5">Total purchase</td>
                <td className="px-4 py-3 text-right font-mono text-base font-semibold tabular-nums md:px-5">{formatIDR(total)}</td>
              </tr></tfoot>
            </table>
          </div>
        </SectionCard>
        <SectionCard title="Payments" action={outstanding > 0 ? <Button size="sm" onClick={() => setPayOpen(true)}><Wallet /> {t('orders.addPayment')}</Button> : undefined} bodyClassName="p-0 md:p-0">
          {purchase.payments.length === 0 ? <p className="p-5 text-sm text-muted-foreground">No payments recorded yet.</p> : <ul className="divide-y">
            {purchase.payments.map((payment: { id: string; date: string; amount: number; account: string }) => <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-5">
              <div><p className="font-mono text-xs font-medium text-primary">{payment.id}</p><p className="text-xs text-muted-foreground">{formatDate(payment.date)} · {payment.account}</p></div>
              <span className="font-mono text-sm font-medium tabular-nums text-success">−{formatIDR(payment.amount)}</span>
            </li>)}
          </ul>}
        </SectionCard>
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <SectionCard title="Payment summary">
          <dl className="divide-y">
            <DetailRow label={t('common.total')}><span className="font-mono font-medium tabular-nums">{formatIDR(total)}</span></DetailRow>
            <DetailRow label={t('common.paid')}><span className="font-mono font-medium tabular-nums text-success">{formatIDR(paid)}</span></DetailRow>
            <DetailRow label={t('common.outstanding')}><span className={`font-mono text-base font-semibold tabular-nums ${outstanding > 0 ? 'text-warning' : 'text-success'}`}>{formatIDR(outstanding)}</span></DetailRow>
            <DetailRow label={t('common.dueDate')}>
              {dueDateEditing ? <div className="flex flex-wrap items-center gap-2">
                <input aria-label={t('common.dueDate')} type="date" value={dueDateValue} onChange={(event) => setDueDateValue(event.target.value)} className="h-8 min-w-0 rounded-md border border-input bg-background px-2 text-sm" />
                <Button size="sm" disabled={dueDateSaving} onClick={saveDueDate}>{dueDateSaving ? t('common.loading') : t('common.save')}</Button>
                <Button size="sm" variant="ghost" disabled={dueDateSaving} onClick={() => setDueDateEditing(false)}>{t('common.cancel')}</Button>
              </div> : <div className="flex items-center justify-between gap-2">
                {data.dueDate ? <span className={data.dueDate < TODAY && outstanding > 0 ? 'text-destructive' : ''}>{formatDate(data.dueDate)}</span> : <span className="text-muted-foreground">{t('common.noDueDate')}</span>}
                <Button size="sm" variant="ghost" onClick={() => { setDueDateValue(data.dueDate ?? ''); setDueDateEditing(true) }}><Pencil className="size-3.5" /> {t('common.edit')}</Button>
              </div>}
            </DetailRow>
          </dl>
          {total > 0 && <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round((paid / total) * 100)} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-success" style={{ width: `${Math.min((paid / total) * 100, 100)}%` }} /></div>}
        </SectionCard>
        <SectionCard title="Purchase summary">
          <dl className="divide-y">
            <DetailRow label="Products"><span className="font-mono tabular-nums">{uniqueProducts}</span></DetailRow>
            <DetailRow label="Total quantity"><span className="font-mono tabular-nums">{totalQuantity.toLocaleString('id-ID')}</span></DetailRow>
            <DetailRow label="Purchase cost"><span className="font-mono font-semibold tabular-nums">{formatIDR(total)}</span></DetailRow>
          </dl>
        </SectionCard>
        <SectionCard title="Purchase information">
          <dl className="divide-y">
            <DetailRow label={t('common.supplier')}>{data.supplier?.name ?? data.supplierId}</DetailRow>
            <DetailRow label={t('common.phone')}><span className="font-mono text-xs">{data.supplier?.contact || '—'}</span></DetailRow>
            <DetailRow label="Purchase date">{formatDate(data.date)}</DetailRow>
          </dl>
          {data.notes && <div className="mt-3 rounded-lg bg-muted/60 p-3 text-sm leading-relaxed"><p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('common.notes')}</p>{data.notes}</div>}
          <div className="mt-4 flex flex-col gap-2">
            <Button variant="outline" size="sm" className="justify-start" nativeButton={false} render={<Link href="/suppliers" />}><UserRound /> View supplier</Button>
            <Button variant="outline" size="sm" className="justify-start" nativeButton={false} render={<Link href="/payables" />}><Wallet /> View payables</Button>
            <Button variant="outline" size="sm" className="justify-start" nativeButton={false} render={<Link href="/history" />}><History /> {t('orders.viewHistory')}</Button>
          </div>
        </SectionCard>
      </div>
    </div>
    <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete purchase" description={data.payments.length > 0 ? 'This purchase has payment records and cannot be deleted.' : 'Warning: deleting this unpaid purchase will remove its purchase record and receipt movement, recalculate affected products’ stock and average cost, and remove its linked accounting entry. This cannot be undone.'} confirmLabel="Delete purchase" onConfirm={async () => { if (!business?.id || data.payments.length > 0) return; const response = await fetch('/api/purchases/' + encodeURIComponent(data.id) + '?businessId=' + encodeURIComponent(business.id), { method: 'DELETE' }); const result = await response.json(); if (!response.ok) throw new Error(result.error ?? 'Unable to delete purchase'); await Promise.all([globalMutate((key) => typeof key === 'string' && (key.includes('/api/purchases') || key.includes('/api/products') || key.includes('/api/inventory') || key.includes('/api/stock-movements') || key.includes('/api/dashboard') || key.includes('/api/general-ledger') || key.includes('/api/payables'))), globalMutate('/api/purchases?businessId=' + encodeURIComponent(business.id))]); window.location.href = '/purchases'; }} />
    <FormDialog open={payOpen} onOpenChange={setPayOpen} title={t('orders.addPayment')} description={'Purchase ' + data.id + ' · Outstanding: ' + formatIDR(outstanding)} persisted onSubmit={async (values) => {
      if (!business?.id) throw new Error('Business access required')
      const response = await fetch('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'PAY-' + crypto.randomUUID(), businessId: business.id, purchaseId: data.id, date: values.date, amount: Number(values.amount), account: values.account }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Unable to record supplier payment')
      await Promise.all([mutate(), globalMutate('/api/payments?businessId=' + encodeURIComponent(business.id)), globalMutate('/api/purchases?businessId=' + encodeURIComponent(business.id)), globalMutate('/api/accounting?businessId=' + encodeURIComponent(business.id)), globalMutate('/api/cash-transactions?businessId=' + encodeURIComponent(business.id))])
      setPayOpen(false)
      toast.success('Payment recorded successfully')
    }} fields={[
      { name: 'date', label: t('common.date'), type: 'date', defaultValue: TODAY, half: true },
      { name: 'account', label: t('payables.payFrom'), type: 'select', half: true, options: accounts.filter((account) => account.active).map((account) => ({ value: account.name, label: account.name })) },
      { name: 'amount', label: t('common.amount'), type: 'number', prefix: 'Rp', min: 1, defaultValue: String(outstanding), hint: 'Outstanding: ' + formatIDR(outstanding) },
    ]} />
  </>
}
