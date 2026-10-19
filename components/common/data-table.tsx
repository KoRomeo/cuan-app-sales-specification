'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, Columns3, Eye, MoreHorizontal, Pencil, Plus, Search, Trash2, type LucideIcon } from 'lucide-react'
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
  contextActions?: (row: T) => RowAction[]
  editable?: boolean
  deletable?: boolean
  pageSize?: number
  toolbarExtra?: React.ReactNode
  footer?: React.ReactNode
  scrollable?: boolean
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
  contextActions,
  editable = true,
  deletable = true,
  pageSize = 10,
  toolbarExtra,
  footer,
  scrollable = true,
}: DataTableProps<T>) {
  const { t } = useApp()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState(initialFilter)
  const [page, setPage] = useState(1)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [sort, setSort] = useState<SortState>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const activeFilter = filters?.find((f) => f.value === filter)
    const matched = rows.filter((r) => {
      if (activeFilter && !activeFilter.predicate(r)) return false
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
  }, [rows, query, filter, filters, searchText, sort, columns])

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
          {toolbarExtra}
          {filters && filters.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="min-w-36 justify-between gap-3" />}>
                <span className="flex items-center gap-2">
                  <span>{filters.find((f) => f.value === filter)?.label ?? t('common.filter')}</span>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">{rows.filter((row) => (filters.find((f) => f.value === filter) ?? filters[0]).predicate(row)).length}</span>
                </span>
                <ChevronDown className="size-4 opacity-70" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{t('common.filter')}</DropdownMenuLabel>
                  {filters.map((f) => {
                    const count = rows.filter(f.predicate).length
                    const active = filter === f.value
                    return (
                      <DropdownMenuItem
                        key={f.value}
                        onClick={() => { setFilter(f.value); setPage(1) }}
                        className={cn('flex cursor-pointer items-center justify-between gap-4', active && 'bg-accent')}
                      >
                        <span>{f.label}</span>
                        <span className="font-mono text-xs text-muted-foreground tabular-nums">{count}</span>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
          {addLabel && (
            <Button type="button" size="sm" disabled={!onAdd} onClick={onAdd}>
              <Plus />
              {addLabel}
            </Button>
          )}
        </div>
      </div>

      <div className={scrollable ? 'overflow-x-auto' : 'overflow-x-hidden'}>
        <table aria-label={t('common.dataTable')} aria-busy={loading} className={cn('w-full text-sm', scrollable ? 'min-w-[720px]' : 'table-fixed')}>
          <thead>
            <tr className="border-b bg-muted/40">
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
                  onClick={href ? () => router.push(href) : undefined}
                  className={cn('border-b transition-colors last:border-0 hover:bg-muted/40', href && 'cursor-pointer')}
                >
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
                          {href && (
                            <DropdownMenuItem className="cursor-pointer transition-colors hover:bg-blue-50 hover:text-blue-700 focus:bg-blue-50 focus:text-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 dark:focus:bg-blue-950/40" onClick={() => router.push(href)}>
                              <Eye />
                              {t('common.view')}
                            </DropdownMenuItem>
                          )}
                          {editable && !extra.some((action) => action.label === t('common.edit')) && (
                            <DropdownMenuItem className="cursor-pointer transition-colors hover:bg-blue-50 hover:text-blue-700 focus:bg-blue-50 focus:text-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 dark:focus:bg-blue-950/40" onClick={() => toast.info(t('form.editUnavailable'))}>
                              <Pencil />
                              {t('common.edit')}
                            </DropdownMenuItem>
                          )}
                          {extra.length > 0 && <DropdownMenuSeparator />}
                          {extra.map((a) => {
                            const Icon = a.icon
                            return (
                              <DropdownMenuItem
                                key={a.label}
                                variant={/cancel|delete|remove/i.test(a.label) ? 'destructive' : 'default'}
                                className={/cancel|delete|remove/i.test(a.label)
                                  ? 'cursor-pointer transition-colors hover:bg-pink-100 hover:text-red-700 focus:bg-pink-100 focus:text-red-700 dark:hover:bg-red-950/50 dark:hover:text-red-300 dark:focus:bg-red-950/50'
                                  : /view|preview|edit/i.test(a.label)
                                    ? 'cursor-pointer transition-colors hover:bg-blue-50 hover:text-blue-700 focus:bg-blue-50 focus:text-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 dark:focus:bg-blue-950/40'
                                    : undefined}
                                disabled={a.disabled}
                                onClick={() => {
                                  if (a.onSelect) a.onSelect()
                                  else if (a.href) router.push(a.href)
                                }}
                              >
                                {Icon ? <Icon className="size-4" /> : /cancel|delete|remove/i.test(a.label) ? <Trash2 className="size-4" /> : /edit/i.test(a.label) ? <Pencil className="size-4" /> : /view|preview/i.test(a.label) ? <Eye className="size-4" /> : null}
                                {/cancel/i.test(a.label) ? t('common.delete') : a.label}
                              </DropdownMenuItem>
                            )
                          })}
                          {deletable && !extra.some((action) => action.label === t('common.delete')) && (
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
  return <span className={cn('font-mono tabular-nums', className)}>{formatMoney(value)}</span>
}

function formatMoney(v: number) {
  const n = new Intl.NumberFormat('id-ID').format(Math.abs(Math.round(v)))
  return v < 0 ? `-Rp${n}` : `Rp${n}`
}

export function IdCell({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-xs font-medium text-primary">{children}</span>
}
