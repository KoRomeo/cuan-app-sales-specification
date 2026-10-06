'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Columns3, Eye, MoreHorizontal, Pencil, Plus, Search, Trash2, type LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
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
}

interface DataTableProps<T> {
  rows: T[]
  columns: Column<T>[]
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
}

export function DataTable<T>({
  rows,
  columns,
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
}: DataTableProps<T>) {
  const { t } = useApp()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState(initialFilter)
  const [page, setPage] = useState(1)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [deleteOpen, setDeleteOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const activeFilter = filters?.find((f) => f.value === filter)
    return rows.filter((r) => {
      if (activeFilter && !activeFilter.predicate(r)) return false
      if (q && !searchText(r).toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, query, filter, filters, searchText])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, pageCount)
  const start = (current - 1) * pageSize
  const visibleRows = filtered.slice(start, start + pageSize)
  const visibleColumns = columns.filter((c) => !hidden.has(c.key))
  const hasActions = rowHref || contextActions || editable || deletable

  return (
    <div className="rounded-xl border bg-card shadow-xs">
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

        {filters && filters.length > 0 && (
          <div role="tablist" aria-label={t('common.filter')} className="flex flex-wrap items-center gap-1 rounded-lg bg-muted p-0.5">
            {filters.map((f) => {
              const count = rows.filter(f.predicate).length
              const active = filter === f.value
              return (
                <button
                  key={f.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setFilter(f.value)
                    setPage(1)
                  }}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    active ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {f.label}
                  <span className={cn('font-mono tabular-nums', active ? 'text-primary' : 'opacity-70')}>{count}</span>
                </button>
              )
            })}
          </div>
        )}

        <div className="flex items-center gap-2 md:ml-auto">
          {toolbarExtra}
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
            <Button size="sm" onClick={onAdd}>
              <Plus />
              {addLabel}
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              {visibleColumns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    'h-10 whitespace-nowrap px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground',
                    c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left',
                  )}
                >
                  {c.header}
                </th>
              ))}
              {hasActions && (
                <th scope="col" className="h-10 w-12 px-4">
                  <span className="sr-only">{t('common.actions')}</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="px-4 py-14 text-center text-sm text-muted-foreground">
                  {t('common.noResults')}
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
                  {visibleColumns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        'h-12 whitespace-nowrap px-4',
                        c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left',
                        c.className,
                      )}
                    >
                      {c.cell(row)}
                    </td>
                  ))}
                  {hasActions && (
                    <td className="px-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t('common.actions')} />}>
                          <MoreHorizontal />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {href && (
                            <DropdownMenuItem onClick={() => router.push(href)}>
                              <Eye />
                              {t('common.view')}
                            </DropdownMenuItem>
                          )}
                          {editable && (
                            <DropdownMenuItem>
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
                                onClick={() => {
                                  if (a.onSelect) a.onSelect()
                                  else if (a.href) router.push(a.href)
                                }}
                              >
                                {Icon && <Icon />}
                                {a.label}
                              </DropdownMenuItem>
                            )
                          })}
                          {deletable && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                                <Trash2 />
                                {t('common.delete')}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
        <div className="flex items-center gap-1">
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
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('deleteDialog.title')}
        description={t('deleteDialog.body')}
        confirmLabel={t('common.delete')}
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
