'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { SectionCard, DetailRow } from '@/components/common/section-card'
import { KpiCard, KpiGrid } from '@/components/common/kpi-card'
import { useApp } from '@/components/providers'
import { Button } from '@/components/ui/button'
import { Pill } from '@/components/common/status-badge'
import { formatDate, formatIDR } from '@/lib/format'

type ProductDetail = {
  id: string
  businessId: string
  name: string
  sellingPrice: string | number
  costReference: string | number
  averageCost: string | number
  minimumStock: number
}
type SoldItem = { productId: string; qty: number; price: string | number; discount?: string | number }
type ProductOrder = { id: string; date: string; customerId: string; status: string; items: SoldItem[] }
type ReturnRow = { id: string; date: string; orderId: string; items: Array<{ productId: string; qty: number }>; refundAmount: string | number; stockReturned: boolean }
type CustomerRow = { id: string; name: string }
type InventoryRow = ProductDetail & { stock: number }

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const body = await response.json()
  if (!response.ok) throw new Error(body?.error ?? 'Unable to load product details')
  return body
}

export function ProductDetailView({ productId }: { productId: string }) {
  const { t } = useApp()
  const { data: product, error, mutate } = useSWR<ProductDetail>(`/api/products/${encodeURIComponent(productId)}`, fetcher)
  const businessId = product?.businessId
  const { data: inventory } = useSWR<{ products: InventoryRow[] }>(businessId ? `/api/inventory?businessId=${encodeURIComponent(businessId)}` : null, fetcher)
  const { data: orders } = useSWR<ProductOrder[]>(businessId ? `/api/orders?businessId=${encodeURIComponent(businessId)}` : null, fetcher)
  const { data: returns } = useSWR<ReturnRow[]>(businessId ? `/api/returns?businessId=${encodeURIComponent(businessId)}` : null, fetcher)
  const { data: customers } = useSWR<CustomerRow[]>(businessId ? `/api/customers?businessId=${encodeURIComponent(businessId)}` : null, fetcher)

  if (error) return <div role="alert" className="space-y-3"><p className="text-sm text-destructive">{error.message}</p><Button variant="outline" size="sm" onClick={() => mutate()}>{t('common.retry')}</Button></div>
  if (!product || !inventory || !orders || !returns || !customers) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>

  const current = inventory.products.find((row) => row.id === product.id)
  const soldOrders = orders.filter((order) => order.status !== 'cancelled' && order.items.some((item) => item.productId === product.id))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
  const returnedForProduct = returns.filter((row) => row.items.some((item) => item.productId === product.id))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
  const returnedQtyForOrder = (orderId: string) => returns.filter((row) => row.orderId === orderId)
    .flatMap((row) => row.items).filter((item) => item.productId === product.id)
    .reduce((sum, item) => sum + Number(item.qty), 0)
  const customerName = (id: string) => customers.find((customer) => customer.id === id)?.name ?? id
  const eligibleOrders = soldOrders.filter((order) => {
    const soldQty = Number(order.items.find((item) => item.productId === product.id)?.qty ?? 0)
    return soldQty - returnedQtyForOrder(order.id) > 0
  })

  return <>
    <PageHeader
      breadcrumbs={[{ label: t('nav.inventory') }, { label: t('nav.products'), href: '/products' }, { label: product.name }]}
      title={product.name}
      description={product.id}
      actions={<Button variant="outline" size="sm" nativeButton={false} render={<Link href="/products" />}><ArrowLeft />{t('products.backToList')}</Button>}
    />
    <KpiGrid>
      <KpiCard label={t('products.sellingPrice')} value={formatIDR(Number(product.sellingPrice))} />
      <KpiCard label={t('products.averageCost')} value={formatIDR(Number(product.averageCost))} />
      <KpiCard label={t('products.stock')} value={current?.stock ?? 0} />
      <KpiCard label={t('products.minimumStock')} value={product.minimumStock} />
    </KpiGrid>
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard title={t('products.detail')}>
        <dl className="divide-y">
          <DetailRow label={t('products.id')}><span className="font-mono">{product.id}</span></DetailRow>
          <DetailRow label={t('products.sellingPrice')}>{formatIDR(Number(product.sellingPrice))}</DetailRow>
          <DetailRow label={t('products.costReference')}>{formatIDR(Number(product.costReference))}</DetailRow>
          <DetailRow label={t('products.averageCost')}>{formatIDR(Number(product.averageCost))}</DetailRow>
          <DetailRow label={t('products.inventoryValue')}>{formatIDR(Math.max(Number(current?.stock ?? 0), 0) * Number(product.averageCost))}</DetailRow>
        </dl>
      </SectionCard>
      <SectionCard title={t('returns.items')} description={t('products.returnHistoryDescription')}>
        {returnedForProduct.length ? <ul className="divide-y">
          {returnedForProduct.map((row) => {
            const line = row.items.find((item) => item.productId === product.id)
            return <li key={row.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <Link href={`/returns/${encodeURIComponent(row.id)}`} className="font-mono text-sm text-primary hover:underline">{row.id}</Link>
                <p className="text-xs text-muted-foreground">{formatDate(row.date)} · {row.orderId}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">×{line?.qty ?? 0}</span>
                <Pill tone={Number(row.refundAmount) > 0 ? 'success' : 'neutral'}>{Number(row.refundAmount) > 0 ? t('returns.refunded') : t('returns.noRefund')}</Pill>
              </div>
            </li>
          })}
        </ul> : <p className="py-3 text-sm text-muted-foreground">{t('products.noReturnHistory')}</p>}
      </SectionCard>
    </div>
    <SectionCard title={t('products.returnFromOrder')} description={t('products.returnFromOrderDescription')} className="mt-4">
      {eligibleOrders.length ? <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead><tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-2 pr-4 font-medium">{t('returns.order')}</th>
            <th className="py-2 pr-4 font-medium">{t('common.customer')}</th>
            <th className="py-2 pr-4 font-medium">{t('common.date')}</th>
            <th className="py-2 pr-4 text-right font-medium">{t('common.qty')}</th>
            <th className="py-2 pr-4 text-right font-medium">{t('returns.remaining')}</th>
            <th className="py-2 text-right font-medium">{t('common.actions')}</th>
          </tr></thead>
          <tbody className="divide-y">
            {eligibleOrders.map((order) => {
              const soldQty = Number(order.items.find((item) => item.productId === product.id)?.qty ?? 0)
              const alreadyReturned = returnedQtyForOrder(order.id)
              return <tr key={order.id}>
                <td className="py-3 pr-4"><Link href={`/orders/${encodeURIComponent(order.id)}`} className="font-mono text-primary hover:underline">{order.id}</Link></td>
                <td className="py-3 pr-4">{customerName(order.customerId)}</td>
                <td className="py-3 pr-4 text-muted-foreground">{formatDate(order.date)}</td>
                <td className="py-3 pr-4 text-right font-mono">{soldQty}</td>
                <td className="py-3 pr-4 text-right font-mono">{soldQty - alreadyReturned}</td>
                <td className="py-3 text-right">
                  <Button size="sm" nativeButton={false} render={<Link href={`/returns/new?orderId=${encodeURIComponent(order.id)}&productId=${encodeURIComponent(product.id)}`} />}><RotateCcw />{t('returns.add')}</Button>
                </td>
              </tr>
            })}
          </tbody>
        </table>
      </div> : <p className="py-3 text-sm text-muted-foreground">{t('products.noReturnableOrders')}</p>}
    </SectionCard>
  </>
}
