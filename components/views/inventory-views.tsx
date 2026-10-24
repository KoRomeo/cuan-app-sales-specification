'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Boxes, Package, SlidersHorizontal, TrendingDown } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSWRConfig } from 'swr'
import { appToast as toast } from '@/lib/toast'
import { DataTable, IdCell, Money, type Column } from '@/components/common/data-table'
import { FormDialog } from '@/components/common/form-dialog'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { KpiCard, KpiGrid } from '@/components/common/kpi-card'
import { PageHeader } from '@/components/common/page-header'
import { Pill, StockStatusBadge } from '@/components/common/status-badge'
import type { Tone } from '@/components/common/tone'
import { useApp } from '@/components/providers'
import { Button } from '@/components/ui/button'
import { type MovementType, type Product, type StockMovement, stockStatusOf, TODAY } from '@/lib/data'
import { formatIDR, formatDate, formatPercent } from '@/lib/format'

const todayISODate = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}` }

 // Reuse the current-business request across inventory pages.
type CurrentBusiness = { id: string }
let currentBusinessCache: { value: CurrentBusiness; expiresAt: number } | null = null
let currentBusinessRequest: Promise<CurrentBusiness> | null = null

async function getCurrentBusiness(): Promise<CurrentBusiness> {
  if (currentBusinessCache && currentBusinessCache.expiresAt > Date.now()) return currentBusinessCache.value
  if (!currentBusinessRequest) {
    currentBusinessRequest = fetch('/api/businesses/current').then(async (response) => {
      const result = await response.json()
      if (!response.ok || !result?.id) throw new Error(result?.error ?? 'Unable to load business')
      currentBusinessCache = { value: result as CurrentBusiness, expiresAt: Date.now() + 30_000 }
      return result as CurrentBusiness
    }).finally(() => { currentBusinessRequest = null })
  }
  return currentBusinessRequest
}

const toProduct = (row: Record<string, unknown>, stock = 0): Product => ({
  id: String(row.id),
  name: String(row.name),
  sellingPrice: Number(row.sellingPrice ?? 0),
  costReference: Number(row.costReference ?? 0),
  averageCost: Number(row.averageCost ?? 0),
  minimumStock: Number(row.minimumStock ?? 0),
  stock,
})

export function ProductsView() {
  const { t } = useApp()
  const [open, setOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const { mutate: globalMutate } = useSWRConfig()

  const inventoryValue = useMemo(() => products.reduce((s, p) => s + Math.max(p.stock, 0) * p.averageCost, 0), [products])
  const loadProducts = async () => {
    const business = await getCurrentBusiness()
    setBusinessId(business.id)
    const response = await fetch(`/api/inventory?businessId=${encodeURIComponent(business.id)}`)
    const result = await response.json()
    if (!response.ok || !Array.isArray(result.products)) throw new Error(result.error ?? 'Unable to load products')
    setProducts(result.products.map((row: Record<string, unknown>) => toProduct(row, Number(row.stock ?? 0))))
  }

  useEffect(() => {
    loadProducts().catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load products')).finally(() => setLoading(false))
  }, [])

  const columns: Column<Product>[] = [
    { key: 'id', header: t('products.id'), cell: (p) => <IdCell>{p.id}</IdCell> },
    { key: 'name', header: t('common.product'), cell: (p) => <Link href={`/products/${encodeURIComponent(p.id)}`} className="block min-w-[220px] whitespace-normal break-words font-medium text-primary hover:underline">{p.name}</Link> },
    { key: 'price', header: t('products.sellingPrice'), align: 'right', cell: (p) => <Money value={p.sellingPrice} /> },
    { key: 'avg', header: t('products.averageCost'), align: 'right', cell: (p) => <Money value={p.averageCost} className="text-muted-foreground" /> },
    { key: 'ref', header: t('products.costReference'), align: 'right', cell: (p) => <Money value={p.costReference} className="text-muted-foreground" /> },
    {
      key: 'margin',
      header: t('products.margin'),
      sortValue: (p) => (p.sellingPrice - p.averageCost) / p.sellingPrice,
      align: 'right',
      cell: (p) => <span className="font-mono text-xs tabular-nums text-success">{formatPercent(((p.sellingPrice - p.averageCost) / p.sellingPrice) * 100)}</span>,
    },
    { key: 'stock', header: t('products.stock'), align: 'right', sortValue: (p) => p.stock, cell: (p) => <span className={`font-mono font-medium tabular-nums ${p.stock < 0 ? 'text-destructive' : ''}`}>{p.stock}</span> },
    { key: 'status', header: t('common.status'), sortValue: (p) => stockStatusOf(p), cell: (p) => <StockStatusBadge status={stockStatusOf(p)} /> },
  ]

  return (
    <>
      <PageHeader breadcrumbs={[{ label: t('nav.inventory') }, { label: t('nav.products') }]} title={t('products.title')} description={t('products.desc')} />
      <KpiGrid>
        <KpiCard label={t('products.total')} value={products.length} icon={Package} />
        <KpiCard label={t('products.inventoryValue')} value={loading ? '—' : formatIDR(inventoryValue)} icon={Boxes} tone="success" />
        <KpiCard label={t('stock.low')} value={products.filter((p) => stockStatusOf(p) === 'low').length} icon={TrendingDown} tone="warning" href="/stock" />
        <KpiCard label={t('stock.negative')} value={products.filter((p) => p.stock < 0).length} icon={AlertTriangle} tone="destructive" href="/stock" />
      </KpiGrid>
      <DataTable
        rows={products}
        columns={columns}
        getRowId={(p) => p.id}
        searchText={(p) => `${p.id} ${p.name}`}
        filters={[
          { value: 'all', label: t('common.all'), predicate: () => true },
          { value: 'low', label: t('stock.low'), predicate: (p) => stockStatusOf(p) === 'low' },
          { value: 'negative', label: t('stock.negative'), predicate: (p) => p.stock < 0 },
        ]}
        addLabel={t('products.add')}
        onAdd={() => {
          setEditingProduct(null)
          setOpen(true)
        }}
        contextActions={(product) => [
          { label: t('common.edit'), onSelect: () => { setEditingProduct(product); setOpen(true) } },
          { label: t('common.delete'), onSelect: () => setDeleteTarget(product) },
        ]}
      />
      <FormDialog
        key={editingProduct?.id ?? 'new-product'}
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) setEditingProduct(null)
        }}
        title={editingProduct ? t('common.edit') : t('products.add')}
        submitLabel={editingProduct ? t('common.save') : t('products.add')}
        fields={[
          { name: 'name', label: t('common.product'), defaultValue: editingProduct?.name ?? '' },
          { name: 'price', label: t('products.sellingPrice'), type: 'number', prefix: 'Rp', min: 0, half: true, defaultValue: String(editingProduct?.sellingPrice ?? '') },
          { name: 'cost', label: t('products.costReference'), type: 'number', prefix: 'Rp', min: 0, half: true, defaultValue: String(editingProduct?.costReference ?? '') },
          ...(!editingProduct ? [{ name: 'opening', label: t('mov.opening'), type: 'number' as const, min: 0, defaultValue: '0', half: true }] : []),
          { name: 'min', label: t('products.minimumStock'), type: 'number', min: 0, defaultValue: String(editingProduct?.minimumStock ?? 0), half: true },
        ]}
        onSubmit={async (values) => {
          if (!businessId) throw new Error('No business membership found')
          const editing = editingProduct
          const response = await fetch(
            editing ? `/api/products/${encodeURIComponent(editing.id)}` : '/api/products',
            {
              method: editing ? 'PATCH' : 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                ...(editing ? {} : { id: `P-${Date.now()}`, businessId }),
                name: values.name,
                sellingPrice: Number(values.price),
                costReference: Number(values.cost),
                ...(editing ? {} : {
                  averageCost: Number(values.cost),
                  openingStock: Number(values.opening || 0),
                  date: todayISODate(),
                }),
                minimumStock: Number(values.min || 0),
              }),
            },
          )
          const result = await response.json()
          if (!response.ok) throw new Error(result.error ?? 'Unable to save product')
          await loadProducts()
          await Promise.all([
            globalMutate(`/api/dashboard?businessId=${encodeURIComponent(businessId)}`),
            globalMutate(`/api/accounting?businessId=${encodeURIComponent(businessId)}`),
          ])
          setOpen(false)
          setEditingProduct(null)
          toast.success('Product saved')
        }}
        persisted
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(nextOpen) => { if (!nextOpen) setDeleteTarget(null) }}
        title={t('common.delete')}
        description={deleteTarget ? `Delete product ${deleteTarget.name}? Products with transaction or stock history cannot be deleted.` : ''}
        confirmLabel={t('common.delete')}
        onConfirm={() => {
          void (async () => {
            if (!deleteTarget || !businessId) return
            const response = await fetch(`/api/products/${encodeURIComponent(deleteTarget.id)}`, { method: 'DELETE' })
            const result = await response.json()
            if (!response.ok) throw new Error(result.error ?? 'Unable to delete product')
            setDeleteTarget(null)
            await loadProducts()
            await globalMutate(`/api/dashboard?businessId=${encodeURIComponent(businessId)}`)
            toast.success('Product deleted')
          })().catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to delete product'))
        }}
      />
    </>
  )
}

export function StockView() {
  const { t } = useApp()
  const [open, setOpen] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const loadStock = async () => {
    const business = await getCurrentBusiness()
    setBusinessId(business.id)
    const response = await fetch(`/api/inventory?businessId=${encodeURIComponent(business.id)}`)
    const result = await response.json()
    if (!response.ok || !Array.isArray(result.products)) throw new Error(result.error ?? 'Unable to load stock')
    setProducts(result.products.map((row: Record<string, unknown>) => toProduct(row, Number(row.stock ?? 0))))
  }
  useEffect(() => { loadStock().catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load stock')) }, [])
  const sorted = [...products].sort((a, b) => a.stock - b.stock)

  const columns: Column<Product>[] = [
    { key: 'name', header: t('common.product'), cell: (p) => (
      <span className="flex items-center gap-2 font-medium">
        {p.stock < 0 && <AlertTriangle className="size-3.5 text-destructive" />}
        {p.name}
      </span>
    ) },
    { key: 'stock', header: t('stock.current'), align: 'right', sortValue: (p) => p.stock, cell: (p) => <span className={`font-mono text-base font-semibold tabular-nums ${p.stock < 0 ? 'text-destructive' : p.stock === 0 ? 'text-muted-foreground' : ''}`}>{p.stock}</span> },
    { key: 'min', header: t('products.minimumStock'), align: 'right', cell: (p) => <span className="font-mono tabular-nums text-muted-foreground">{p.minimumStock}</span> },
    {
      key: 'level',
      header: '',
      sortable: false,
      cell: (p) => {
        const pct = p.minimumStock ? Math.max(0, Math.min((p.stock / (p.minimumStock * 2)) * 100, 100)) : p.stock > 0 ? 100 : 0
        const color = p.stock < 0 ? 'bg-destructive' : stockStatusOf(p) === 'low' ? 'bg-warning' : 'bg-success'
        return (
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
          </div>
        )
      },
    },
    { key: 'avg', header: t('products.averageCost'), align: 'right', cell: (p) => <Money value={p.averageCost} className="text-muted-foreground" /> },
    { key: 'value', header: t('stock.value'), align: 'right', cell: (p) => <Money value={Math.max(p.stock, 0) * p.averageCost} /> },
    { key: 'status', header: t('stock.stockStatus'), sortValue: (p) => stockStatusOf(p), cell: (p) => <StockStatusBadge status={stockStatusOf(p)} /> },
  ]

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: t('nav.inventory') }, { label: t('nav.stock') }]}
        title={t('stock.title')}
        description={t('stock.desc')}
        actions={
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <SlidersHorizontal />
            {t('stock.adjust')}
          </Button>
        }
      />
      <KpiGrid>
        <KpiCard label={t('stock.value')} value={formatIDR(products.reduce((sum, product) => sum + Math.max(product.stock, 0) * product.averageCost, 0))} icon={Boxes} tone="success" />
        <KpiCard label={t('reports.units')} value={products.reduce((s, p) => s + Math.max(p.stock, 0), 0)} icon={Package} />
        <KpiCard label={t('stock.low')} value={products.filter((p) => stockStatusOf(p) === 'low').length} icon={TrendingDown} tone="warning" />
        <KpiCard label={t('stock.negative')} value={products.filter((p) => p.stock < 0).length} icon={AlertTriangle} tone="destructive" />
      </KpiGrid>
      <DataTable
        rows={sorted}
        columns={columns}
        getRowId={(p) => p.id}
        searchText={(p) => `${p.id} ${p.name}`}
        filters={[
          { value: 'all', label: t('common.all'), predicate: () => true },
          { value: 'normal', label: t('stock.normal'), predicate: (p) => stockStatusOf(p) === 'normal' },
          { value: 'low', label: t('stock.low'), predicate: (p) => stockStatusOf(p) === 'low' },
          { value: 'negative', label: t('stock.negative'), predicate: (p) => p.stock < 0 },
        ]}
        rowHref={() => '/stock-movements'}
        deletable={false}
        editable={false}
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t('stock.adjust')}
        fields={[
          { name: 'product', label: t('common.product'), type: 'select', options: products.map((p) => ({ value: p.id, label: `${p.name} (${p.stock})` })) },
          { name: 'date', label: t('common.date'), type: 'date', defaultValue: TODAY, half: true },
          { name: 'qty', label: t('stock.newQty'), type: 'number', defaultValue: '-1', half: true },
          { name: 'reason', label: t('stock.reason'), type: 'textarea' },
        ]}
        onSubmit={async (values) => {
          if (!businessId) throw new Error('No business membership found')
          const response = await fetch('/api/stock-movements', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              id: `MOV-${Date.now()}`,
              businessId,
              productId: values.product,
              date: values.date,
              type: 'adjustment',
              qty: Number(values.qty),
              reference: values.reason || 'Manual adjustment',
            }),
          })
          if (!response.ok) throw new Error((await response.json()).error ?? 'Unable to save stock adjustment')
          await loadStock()
          setOpen(false)
          toast.success('Stock adjustment saved')
        }}
      />
    </>
  )
}

const movementTone: Record<MovementType, Tone> = {
  opening: 'neutral',
  purchase: 'success',
  sale: 'primary',
  replacement: 'warning',
  adjustment: 'warning',
  reversal: 'neutral',
}

export function StockMovementsView() {
  const { t } = useApp()
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [productNames, setProductNames] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    async function loadMovements() {
      try {
        const business = await getCurrentBusiness()
        const response = await fetch(`/api/inventory?businessId=${encodeURIComponent(business.id)}&includeMovements=1`)
        const result = await response.json()
        if (!response.ok || !Array.isArray(result.products) || !Array.isArray(result.movements)) {
          throw new Error(result.error ?? 'Failed to fetch inventory data')
        }
        setMovements(result.movements)
        setProductNames(Object.fromEntries(result.products.map((product: { id: string; name: string }) => [product.id, product.name])))
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Failed to load inventory data')
      }
    }
    loadMovements()
  }, [])

  const columns: Column<StockMovement>[] = [
    { key: 'id', header: t('movements.id'), cell: (m) => <IdCell>{m.id}</IdCell> },
    { key: 'date', header: t('common.date'), cell: (m) => <span className="font-mono text-xs text-muted-foreground">{formatDate(m.date)}</span> },
    { key: 'product', header: t('common.product'), cell: (m) => <span className="font-medium">{productNames[m.productId] ?? m.productId}</span> },
    { key: 'type', header: t('movements.type'), cell: (m) => <Pill tone={movementTone[m.type]}>{t(`mov.${m.type}`)}</Pill> },
    { key: 'ref', header: t('common.reference'), cell: (m) => <span className="font-mono text-xs text-muted-foreground">{m.reference}</span> },
    {
      key: 'change',
      header: t('movements.change'),
      sortValue: (m) => m.qty,
      align: 'right',
      cell: (m) => (
        <span className={`inline-flex items-center gap-1 font-mono font-medium tabular-nums ${m.qty > 0 ? 'text-success' : m.qty < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
          {m.qty > 0 ? <ArrowDownLeft className="size-3.5" /> : m.qty < 0 ? <ArrowUpRight className="size-3.5" /> : null}
          {m.qty > 0 ? `+${m.qty}` : m.qty}
        </span>
      ),
    },
  ]

  const inQty = movements.filter((m) => m.qty > 0 && m.type !== 'opening').reduce((s, m) => s + m.qty, 0)
  const outQty = movements.filter((m) => m.qty < 0).reduce((s, m) => s + m.qty, 0)

  return (
    <>
      <PageHeader breadcrumbs={[{ label: t('nav.inventory') }, { label: t('nav.stockMovements') }]} title={t('movements.title')} description={t('movements.desc')} />
      <KpiGrid>
        <KpiCard label={t('movements.count')} value={movements.length} icon={ArrowLeftRight} />
        <KpiCard label={t('movements.in')} value={`+${inQty}`} icon={ArrowDownLeft} tone="success" />
        <KpiCard label={t('movements.out')} value={outQty} icon={ArrowUpRight} tone="destructive" />
        <KpiCard label={t('mov.adjustment')} value={movements.filter((m) => m.type === 'adjustment').length} icon={SlidersHorizontal} tone="warning" />
      </KpiGrid>
      <DataTable
        rows={movements}
        columns={columns}
        getRowId={(m) => m.id}
        searchText={(m) => `${m.id} ${m.reference} ${productNames[m.productId] ?? m.productId}`}
        filters={[
          { value: 'all', label: t('common.all'), predicate: () => true },
          { value: 'purchase', label: t('mov.purchase'), predicate: (m) => m.type === 'purchase' },
          { value: 'sale', label: t('mov.sale'), predicate: (m) => m.type === 'sale' },
          { value: 'adj', label: t('mov.adjustment'), predicate: (m) => m.type === 'adjustment' },
          { value: 'rev', label: t('mov.reversal'), predicate: (m) => m.type === 'reversal' || m.type === 'replacement' },
        ]}
        rowHref={(m) => (m.reference.startsWith('ORD') ? `/orders/${m.reference}` : '')}
        editable={false}
        deletable={false}
        pageSize={15}
      />
    </>
  )
}
