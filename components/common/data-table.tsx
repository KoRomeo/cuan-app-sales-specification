'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, Columns3, Filter, CheckSquare, Eye, MoreHorizontal, Pencil, Plus, Search, Trash2, type LucideIcon } from 'lucide-react'
import { Children, isValidElement, useMemo, useState, type ReactNode } from 'react'
import { appToast as toast } from '@/lib/toast'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { useApp } from '@/components/providers'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: string
  header: string
  cell: (row: T) => React.ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
  sortable?: boolean
  sortValue?: (row: T) => string | number | null | undefined
  filterable?: boolean
}

type ActionKind = 'view' | 'edit' | 'delete' | 'cancel' | 'other'

function actionKind(label: string): ActionKind {
  const value = label.trim().toLocaleLowerCase()
  if (/^(view|lihat|detail|preview|pratinjau|tinjau)(\b|$)/.test(value)) return 'view'
  if (/^(edit|ubah|sunting)(\b|$)/.test(value)) return 'edit'
  if (/^(delete|hapus|remove)(\b|$)/.test(value)) return 'delete'
  if (/^(cancel|batalkan|batal)(\b|$)/.test(value)) return 'cancel'
  return 'other'
}

type SortKey = number | string
type SortState = { key: string; dir: 'asc' | 'desc' } | null

function nodeText(node: ReactNode): string | number {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return node
  if (Array.isArray(node)) return node.map(nodeText).join(' ').trim()
  if (isValidElement(node)) {
    const props = node.props as { value?: unknown; children?: ReactNode }
    if (typeof props.value === 'number') return props.value
    return Children.toArray(props.children).map(nodeText).join(' ').trim()
  }
  return ''
}

function toSortKey(raw: string | number | null | undefined): SortKey | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number') return raw
  const text = raw.trim()
  if (text === '' || text === '—') return null
  const date = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text)
  if (date) return Number(`${date[3]}${date[2]}${date[1]}`)
  const amount = text.replace(/^(-?)\s*Rp\s*/i, '$1')
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(amount)) return Number(amount.replace(/\./g, '').replace(',', '.'))
  if (/^-?\d+(\.\d+)?$/.test(amount)) return Number(amount)
  return text
}

function compareKeys(a: SortKey | null, b: SortKey | null, dir: 'asc' | 'desc') {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  const result =
    typeof a === 'number' && typeof b === 'number'
      ? a - b
      : typeof a === 'number'
        ? -1
        : typeof b === 'number'
          ? 1
          : a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  return dir === 'asc' ? result : -result
}

export interface FilterOption<T> {
  value: string
  label: string
  predicate: (row: T) => boolean
}

export interface RowAction {
  label: string
  icon?: LucideIcon
  href?: string
  onSelect?: () => void
  disabled?: boolean
}

interface DataTableProps<T> {
  rows: T[]
  columns: Column<T>[]
  loading?: boolean
  error?: string
  getRowId: (row: T) => string
  searchText: (row: T) => string
  filters?: FilterOption<T>[]
  initialFilter?: string
  addLabel?: string
  onAdd?: () => void
  rowHref?: (row: T) => string
  onRowClick?: (row: T) => void
  contextActions?: (row: T) => RowAction[]
  editable?: boolean
  deletable?: boolean
  pageSize?: number
  toolbarExtra?: React.ReactNode
  footer?: React.ReactNode
  scrollable?: boolean
  selectable?: boolean
  selectedRowIds?: string[]
  onSelectedRowIdsChange?: (ids: string[]) => void
}

export function DataTable<T>({
  rows,
  columns,
  loading = false,
  error,
  getRowId,
  searchText,
  filters,
  initialFilter = 'all',
  addLabel,
  onAdd,
  rowHref,
  onRowClick,
  contextActions,
  editable = true,
  deletable = true,
  pageSize = 10,
  toolbarExtra,
  footer,
  selectable = false,
  selectedRowIds = [],
  onSelectedRowIdsChange,
}: DataTableProps<T>) {
  const { t } = useApp()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState(initialFilter)
  const [page, setPage] = useState(1)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [sort, setSort] = useState<SortState>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [filterColumn, setFilterColumn] = useState('')
  const [columnValues, setColumnValues] = useState<Record<string, string[]>>({})
  const [datePreset, setDatePreset] = useState<Record<string, string>>({})
  const [dateFrom, setDateFrom] = useState<Record<string, string>>({})
  const [dateTo, setDateTo] = useState<Record<string, string>>({})
  const isDateColumn = (column: Column<T>) => /date|tanggal|created|updated/i.test(column.key + ' ' + column.header)
  const valueFor = (row: T, column: Column<T>) => {
    const raw = column.sortValue ? column.sortValue(row) : nodeText(column.cell(row))
    if (raw === null || raw === undefined) return ''
    const value = String(raw).trim()
    const date = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
    return date ? date[3] + '-' + date[2] + '-' + date[1] : value
  }
  const isFilterableColumn = (column: Column<T>) => column.filterable ?? /(^|[ _-])(date|tanggal|created|updated|status|paymentstatus|payment_status|paidstatus|paid_status|dueDate|due_date|method|type)([ _-]|$)/i.test(column.key + ' ' + column.header)
  const filterableColumns = columns.filter(isFilterableColumn)
  const selectedColumn = filterableColumns.find((column) => column.key === filterColumn)
  const columnOptions = selectedColumn ? [...new Set(rows.map((row) => valueFor(row, selectedColumn)).filter(Boolean))].sort((a,b) => a.localeCompare(b, undefined, { numeric: true })) : []
  const activeColumnFilterCount = Object.values(columnValues).reduce((sum, values) => sum + values.length, 0) + Object.keys(dateFrom).filter(key => dateFrom[key]).length + Object.keys(dateTo).filter(key => dateTo[key]).length + Object.values(datePreset).filter(value => value !== 'all').length

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const activeFilter = filters?.find((f) => f.value === filter)
    const matched = rows.filter((r) => {
      if (activeFilter && !activeFilter.predicate(r)) return false
      for (const column of columns) {
        const selected = columnValues[column.key] ?? []
        if (selected.length && !selected.includes(valueFor(r, column))) return false
        if (isDateColumn(column)) {
          const value = valueFor(r, column)
          const preset = datePreset[column.key]
          if (preset && preset !== 'all' && value) {
            const today = new Date(); today.setHours(0,0,0,0)
            const start = new Date(today)
            if (preset === 'week') { const day = (today.getDay() + 6) % 7; start.setDate(today.getDate() - day) }
            if (preset === 'month') start.setDate(1)
            const end = new Date(today)
            if (preset === 'week') end.setDate(start.getDate() + 6)
            if (preset === 'month') end.setMonth(end.getMonth() + 1, 0)
            const d = new Date(value + 'T00:00:00')
            if (d < start || d > end) return false
          }
          if (dateFrom[column.key] && value < dateFrom[column.key]) return false
          if (dateTo[column.key] && value > dateTo[column.key]) return false
        }
      }
      if (q && !searchText(r).toLowerCase().includes(q)) return false
      return true
    })
    const sortColumn = sort ? columns.find((c) => c.key === sort.key) : undefined
    if (!sort || !sortColumn) return matched
    const keyOf = (row: T) => toSortKey(sortColumn.sortValue ? sortColumn.sortValue(row) : nodeText(sortColumn.cell(row)))
    return matched
      .map((row) => ({ row, key: keyOf(row) }))
      .sort((a, b) => compareKeys(a.key, b.key, sort.dir))
      .map((entry) => entry.row)
  }, [rows, query, filter, filters, searchText, sort, columns, columnValues, datePreset, dateFrom, dateTo])

  function toggleSort(key: string) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' }
      if (prev.dir === 'asc') return { key, dir: 'desc' }
      return null
    })
    setPage(1)
  }

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, pageCount)
  const start = (current - 1) * pageSize
  const visibleRows = filtered.slice(start, start + pageSize)
  const visibleColumns = columns.filter((c) => !hidden.has(c.key))
  const visibleColumnCount = visibleColumns.length
  const hasActions = Boolean(rowHref || contextActions || editable || deletable)

  return (
    <div className="rounded-md border bg-card shadow-xs">
      <div className="flex flex-col gap-3 border-b p-3 md:flex-row md:items-center md:p-4">
        <div className="relative w-full md:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            placeholder={t('common.search')}
            aria-label={t('common.search')}
            className="h-8 w-full rounded-lg border border-input bg-transparent pl-8 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 dark:bg-input/30"
          />
        </div>

        <div className="flex items-center gap-2 md:ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
              <Filter className="size-4" />
              {activeColumnFilterCount > 0 || filter !== initialFilter ? 'Filtered' : (filters?.find((f) => f.value === filter)?.label ?? 'All')}
              {activeColumnFilterCount > 0 && <span className="rounded bg-primary/10 px-1.5 text-xs text-primary">{activeColumnFilterCount}</span>}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 max-h-[min(70vh,480px)] overflow-y-auto p-3">
              {!selectedColumn ? (
                <div className="space-y-1">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Filter by</label>
                  {filterableColumns.map(column => {
                    const active = (columnValues[column.key]?.length ?? 0) > 0 || Boolean(dateFrom[column.key] || dateTo[column.key] || (datePreset[column.key] && datePreset[column.key] !== 'all'))
                    return <button type="button" key={column.key} onClick={() => setFilterColumn(column.key)} className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent"><span>{column.header}</span><span className="text-xs text-muted-foreground">{active ? 'Filtered' : '›'}</span></button>
                  })}
                  {filterableColumns.length === 0 && <p className="px-2 py-4 text-xs text-muted-foreground">No filterable fields on this table.</p>}
                </div>
              ) : (
                <>
                  <button type="button" onClick={() => setFilterColumn('')} className="mb-3 flex items-center gap-2 text-sm font-medium hover:text-primary">‹ All filters <span className="text-muted-foreground">/ {selectedColumn.header}</span></button>
                  {isDateColumn(selectedColumn) ? (
                <div className="space-y-3">
                  <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Quick date range</label>
                    <select value={datePreset[selectedColumn.key] ?? 'all'} onChange={event => { setDatePreset(prev => ({...prev,[selectedColumn.key]:event.target.value})); setPage(1) }} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                      <option value="all">Any date</option><option value="week">This week (Mon–Sun)</option><option value="month">This month</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs text-muted-foreground">Start date<input type="date" value={dateFrom[selectedColumn.key] ?? ''} onChange={event => { setDateFrom(prev=>({...prev,[selectedColumn.key]:event.target.value})); setDatePreset(prev=>({...prev,[selectedColumn.key]:'all'})); setPage(1) }} className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm text-foreground" /></label>
                    <label className="text-xs text-muted-foreground">End date<input type="date" value={dateTo[selectedColumn.key] ?? ''} onChange={event => { setDateTo(prev=>({...prev,[selectedColumn.key]:event.target.value})); setDatePreset(prev=>({...prev,[selectedColumn.key]:'all'})); setPage(1) }} className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm text-foreground" /></label>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => { setDatePreset(prev=>({...prev,[selectedColumn.key]:'all'})); setDateFrom(prev=>({...prev,[selectedColumn.key]:''})); setDateTo(prev=>({...prev,[selectedColumn.key]:''})); setPage(1) }}>Clear date filter</Button>
                </div>
              ) : (
                <div>
                  <div className="mb-2 flex items-center justify-between"><label className="text-xs font-medium text-muted-foreground">Select one or more values</label><button type="button" className="text-xs text-primary" onClick={() => { setColumnValues(prev=>({...prev,[selectedColumn.key]:[]})); setPage(1) }}>Clear</button></div>
                  <div className="max-h-56 space-y-1 overflow-y-auto">
                    {columnOptions.map(value => <label key={value} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"><input type="checkbox" disabled={value.trim().toLowerCase() === "delivered"} checked={(columnValues[selectedColumn.key] ?? []).includes(value)} onChange={event => { setColumnValues(prev=>({...prev,[selectedColumn.key]:event.target.checked ? [...(prev[selectedColumn.key] ?? []),value] : (prev[selectedColumn.key] ?? []).filter(item=>item!==value)})); setPage(1) }} /><span className={cn("truncate", value.trim().toLowerCase() === "delivered" && "text-muted-foreground")}>{value}{value.trim().toLowerCase() === "delivered" ? " (unavailable)" : ""}</span><span className="ml-auto text-xs text-muted-foreground">{rows.filter(row=>valueFor(row,selectedColumn)===value).length}</span></label>)}
                    {columnOptions.length===0 && <p className="px-2 py-4 text-xs text-muted-foreground">No values available</p>}
                  </div>
                </div>
              )}
                </>
              )}
              <div className="mt-3 border-t pt-3"><Button size="sm" variant="outline" className="w-full" onClick={() => { setColumnValues({}); setDatePreset({}); setDateFrom({}); setDateTo({}); setFilter(initialFilter); setQuery(''); setPage(1) }}>Clear filters</Button></div>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
              <Columns3 />
              {t('common.columns')}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t('common.columns')}</DropdownMenuLabel>
                {columns.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.key}
                    checked={!hidden.has(c.key)}
                    disabled={!hidden.has(c.key) && visibleColumnCount <= 1}
                    onCheckedChange={(checked) => {
                      setHidden((prev) => {
                        const next = new Set(prev)
                        if (checked) next.delete(c.key)
                        else next.add(c.key)
                        return next
                      })
                    }}
                  >
                    {c.header}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {toolbarExtra}
          {addLabel && (
            <Button type="button" size="sm" className="h-8 gap-1.5 px-2.5 text-xs sm:px-3" disabled={!onAdd} onClick={onAdd}>
              <Plus />
              {addLabel}
            </Button>
          )}
        </div>
      </div>

      <div className={'overflow-x-auto'}>
        <table aria-label={t('common.dataTable')} aria-busy={loading} className={cn('w-max min-w-full table-auto text-sm')}>
          <thead>
            <tr className="border-b bg-muted/40">
              {selectable && selectionMode && <th className="w-10 px-3"><input aria-label={t('common.selectAllRows')} type="checkbox" checked={visibleRows.length > 0 && visibleRows.every((row) => selectedRowIds.includes(getRowId(row)))} onChange={(event) => { const ids = new Set(selectedRowIds); visibleRows.forEach((row) => event.target.checked ? ids.add(getRowId(row)) : ids.delete(getRowId(row))); onSelectedRowIdsChange?.([...ids]) }} /></th>}
              {visibleColumns.map((c) => {
                const sortable = c.sortable !== false
                const direction = sort?.key === c.key ? sort.dir : null
                const SortIcon = direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ArrowUpDown
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : sortable ? 'none' : undefined}
                    className={cn(
                      'h-10 whitespace-nowrap px-5 text-xs font-medium uppercase tracking-wider text-muted-foreground',
                      c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left',
                      c.className,
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className={cn(
                          'group/sort -mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 uppercase tracking-wider transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
                          direction && 'text-foreground',
                        )}
                      >
                        {c.header}
                        <SortIcon className={cn('size-3 shrink-0', direction ? 'text-primary' : 'opacity-40 group-hover/sort:opacity-100')} aria-hidden="true" />
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                )
              })}
              {hasActions && (
                <th scope="col" className="h-10 w-12 px-4">
                  <span className="sr-only">{t('common.actions')}</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td colSpan={Math.max(1, visibleColumns.length + (hasActions ? 1 : 0))} className="px-4 py-12 text-center text-sm text-destructive">
                  <p role="alert">{error}</p>
                </td>
              </tr>
            )}
            {!error && loading && (
              <tr>
                <td colSpan={Math.max(1, visibleColumns.length + (hasActions ? 1 : 0))} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  <p role="status" aria-live="polite">{t('common.loading')}</p>
                </td>
              </tr>
            )}
            {!error && !loading && visibleRows.length === 0 && (
              <tr>
                <td colSpan={Math.max(1, visibleColumns.length + (hasActions ? 1 : 0))} className="px-4 py-12 text-center text-sm">
                  {rows.length === 0 && query.trim() === '' && filter === initialFilter ? (
                    <div className="mx-auto grid max-w-sm gap-1">
                      <p className="font-medium text-foreground">{t('common.emptyTitle')}</p>
                      <p className="text-muted-foreground">{t('common.emptyDescription')}</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">{t('common.noResults')}</p>
                  )}
                </td>
              </tr>
            )}
            {visibleRows.map((row) => {
              const href = rowHref?.(row)
              const extra = contextActions?.(row) ?? []
              return (
                <tr
                  key={getRowId(row)}
                  onClick={() => {
                    if (selectable && selectionMode) {
                      const id = getRowId(row)
                      const ids = new Set(selectedRowIds)
                      ids.has(id) ? ids.delete(id) : ids.add(id)
                      onSelectedRowIdsChange?.([...ids])
                      return
                    }
                    if (href) router.push(href)
                    else onRowClick?.(row)
                  }}
                  className={cn('border-b transition-colors last:border-0 hover:bg-muted/40', (href || onRowClick || (selectable && selectionMode)) && 'cursor-pointer', selectable && selectionMode && selectedRowIds.includes(getRowId(row)) && 'bg-primary/5')}
                >
                  {selectable && selectionMode && <td className="w-10 px-3"><input aria-label={t('common.selectRow', { id: getRowId(row) })} type="checkbox" checked={selectedRowIds.includes(getRowId(row))} onClick={(event) => event.stopPropagation()} onChange={(event) => { const ids = new Set(selectedRowIds); event.target.checked ? ids.add(getRowId(row)) : ids.delete(getRowId(row)); onSelectedRowIdsChange?.([...ids]) }} /></td>}
                  {visibleColumns.map((c, index) => {
                    const content = c.cell(row)
                    return (
                      <td
                        key={c.key}
                        className={cn(
                          'h-12 whitespace-nowrap px-5',
                          c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left',
                          c.className,
                        )}
                      >
                        <div className="whitespace-nowrap" title={nodeText(content) !== '' ? String(nodeText(content)) : undefined}>
                        {href && index === 0 ? (
                          <Link
                            href={href}
                            aria-label={`${t('common.view')} ${getRowId(row)}`}
                            onClick={(event) => event.stopPropagation()}
                            className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            {content}
                          </Link>
                        ) : content}
                        </div>
                      </td>
                    )
                  })}
                  {hasActions && (
                    <td className="px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {(href || extra.length > 0 || editable || deletable) && <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t('common.actions')} />}>
                          <MoreHorizontal />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {href && !extra.some((action) => actionKind(action.label) === 'view') && (
                            <DropdownMenuItem className="cursor-pointer transition-colors hover:bg-blue-50 hover:text-blue-700 focus:bg-blue-50 focus:text-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 dark:focus:bg-blue-950/40" onClick={() => router.push(href)}>
                              <Eye />
                              {t('common.view')}
                            </DropdownMenuItem>
                          )}
                          {editable && !extra.some((action) => actionKind(action.label) === 'edit') && (
                            <DropdownMenuItem className="cursor-pointer transition-colors hover:bg-blue-50 hover:text-blue-700 focus:bg-blue-50 focus:text-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 dark:focus:bg-blue-950/40" onClick={() => toast.info(t('form.editUnavailable'))}>
                              <Pencil />
                              {t('common.edit')}
                            </DropdownMenuItem>
                          )}
                          {selectable && <DropdownMenuItem onClick={() => setSelectionMode((current) => !current)} className="cursor-pointer transition-colors hover:bg-blue-50 hover:text-blue-700 focus:bg-blue-50 focus:text-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"><CheckSquare className="size-4" />{selectionMode ? t('common.hideSelection') : t('common.select')}</DropdownMenuItem>}
                          {extra.length > 0 && (href || editable || selectable) && <DropdownMenuSeparator />}
                          {extra.map((a) => {
                            const kind = actionKind(a.label)
                            const destructive = kind === 'delete' || kind === 'cancel'
                            const label = kind === 'view' ? t('common.view') : kind === 'edit' ? t('common.edit') : kind === 'delete' ? t('common.delete') : kind === 'cancel' ? t('common.cancel') : a.label
                            const Icon = a.icon ?? (destructive ? Trash2 : kind === 'edit' ? Pencil : kind === 'view' ? Eye : undefined)
                            return (
                              <DropdownMenuItem
                                key={a.label}
                                variant={destructive ? 'destructive' : 'default'}
                                className={destructive
                                  ? 'cursor-pointer transition-colors hover:bg-pink-100 hover:text-red-700 focus:bg-pink-100 focus:text-red-700 dark:hover:bg-red-950/50 dark:hover:text-red-300 dark:focus:bg-red-950/50'
                                  : kind !== 'other'
                                    ? 'cursor-pointer transition-colors hover:bg-blue-50 hover:text-blue-700 focus:bg-blue-50 focus:text-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 dark:focus:bg-blue-950/40'
                                    : undefined}
                                disabled={a.disabled}
                                onClick={() => {
                                  if (a.onSelect) a.onSelect()
                                  else if (a.href) router.push(a.href)
                                }}
                              >
                                {Icon && <Icon className="size-4" />}
                                {label}
                              </DropdownMenuItem>
                            )
                          })}
                          {deletable && !extra.some((action) => actionKind(action.label) === 'delete') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                                <Trash2 />
                                {t('common.delete')}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
          {footer}
        </table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground sm:flex-row">
        <p>
          {t('common.showing')}{' '}
          <span className="font-mono font-medium text-foreground tabular-nums">
            {filtered.length === 0 ? 0 : start + 1}–{Math.min(start + pageSize, filtered.length)}
          </span>{' '}
          {t('common.of')} <span className="font-mono font-medium text-foreground tabular-nums">{filtered.length}</span>
        </p>
        <nav aria-label={t('common.pagination')} className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" disabled={current === 1} onClick={() => setPage(current - 1)} aria-label={t('common.previous')}>
            <ChevronLeft />
          </Button>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
            <Button
              key={n}
              variant={n === current ? 'outline' : 'ghost'}
              size="icon-sm"
              onClick={() => setPage(n)}
              aria-current={n === current ? 'page' : undefined}
              className="font-mono"
            >
              {n}
            </Button>
          ))}
          <Button variant="ghost" size="icon-sm" disabled={current === pageCount} onClick={() => setPage(current + 1)} aria-label={t('common.next')}>
            <ChevronRight />
          </Button>
        </nav>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('deleteDialog.previewTitle')}
        description={t('deleteDialog.previewBody')}
        confirmLabel={t('common.previewAction')}
        previewOnly
        onConfirm={() => toast.info(t('form.deleteUnavailable'))}
      />
    </div>
  )
}

export function Money({ value, className }: { value: number; className?: string }) {
  return <span className={cn('whitespace-nowrap font-mono tabular-nums', className)}>{formatMoney(value)}</span>
}

function formatMoney(v: number) {
  const n = new Intl.NumberFormat('id-ID').format(Math.abs(Math.round(v)))
  return v < 0 ? `-Rp${n}` : `Rp${n}`
}

export function IdCell({ children }: { children: React.ReactNode }) {
  return <span className="whitespace-nowrap font-mono text-xs font-medium text-primary">{children}</span>
}
