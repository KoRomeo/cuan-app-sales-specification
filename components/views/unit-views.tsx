'use client'

import { AlertTriangle, ArrowRight, Boxes, Eye, Layers, Package, Pencil, Trash2, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { appToast as toast } from '@/lib/toast'
import { DataTable, IdCell, type Column } from '@/components/common/data-table'
import { FormDialog, selectClass, type FormField } from '@/components/common/form-dialog'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { KpiCard, KpiGrid } from '@/components/common/kpi-card'
import { PageHeader } from '@/components/common/page-header'
import { Pill } from '@/components/common/status-badge'
import { useApp } from '@/components/providers'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatIDR } from '@/lib/format'
import { cn } from '@/lib/utils'

type UnitRow = {
  id: string
  bigProductId: string
  bigProductName: string
  smallProductId: string
  smallProductName: string
  ratio: number
  status: string
  note: string | null
  date: string
  bigStock: number
  smallStock: number
  operationCount: number
}

type Summary = { totalRules: number; activeRules: number; operationsThisMonth: number; productsInvolved: number }
type ProductOption = { id: string; name: string }
type Operation = {
  id: string
  type: string
  qtyOut: number
  qtyIn: number
  valueMoved: string
  note: string | null
  date: string
}
type RuleDetail = {
  id: string
  ratio: number
  status: string
  note: string | null
  big: { id: string; name: string; stock: number; averageCost: number }
  small: { id: string; name: string; stock: number; averageCost: number }
  operations: Operation[]
}

const emptySummary: Summary = { totalRules: 0, activeRules: 0, operationsThisMonth: 0, productsInvolved: 0 }

async function getCurrentBusinessId(): Promise<string> {
  const response = await fetch('/api/businesses/current')
  const result = await response.json()
  if (!response.ok || !result?.id) throw new Error(result?.error ?? 'Unable to load business')
  return String(result.id)
}

function StockText({ value }: { value: number }) {
  return <span className={cn('font-mono font-medium tabular-nums', value < 0 && 'text-destructive')}>{value}</span>
}

export function UnitsView() {
  const { t } = useApp()
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [rules, setRules] = useState<UnitRow[]>([])
  const [summary, setSummary] = useState<Summary>(emptySummary)
  const [products, setProducts] = useState<ProductOption[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<UnitRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UnitRow | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)

  const load = async () => {
    const id = businessId ?? (await getCurrentBusinessId())
    setBusinessId(id)
    const [unitsResponse, productsResponse] = await Promise.all([
      fetch(`/api/units?businessId=${encodeURIComponent(id)}`),
      fetch(`/api/products?businessId=${encodeURIComponent(id)}`),
    ])
    const unitsResult = await unitsResponse.json()
    if (!unitsResponse.ok) throw new Error(unitsResult.error ?? t('units.loadError'))
    const productsResult = await productsResponse.json()
    if (!productsResponse.ok) throw new Error(productsResult.error ?? t('units.loadError'))
    setRules(unitsResult.rules as UnitRow[])
    setSummary(unitsResult.summary as Summary)
    setProducts((productsResult as ProductOption[]).map((p) => ({ id: p.id, name: p.name })))
  }

  useEffect(() => {
    load()
      .catch((error) => toast.error(error instanceof Error ? error.message : t('units.loadError')))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const columns: Column<UnitRow>[] = [
    { key: 'id', header: t('units.id'), cell: (r) => <IdCell>{r.id}</IdCell> },
    { key: 'big', header: t('units.fromProduct'), className: 'w-[30%]', sortValue: (r) => r.bigProductName, cell: (r) => <span className="block truncate font-medium" title={r.bigProductName}>{r.bigProductName}</span> },
    { key: 'small', header: t('units.toProduct'), className: 'w-[30%]', sortValue: (r) => r.smallProductName, cell: (r) => <span className="block truncate" title={r.smallProductName}>{r.smallProductName}</span> },
    { key: 'ratio', header: t('units.conversion'), align: 'right', sortValue: (r) => r.ratio, cell: (r) => <span className="font-mono tabular-nums">1 : {r.ratio}</span> },
    {
      key: 'status',
      header: t('common.status'),
      cell: (r) => (
        <Pill tone={r.status === 'active' ? 'success' : 'neutral'}>
          {r.status === 'active' ? t('units.active') : t('units.inactive')}
        </Pill>
      ),
    },
  ]

  const formFields: FormField[] = editing
    ? [
        {
          name: 'status',
          label: t('common.status'),
          type: 'select',
          options: [
            { value: 'active', label: t('units.active') },
            { value: 'inactive', label: t('units.inactive') },
          ],
          defaultValue: editing.status,
        },
        { name: 'note', label: t('units.note'), defaultValue: editing.note ?? '', required: false },
      ]
    : [
        {
          name: 'big',
          label: t('units.fromProduct'),
          type: 'select',
          options: products.map((p) => ({ value: p.id, label: p.name })),
          placeholder: t('units.selectProduct'),
          required: true,
        },
        {
          name: 'small',
          label: t('units.toProduct'),
          type: 'select',
          options: products.map((p) => ({ value: p.id, label: p.name })),
          placeholder: t('units.selectProduct'),
          required: true,
        },
        { name: 'ratio', label: t('units.ratio'), type: 'number', min: 1, defaultValue: '1', required: true },
        { name: 'note', label: t('units.note'), defaultValue: '', required: false },
      ]

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: t('nav.inventory') }, { label: t('nav.units') }]}
        title={t('units.title')}
        description={t('units.desc')}
      />
      <KpiGrid>
        <KpiCard label={t('units.total')} value={loading ? '—' : summary.totalRules} icon={Layers} />
        <KpiCard label={t('units.active')} value={loading ? '—' : summary.activeRules} icon={Boxes} tone="success" />
        <KpiCard label={t('units.opsMonth')} value={loading ? '—' : summary.operationsThisMonth} icon={TrendingUp} tone="warning" />
        <KpiCard label={t('units.productsInvolved')} value={loading ? '—' : summary.productsInvolved} icon={Package} />
      </KpiGrid>

      <DataTable
        rows={rules}
        columns={columns}
        loading={loading}
        getRowId={(r) => r.id}
        searchText={(r) => `${r.id} ${r.bigProductName} ${r.smallProductName}`}
        filters={[
          { value: 'all', label: t('common.all'), predicate: () => true },
          { value: 'active', label: t('units.active'), predicate: (r) => r.status === 'active' },
          { value: 'inactive', label: t('units.inactive'), predicate: (r) => r.status !== 'active' },
        ]}
        addLabel={t('units.add')}
        onAdd={() => {
          setEditing(null)
          setFormOpen(true)
        }}
        contextActions={(r) => [
          { label: t('units.view'), icon: Eye, onSelect: () => setDetailId(r.id) },
          { label: t('common.edit'), icon: Pencil, onSelect: () => { setEditing(r); setFormOpen(true) } },
          { label: t('common.delete'), icon: Trash2, onSelect: () => setDeleteTarget(r) },
        ]}
      />

      <FormDialog
        key={editing?.id ?? 'new-unit'}
        open={formOpen}
        onOpenChange={(nextOpen) => {
          setFormOpen(nextOpen)
          if (!nextOpen) setEditing(null)
        }}
        title={editing ? t('units.editTitle') : t('units.addTitle')}
        description={editing ? t('units.editDesc') : t('units.addDesc')}
        submitLabel={editing ? t('common.save') : t('units.add')}
        fields={formFields}
        onSubmit={async (values) => {
          if (!businessId) throw new Error(t('units.loadError'))
          const response = editing
            ? await fetch(`/api/units/${encodeURIComponent(editing.id)}`, {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ businessId, status: values.status, note: values.note }),
              })
            : await fetch('/api/units', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  businessId,
                  bigProductId: values.big,
                  smallProductId: values.small,
                  ratio: Number(values.ratio),
                  note: values.note,
                }),
              })
          const result = await response.json()
          if (!response.ok) throw new Error(result.error ?? t('units.saveError'))
          toast.success(t('units.saved'))
          await load()
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title={t('units.deleteTitle')}
        description={t('units.deleteDesc')}
        confirmLabel={t('common.delete')}
        onConfirm={async () => {
          if (!deleteTarget || !businessId) return
          const response = await fetch(
            `/api/units/${encodeURIComponent(deleteTarget.id)}?businessId=${encodeURIComponent(businessId)}`,
            { method: 'DELETE' },
          )
          const result = await response.json()
          if (!response.ok) {
            toast.error(result.error ?? t('units.deleteError'))
            return
          }
          toast.success(t('units.deleted'))
          setDeleteTarget(null)
          await load()
        }}
      />

      <Dialog open={!!detailId} onOpenChange={(open) => { if (!open) setDetailId(null) }}>
        <DialogContent className="max-w-3xl">
          {detailId && businessId && (
            <UnitDetailBody
              ruleId={detailId}
              businessId={businessId}
              onChanged={() => load().catch(() => undefined)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function UnitDetailBody({ ruleId, businessId, onChanged }: { ruleId: string; businessId: string; onChanged: () => void }) {
  const { t } = useApp()
  const [detail, setDetail] = useState<RuleDetail | null>(null)
  const [mode, setMode] = useState<'split' | 'combine'>('split')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    const response = await fetch(`/api/units/${encodeURIComponent(ruleId)}?businessId=${encodeURIComponent(businessId)}`)
    const result = await response.json()
    if (!response.ok) throw new Error(result.error ?? t('units.loadError'))
    setDetail(result as RuleDetail)
  }

  useEffect(() => {
    load().catch((error) => toast.error(error instanceof Error ? error.message : t('units.loadError')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleId])

  if (!detail) return <p className="py-8 text-center text-sm text-muted-foreground">{t('common.loading')}</p>

  const n = Number(quantity)
  const validQty = Number.isInteger(n) && n > 0
  const isSplit = mode === 'split'
  const source = isSplit ? detail.big : detail.small
  const target = isSplit ? detail.small : detail.big
  const qtyOut = validQty ? n : 0
  const qtyIn = validQty ? (isSplit ? n * detail.ratio : n / detail.ratio) : 0
  const combineInvalid = !isSplit && validQty && n % detail.ratio !== 0

  const submit = async () => {
    if (!validQty) return toast.error(t('units.qtyInvalid'))
    if (combineInvalid) return toast.error(t('units.combineMultiple').replace('{ratio}', String(detail.ratio)))
    setSubmitting(true)
    try {
      const response = await fetch(`/api/units/${encodeURIComponent(ruleId)}/operations`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ businessId, type: mode, quantity: n, note }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? t('units.opError'))
      toast.success(t('units.operationDone'))
      setQuantity('')
      setNote('')
      await load()
      onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('units.opError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('units.detailTitle')}</DialogTitle>
        <DialogDescription>
          {detail.big.name} <ArrowRight className="inline size-3" /> {detail.small.name} (1 : {detail.ratio})
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[detail.big, detail.small].map((p) => (
          <div key={p.id} className="rounded-md border p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('units.currentStock')}</p>
            <p className="mt-1 font-medium">{p.name}</p>
            <p className="mt-2 text-2xl font-semibold"><StockText value={p.stock} /></p>
            <p className="mt-1 text-xs text-muted-foreground">{t('units.avgCost')}: {formatIDR(p.averageCost)}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-md border p-4">
        <div className="mb-3 flex gap-2">
          <Button type="button" size="sm" variant={isSplit ? 'default' : 'outline'} onClick={() => setMode('split')}>
            {t('units.split')}
          </Button>
          <Button type="button" size="sm" variant={!isSplit ? 'default' : 'outline'} onClick={() => setMode('combine')}>
            {t('units.combine')}
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="unit-qty">{isSplit ? t('units.splitQty') : t('units.combineQty')}</Label>
            <Input id="unit-qty" type="number" min={1} step={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="unit-note">{t('units.reason')}</Label>
            <Input id="unit-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className={cn('text-sm', combineInvalid && 'text-destructive')}>
            {t('units.preview')}: {validQty ? `−${qtyOut} ${source.name} → +${qtyIn} ${target.name}` : '—'}
          </p>
          <Button type="button" onClick={submit} disabled={submitting || !validQty || combineInvalid}>
            {isSplit ? t('units.confirmSplit') : t('units.confirmCombine')}
          </Button>
        </div>
        {source.stock < qtyOut && validQty && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
            <AlertTriangle className="size-3.5" /> {t('units.notEnoughStock')}: {source.stock}
          </p>
        )}
      </div>

      <div className="mt-4">
        <p className="mb-2 text-sm font-medium">{t('units.history')}</p>
        <div className="max-h-64 overflow-y-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead>{t('units.operation')}</TableHead>
                <TableHead className="text-right">{t('units.qtyOut')}</TableHead>
                <TableHead className="text-right">{t('units.qtyIn')}</TableHead>
                <TableHead>{t('common.note')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.operations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">{t('units.noHistory')}</TableCell>
                </TableRow>
              )}
              {detail.operations.map((op) => (
                <TableRow key={op.id}>
                  <TableCell>{formatDate(op.date)}</TableCell>
                  <TableCell>{op.type === 'split' ? t('units.split') : t('units.combine')}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{op.qtyOut}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{op.qtyIn}</TableCell>
                  <TableCell className="text-muted-foreground">{op.note ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  )
}
