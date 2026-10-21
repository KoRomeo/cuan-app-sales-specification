'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { ArrowLeft, ExternalLink, PackageCheck, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { SectionCard, DetailRow } from '@/components/common/section-card'
import { Pill } from '@/components/common/status-badge'
import { useApp } from '@/components/providers'
import { Button } from '@/components/ui/button'
import { formatDate, formatIDR } from '@/lib/format'

type ReturnDetail = {
  id: string
  date: string
  orderId: string
  total: string | number
  refundAmount: string | number
  stockReturned: boolean
  notes: string | null
  refundAccount: string | null
  customer: { id: string; name: string; phone: string | null; address: string | null } | null
  items: Array<{ productId: string; productName: string; qty: number; price: string | number }>
}
const fetcher = async (url: string) => {
  const response = await fetch(url)
  const body = await response.json()
  if (!response.ok) throw new Error(body?.error ?? 'Failed to load return details')
  return body
}

export function ReturnDetailView({ returnId }: { returnId: string }) {
  const { t } = useApp()
  const { data, error, mutate } = useSWR<ReturnDetail>(`/api/returns/${encodeURIComponent(returnId)}`, fetcher)
  if (error) return <div role="alert" className="space-y-3"><p className="text-sm text-destructive">{error.message}</p><Button variant="outline" size="sm" onClick={() => mutate()}>{t('common.retry')}</Button></div>
  if (!data) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>

  return <>
    <PageHeader
      breadcrumbs={[{ label: t('nav.sales') }, { label: t('nav.returns'), href: '/returns' }, { label: data.id }]}
      title={<span className="font-mono">{data.id}</span>}
      description={t('returns.readOnly')}
      meta={<Pill tone={Number(data.refundAmount) > 0 ? 'success' : 'neutral'}>{Number(data.refundAmount) > 0 ? t('returns.refunded') : t('returns.noRefund')}</Pill>}
      actions={<>
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/orders/${encodeURIComponent(data.orderId)}`} />}><ExternalLink />{t('orders.viewOrder')}</Button>
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/returns" />}><ArrowLeft />{t('nav.returns')}</Button>
      </>}
    />
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
        <SectionCard title={t('returns.detail')}>
          <dl className="grid gap-x-8 sm:grid-cols-2">
            <DetailRow label={t('common.date')}>{formatDate(data.date)}</DetailRow>
            <DetailRow label={t('returns.linkedOrder')}>
              <Link className="font-mono text-primary hover:underline" href={`/orders/${encodeURIComponent(data.orderId)}`}>{data.orderId}</Link>
            </DetailRow>
            <DetailRow label={t('common.customer')}>{data.customer?.name ?? '—'}</DetailRow>
            <DetailRow label={t('common.phone')}>{data.customer?.phone || '—'}</DetailRow>
            <DetailRow label={t('returns.items')}>{data.items.reduce((sum, item) => sum + Number(item.qty), 0)} {t('common.qty')}</DetailRow>
            <DetailRow label={t('common.status')}>{data.stockReturned ? t('returns.stockReturned') : t('returns.stockNotReturned')}</DetailRow>
          </dl>
          {data.notes && <div className="mt-3 rounded-md bg-muted/40 p-3 text-sm"><p className="mb-1 text-xs font-medium text-muted-foreground">{t('common.notes')}</p>{data.notes}</div>}
        </SectionCard>
        <SectionCard title={t('returns.items')} bodyClassName="p-0 md:p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead><tr className="border-b bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="h-10 px-4 text-left font-medium">{t('common.product')}</th>
                <th className="h-10 px-4 text-right font-medium">{t('common.qty')}</th>
                <th className="h-10 px-4 text-right font-medium">{t('orders.sellingPrice')}</th>
                <th className="h-10 px-4 text-right font-medium">{t('orders.subtotal')}</th>
              </tr></thead>
              <tbody className="divide-y">{data.items.map((item, index) => <tr key={item.productId + '-' + index}>
                <td className="px-4 py-3"><p className="font-medium">{item.productName}</p><p className="font-mono text-xs text-muted-foreground">{item.productId}</p></td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-mono">{item.qty}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-mono">{formatIDR(Number(item.price))}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-mono">{formatIDR(Number(item.price) * Number(item.qty))}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </SectionCard>
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <SectionCard title={t('returns.detail')}>
          <dl className="divide-y">
            <DetailRow label={t('returns.returnedAmount')}><span className="font-mono">{formatIDR(Number(data.total))}</span></DetailRow>
            <DetailRow label={t('returns.totalRefund')}><span className="font-mono text-destructive">{formatIDR(Number(data.refundAmount))}</span></DetailRow>
            {Number(data.refundAmount) > 0 && data.refundAccount && <DetailRow label={t('common.account')}><span className="font-mono">{data.refundAccount}</span></DetailRow>}
            <DetailRow label={t('common.status')}>{data.stockReturned ? <span className="inline-flex items-center gap-1.5"><PackageCheck className="size-4" />{t('returns.stockReturned')}</span> : t('returns.stockNotReturned')}</DetailRow>
          </dl>
          {Number(data.refundAmount) > 0 && <p className="mt-3 flex items-center gap-2 rounded-md bg-muted/40 p-3 text-sm"><Wallet className="size-4 shrink-0" />{t('returns.refunded')}</p>}
          <Button className="mt-4 w-full" nativeButton={false} render={<Link href={`/orders/${encodeURIComponent(data.orderId)}`} />}>{t('orders.viewOrder')}</Button>
        </SectionCard>
      </div>
    </div>
  </>
}
