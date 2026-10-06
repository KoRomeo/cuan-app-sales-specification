'use client'

import { AlertTriangle, ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Boxes, Package, SlidersHorizontal, TrendingDown } from 'lucide-react'
import { useState } from 'react'
import { DataTable, IdCell, Money, type Column } from '@/components/common/data-table'
import { FormDialog } from '@/components/common/form-dialog'
import { KpiCard, KpiGrid } from '@/components/common/kpi-card'
import { PageHeader } from '@/components/common/page-header'
import { Pill, StockStatusBadge } from '@/components/common/status-badge'
import type { Tone } from '@/components/common/tone'
import { useApp } from '@/components/providers'
import { Button } from '@/components/ui/button'
import { type MovementType, type Product, productById, products, type StockMovement, stockMovements, stockStatusOf, TODAY } from '@/lib/data'
import { formatIDR, formatDate, formatPercent } from '@/lib/format'

const inventoryValue = () => products.reduce((s, p) => s + Math.max(p.stock, 0) * p.averageCost, 0)

export function ProductsView() {
  const { t } = useApp()
  const [open, setOpen] = useState(false)

  const columns: Column<Product>[] = [
    { key: 'id', header: t('products.id'), cell: (p) => <IdCell>{p.id}</IdCell> },
    { key: 'name', header: t('common.product'), cell: (p) => <span className="font-medium">{p.name}</span> },
    { key: 'price', header: t('products.sellingPrice'), align: 'right', cell: (p) => <Money value={p.sellingPrice} /> },
    { key: 'avg', header: t('products.averageCost'), align: 'right', cell: (p) => <Money value={p.averageCost} className="text-muted-foreground" /> },
    { key: 'ref', header: t('products.costReference'), align: 'right', cell: (p) => <Money value={p.costReference} className="text-muted-foreground" /> },
    {
      key: 'margin',
      header: t('products.margin'),
      align: 'right',
      cell: (p) => <span className="font-mono text-xs tabular-nums text-success">{formatPercent(((p.sellingPrice - p.averageCost) / p.sellingPrice) * 100)}</span>,
    },
    { key: 'stock', header: t('products.stock'), align: 'right', cell: (p) => <span className={`font-mono font-medium tabular-nums ${p.stock < 0 ? 'text-destructive' : ''}`}>{p.stock}</span> },
    { key: 'status', header: t('common.status'), cell: (p) => <StockStatusBadge status={stockStatusOf(p)} /> },
  ]

  return (
    <>
      <PageHeader breadcrumbs={[{ label: t('nav.inventory') }, { label: t('nav.products') }]} title={t('products.title')} description={t('products.desc')} />
      <KpiGrid>
        <KpiCard label={t('products.total')} value={products.length} icon={Package} />
        <KpiCard label={t('products.inventoryValue')} value={formatIDR(inventoryValue())} icon={Boxes} tone="success" />
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
        onAdd={() => setOpen(true)}
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t('products.add')}
        fields={[
          { name: 'name', label: t('common.product') },
          { name: 'price', label: t('products.sellingPrice'), type: 'number', prefix: 'Rp', half: true },
          { name: 'cost', label: t('products.costReference'), type: 'number', prefix: 'Rp', half: true },
          { name: 'opening', label: t('mov.opening'), type: 'number', defaultValue: '0', half: true },
          { name: 'min', label: t('products.minimumStock'), type: 'number', defaultValue: '0', half: true },
        ]}
      />
    </>
  )
}

export function StockView() {
  const { t } = useApp()
  const [open, setOpen] = useState(false)
  const sorted = [...products].sort((a, b) => a.stock - b.stock)

  const columns: Column<Product>[] = [
    { key: 'name', header: t('common.product'), cell: (p) => (
      <span className="flex items-center gap-2 font-medium">
        {p.stock < 0 && <AlertTriangle className="size-3.5 text-destructive" />}
        {p.name}
      </span>
    ) },
    { key: 'stock', header: t('stock.current'), align: 'right', cell: (p) => <span className={`font-mono text-base font-semibold tabular-nums ${p.stock < 0 ? 'text-destructive' : p.stock === 0 ? 'text-muted-foreground' : ''}`}>{p.stock}</span> },
    { key: 'min', header: t('products.minimumStock'), align: 'right', cell: (p) => <span className="font-mono tabular-nums text-muted-foreground">{p.minimumStock}</span> },
    {
      key: 'level',
      header: '',
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
    { key: 'status', header: t('stock.stockStatus'), cell: (p) => <StockStatusBadge status={stockStatusOf(p)} /> },
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
        <KpiCard label={t('stock.value')} value={formatIDR(inventoryValue())} icon={Boxes} tone="success" />
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

  const columns: Column<StockMovement>[] = [
    { key: 'id', header: t('movements.id'), cell: (m) => <IdCell>{m.id}</IdCell> },
    { key: 'date', header: t('common.date'), cell: (m) => <span className="font-mono text-xs text-muted-foreground">{formatDate(m.date)}</span> },
    { key: 'product', header: t('common.product'), cell: (m) => <span className="font-medium">{productById(m.productId)?.name}</span> },
    { key: 'type', header: t('movements.type'), cell: (m) => <Pill tone={movementTone[m.type]}>{t(`mov.${m.type}`)}</Pill> },
    { key: 'ref', header: t('common.reference'), cell: (m) => <span className="font-mono text-xs text-muted-foreground">{m.reference}</span> },
    {
      key: 'change',
      header: t('movements.change'),
      align: 'right',
      cell: (m) => (
        <span className={`inline-flex items-center gap-1 font-mono font-medium tabular-nums ${m.qty > 0 ? 'text-success' : m.qty < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
          {m.qty > 0 ? <ArrowDownLeft className="size-3.5" /> : m.qty < 0 ? <ArrowUpRight className="size-3.5" /> : null}
          {m.qty > 0 ? `+${m.qty}` : m.qty}
        </span>
      ),
    },
  ]

  const inQty = stockMovements.filter((m) => m.qty > 0 && m.type !== 'opening').reduce((s, m) => s + m.qty, 0)
  const outQty = stockMovements.filter((m) => m.qty < 0).reduce((s, m) => s + m.qty, 0)

  return (
    <>
      <PageHeader breadcrumbs={[{ label: t('nav.inventory') }, { label: t('nav.stockMovements') }]} title={t('movements.title')} description={t('movements.desc')} />
      <KpiGrid>
        <KpiCard label={t('movements.count')} value={stockMovements.length} icon={ArrowLeftRight} />
        <KpiCard label={t('movements.in')} value={`+${inQty}`} icon={ArrowDownLeft} tone="success" />
        <KpiCard label={t('movements.out')} value={outQty} icon={ArrowUpRight} tone="destructive" />
        <KpiCard label={t('mov.adjustment')} value={stockMovements.filter((m) => m.type === 'adjustment').length} icon={SlidersHorizontal} tone="warning" />
      </KpiGrid>
      <DataTable
        rows={stockMovements}
        columns={columns}
        getRowId={(m) => m.id}
        searchText={(m) => `${m.id} ${m.reference} ${productById(m.productId)?.name}`}
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
