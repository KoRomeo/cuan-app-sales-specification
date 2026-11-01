'use client'

import Link from 'next/link'
import { useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { ArrowLeft, History, Ban, UserRound, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/common/form-dialog'
import { PageHeader } from '@/components/common/page-header'
import { DetailRow, SectionCard } from '@/components/common/section-card'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { PaymentStatusBadge, Pill } from '@/components/common/status-badge'
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
  id: string; date: string; createdAt: string; supplierId: string; dueDate: string | null; notes: string | null; status?: string; totalOverride?: string | number | null
  supplier: { id: string; name: string; contact?: string | null; address?: string | null } | null
  items: Array<{ id: string; productId: string; qty: number; unitCost: string | number; discount?: string | number; discountType?: "amount" | "percent" }>
  products: Array<{ id: string; name: string; stock: string | number; averageCost: string | number }>
  payments: Array<{ id: string; date: string; amount: string | number; account: string }>
  sourceInvoice: { id: string; fileName: string; createdAt: string; mimeType: string | null; status: string; confirmedAt: string | null } | null
  stockMovements: Array<{ id: string; date: string; qty: number; reference: string }>
}
export function PurchaseDetailView({ purchaseId }: { purchaseId: string }) {
  const { t, locale } = useApp()
  const { mutate: globalMutate } = useSWRConfig()
  const [payOpen, setPayOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { data: business } = useSWR<{ id: string }>('/api/businesses/current', fetcher)
  const { data: accounts } = useSWR<Array<{ id: string; name: string; active: boolean }>>(business?.id ? '/api/financial-accounts?businessId=' + encodeURIComponent(business.id) : null, fetcher)
  const { data, error, mutate } = useSWR<PurchaseDetail>(business?.id ? '/api/purchases/' + encodeURIComponent(purchaseId) + '?businessId=' + encodeURIComponent(business.id) : null, fetcher)

  if (error) return <div role="alert" className="space-y-3 text-sm text-destructive"><p>{error.message}</p><Button variant="outline" onClick={() => mutate()}>Retry</Button></div>
  if (!business || !data || !accounts) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  const purchase = { ...data, notes: data.notes ?? '', items: data.items.map((item) => ({ productId: item.productId, qty: Number(item.qty), price: Number(item.unitCost), discount: Number(item.discount ?? 0), discountType: item.discountType ?? "amount" })), payments: data.payments.map((payment) => ({ ...payment, amount: Number(payment.amount) })) }
  const total = purchaseTotal(purchase as any)
  const paid = purchasePaid(purchase as any)
  const outstanding = purchaseOutstanding(purchase as any)
  const productById = new Map(data.products.map((product) => [product.id, { ...product, stock: Number(product.stock), averageCost: Number(product.averageCost) }]))
  const totalQuantity = purchase.items.reduce((sum: number, item: { qty: number }) => sum + item.qty, 0)
  const uniqueProducts = new Set(purchase.items.map((item: { productId: string }) => item.productId)).size
  return <>
    <PageHeader
      breadcrumbs={[{ label: t('nav.purchasing') }, { label: t('nav.purchases'), href: '/purchases' }]}
      title={<span className="font-mono">{data.id}</span>}
      meta={data.status === 'cancelled' ? <Pill tone="neutral">{t('status.cancelled')}</Pill> : <PaymentStatusBadge status={purchasePaymentStatus(purchase as any)} />}
      actions={<>
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/purchases" />}><ArrowLeft /> Back to purchases</Button>
        {data.status !== 'cancelled' && <Button variant="outline" size="sm" className="text-destructive hover:bg-pink-100 hover:text-red-700 dark:hover:bg-red-950/40" disabled={data.payments.length > 0} onClick={() => setDeleteOpen(true)}><Ban /> {t('common.cancel')}</Button>}
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
                {purchase.items.map((item: { productId: string; qty: number; price: number; discount?: number; discountType?: "amount" | "percent" }, index: number) => {
                  const product = productById.get(item.productId)
                  const gross = item.qty * item.price
                  const discount = item.discountType === "percent" ? gross * Number(item.discount ?? 0) / 100 : Number(item.discount ?? 0)
                  const lineTotal = Math.ceil(Math.max(0, gross - discount) - 1e-9)
                  return <tr key={data.items[index]?.id ?? item.productId}>
                    <td className="w-[42%] px-4 py-3 md:px-5">
                      <p className="truncate font-medium" title={product?.name ?? item.productId}>{product?.name ?? item.productId}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{item.productId}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Current stock: <span className="font-mono tabular-nums">{product ? product.stock.toLocaleString('id-ID') : '—'}</span></p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{item.qty.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{formatIDR(item.price)}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium tabular-nums">{formatIDR(lineTotal)}</td>
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
        <SectionCard title="Payments" action={outstanding > 0 && data.status !== 'cancelled' ? <Button size="sm" onClick={() => setPayOpen(true)}><Wallet /> {t('orders.addPayment')}</Button> : undefined} bodyClassName="p-0 md:p-0">
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
              {data.dueDate ? <span className={data.dueDate < TODAY && outstanding > 0 ? 'text-destructive' : ''}>{formatDate(data.dueDate)}</span> : <span className="text-muted-foreground">{t('common.noDueDate')}</span>}
            </DetailRow>
          </dl>
          {total > 0 && <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round((paid / total) * 100)} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-success" style={{ width: `${Math.min((paid / total) * 100, 100)}%` }} /></div>}
        </SectionCard>
        <SectionCard title={locale === "id" ? "Log aktivitas" : "Activity log"}>
          <ol className="relative ml-1 space-y-4 before:absolute before:z-0 before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-border">
            <li className="flex gap-3">
              <span className="relative z-10 mt-1 size-2.5 shrink-0 rounded-full bg-success ring-4 ring-success/10" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{data.sourceInvoice ? (locale === 'id' ? 'Nota diterima untuk ditinjau' : 'Invoice received for review') : (locale === 'id' ? 'Pembelian dicatat' : 'Purchase recorded')}</p>
                <p className="text-xs text-muted-foreground">{new Date(data.sourceInvoice?.createdAt ?? data.createdAt).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US')}</p>
              </div>
              <Pill tone="success">{locale === 'id' ? 'Selesai' : 'Done'}</Pill>
            </li>
            <li className="flex gap-3">
              <span className={`relative z-10 mt-1 size-2.5 shrink-0 rounded-full ring-4 ${data.sourceInvoice?.status === 'confirmed' || !data.sourceInvoice ? 'bg-success ring-success/10' : 'bg-warning ring-warning/10'}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{locale === 'id' ? 'Nota dikonfirmasi' : 'Invoice confirmed'}</p>
                <p className="text-xs text-muted-foreground">{data.sourceInvoice?.confirmedAt ? new Date(data.sourceInvoice.confirmedAt).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US') : data.sourceInvoice?.status === 'confirmed' ? (locale === 'id' ? 'Konfirmasi tercatat' : 'Confirmation recorded') : (locale === 'id' ? 'Menunggu pemeriksaan dan konfirmasi nota' : 'Waiting for invoice review and confirmation')}</p>
              </div>
              <Pill tone={data.sourceInvoice?.status === 'confirmed' || !data.sourceInvoice ? 'success' : 'warning'}>{data.sourceInvoice?.status === 'confirmed' || !data.sourceInvoice ? (locale === 'id' ? 'Selesai' : 'Done') : (locale === 'id' ? 'Menunggu' : 'Pending')}</Pill>
            </li>
            <li className="flex gap-3">
              <span className={`relative z-10 mt-1 size-2.5 shrink-0 rounded-full ring-4 ${data.stockMovements.length ? 'bg-success ring-success/10' : 'bg-warning ring-warning/10'}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{data.stockMovements.length ? (locale === 'id' ? 'Barang sampai di gudang' : 'Goods received at warehouse') : data.sourceInvoice && data.sourceInvoice.status !== 'confirmed' ? (locale === 'id' ? 'Menunggu nota dikonfirmasi' : 'Awaiting invoice confirmation') : (locale === 'id' ? 'Barang dalam perjalanan' : 'Goods in transit')}</p>
                <p className="text-xs text-muted-foreground">{data.stockMovements.length ? `Stok diterima · ${formatDate(data.stockMovements[0].date)}` : (locale === 'id' ? 'Penerimaan barang belum dicatat' : 'Goods receipt has not been recorded')}</p>
              </div>
              <Pill tone={data.stockMovements.length ? 'success' : 'warning'}>{data.stockMovements.length ? (locale === 'id' ? 'Diterima' : 'Received') : (locale === 'id' ? 'Dalam proses' : 'In progress')}</Pill>
            </li>
            <li className="flex gap-3">
              <span className={`mt-1 size-2.5 shrink-0 rounded-full ring-4 ${outstanding <= 0 ? 'bg-success ring-success/10' : paid > 0 ? 'bg-warning ring-warning/10' : 'bg-muted-foreground/40 ring-muted/60'}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{outstanding <= 0 ? (locale === 'id' ? 'Pembayaran lunas' : 'Payment completed') : paid > 0 ? (locale === 'id' ? 'Pembayaran sebagian' : 'Partially paid') : (locale === 'id' ? 'Belum ada pembayaran' : 'Awaiting payment')}</p>
                <p className="text-xs text-muted-foreground">{purchase.payments.length ? purchase.payments.map((payment) => `${formatDate(payment.date)} · ${formatIDR(payment.amount)}`).join('  |  ') : (locale === 'id' ? 'Belum ada pembayaran yang dicatat' : 'No payments recorded yet')}</p>
              </div>
              <Pill tone={outstanding <= 0 ? 'success' : paid > 0 ? 'warning' : 'neutral'}>{outstanding <= 0 ? (locale === 'id' ? 'Lunas' : 'Paid') : paid > 0 ? (locale === 'id' ? 'Sebagian' : 'Partial') : (locale === 'id' ? 'Belum dibayar' : 'Unpaid')}</Pill>
            </li>
          </ol>
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
    <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title={t('common.cancel')} description={t('purchases.cancelConfirm', { id: data.id })} confirmLabel={t('common.cancel')} onConfirm={async () => { if (!business?.id || data.payments.length > 0 || data.status === 'cancelled') return; const response = await fetch('/api/purchases/' + encodeURIComponent(data.id) + '?businessId=' + encodeURIComponent(business.id), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'cancelled' }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error ?? 'Unable to cancel purchase'); await Promise.all([mutate(), globalMutate((key) => typeof key === 'string' && (key.includes('/api/purchases') || key.includes('/api/products') || key.includes('/api/inventory') || key.includes('/api/stock-movements') || key.includes('/api/dashboard') || key.includes('/api/general-ledger') || key.includes('/api/payables'))), globalMutate('/api/purchases?businessId=' + encodeURIComponent(business.id))]); setDeleteOpen(false); toast.success(t('status.cancelled')); window.location.href = '/purchases'; }} />
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
