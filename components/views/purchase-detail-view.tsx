'use client'

import Link from 'next/link'
import { useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { ArrowLeft, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/common/form-dialog'
import { PageHeader } from '@/components/common/page-header'
import { DetailRow, SectionCard } from '@/components/common/section-card'
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
  supplier: { id: string; name: string; phone?: string | null; address?: string | null } | null
  items: Array<{ id: string; productId: string; qty: number; unitCost: string | number }>
  products: Array<{ id: string; name: string; stock: string | number; averageCost: string | number }>
  payments: Array<{ id: string; date: string; amount: string | number; account: string }>
}
export function PurchaseDetailView({ purchaseId }: { purchaseId: string }) {
  const { t } = useApp()
  const { mutate: globalMutate } = useSWRConfig()
  const [payOpen, setPayOpen] = useState(false)
  const { data: business } = useSWR<{ id: string }>('/api/businesses/current', fetcher)
  const { data: accounts } = useSWR<Array<{ id: string; name: string; active: boolean }>>(business?.id ? '/api/financial-accounts?businessId=' + encodeURIComponent(business.id) : null, fetcher)
  const { data, error, mutate } = useSWR<PurchaseDetail>(business?.id ? '/api/purchases/' + encodeURIComponent(purchaseId) + '?businessId=' + encodeURIComponent(business.id) : null, fetcher)

  if (error) return <div role="alert" className="space-y-3 text-sm text-destructive"><p>{error.message}</p><Button variant="outline" onClick={() => mutate()}>Retry</Button></div>
  if (!business || !data || !accounts) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  const purchase = { ...data, notes: data.notes ?? '', items: data.items.map((item) => ({ productId: item.productId, qty: Number(item.qty), price: Number(item.unitCost) })), payments: data.payments.map((payment) => ({ ...payment, amount: Number(payment.amount) })) }
  const total = purchaseTotal(purchase as any)
  const paid = purchasePaid(purchase as any)
  const outstanding = purchaseOutstanding(purchase as any)
  const productById = new Map(data.products.map((product) => [product.id, product]))
  return <>
    <PageHeader breadcrumbs={[{ label: t('nav.purchasing') }, { label: t('nav.purchases'), href: '/purchases' }, { label: data.id }]} title={<span className="font-mono">{data.id}</span>} description={data.supplier?.name ?? data.supplierId} meta={<PaymentStatusBadge status={purchasePaymentStatus(purchase as any)} />} actions={<Button variant="outline" size="sm" nativeButton={false} render={<Link href="/purchases" />}><ArrowLeft /> Back to purchases</Button>} />
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <SectionCard title="Purchase items" bodyClassName="p-0 md:p-0">
          <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-sm"><thead><tr className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground"><th className="px-4 py-3 text-left">Product</th><th className="px-4 py-3 text-right">Qty</th><th className="px-4 py-3 text-right">Unit cost</th><th className="px-4 py-3 text-right">Subtotal</th></tr></thead><tbody className="divide-y">{purchase.items.map((item, index) => <tr key={data.items[index]?.id ?? item.productId}><td className="px-4 py-3"><div className="font-medium">{productById.get(item.productId)?.name ?? item.productId}</div><div className="font-mono text-xs text-muted-foreground">{item.productId}</div></td><td className="px-4 py-3 text-right font-mono">{item.qty}</td><td className="px-4 py-3 text-right font-mono">{formatIDR(item.price)}</td><td className="px-4 py-3 text-right font-mono font-medium">{formatIDR(item.qty * item.price)}</td></tr>)}</tbody><tfoot><tr className="border-t bg-muted/30"><td colSpan={3} className="px-4 py-3 text-right font-medium">Total</td><td className="px-4 py-3 text-right font-mono font-semibold">{formatIDR(total)}</td></tr></tfoot></table></div>
        </SectionCard>
        <SectionCard title="Payments" action={outstanding > 0 ? <Button size="sm" onClick={() => setPayOpen(true)}><Wallet /> {t('orders.addPayment')}</Button> : undefined} bodyClassName="p-0 md:p-0">
          {purchase.payments.length === 0 ? <p className="p-5 text-sm text-muted-foreground">No payments recorded yet.</p> : <div className="divide-y">{purchase.payments.map((payment) => <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"><div><div className="font-mono text-xs">{payment.id}</div><div className="text-muted-foreground">{formatDate(payment.date)} · {payment.account}</div></div><div className="font-mono font-medium">{formatIDR(payment.amount)}</div></div>)}</div>}
        </SectionCard>
      </div>
      <div className="flex flex-col gap-4">
        <SectionCard title="Purchase summary">
          <DetailRow label="Purchase date" value={formatDate(data.date)} />
          <DetailRow label="Supplier" value={data.supplier?.name ?? data.supplierId} />
          <DetailRow label="Due date" value={data.dueDate ? formatDate(data.dueDate) : 'No due date'} />
          <DetailRow label="Total" value={formatIDR(total)} />
          <DetailRow label="Paid" value={formatIDR(paid)} />
          <DetailRow label="Outstanding" value={formatIDR(outstanding)} />
          {data.notes && <DetailRow label="Notes" value={data.notes} />}
        </SectionCard>
      </div>
    </div>
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
