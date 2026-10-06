'use client'

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { PageHeader } from '@/components/common/page-header'
import { Pill } from '@/components/common/status-badge'
import { useApp } from '@/components/providers'
import { Button } from '@/components/ui/button'
import { history } from '@/lib/data'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

type SortKey = 'id' | 'date' | 'time' | 'page' | 'action' | 'user'
type HistoryEntry = (typeof history)[number]

const sortKeys: Record<SortKey, (h: HistoryEntry) => string> = {
  id: (h) => h.id,
  date: (h) => `${h.date} ${h.time}`,
  time: (h) => h.time,
  page: (h) => h.page,
  action: (h) => h.action,
  user: (h) => h.user,
}

export function HistoryView() {
  const { t } = useApp()
  const [openId, setOpenId] = useState<string | null>(history[0]?.id ?? null)
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(null)

  const rows = useMemo(() => {
    if (!sort) return history
    const get = sortKeys[sort.key]
    const factor = sort.dir === 'asc' ? 1 : -1
    return [...history].sort((a, b) => get(a).localeCompare(get(b), undefined, { numeric: true }) * factor)
  }, [sort])

  const toggleSort = (key: SortKey) =>
    setSort((prev) => (prev?.key !== key ? { key, dir: 'asc' } : prev.dir === 'asc' ? { key, dir: 'desc' } : null))

  const headers: { key: SortKey; label: string }[] = [
    { key: 'id', label: t('history.recordId') },
    { key: 'date', label: t('common.date') },
    { key: 'time', label: t('history.time') },
    { key: 'page', label: t('history.page') },
    { key: 'action', label: t('history.action') },
    { key: 'user', label: t('history.user') },
  ]

  return (
    <>
      <PageHeader breadcrumbs={[{ label: t('nav.activity') }, { label: t('nav.history') }]} title={t('history.title')} description={t('history.desc')} />
      <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              {headers.map((h) => {
                const dir = sort?.key === h.key ? sort.dir : null
                const Icon = dir === 'asc' ? ArrowUp : dir === 'desc' ? ArrowDown : ArrowUpDown
                return (
                  <th key={h.key} className="px-4 py-3 font-medium" aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'}>
                    <button type="button" onClick={() => toggleSort(h.key)} className="-mx-1 inline-flex items-center gap-1.5 rounded px-1 uppercase tracking-wider hover:text-foreground">
                      {h.label}
                      <Icon className={cn('size-3', dir ? 'text-foreground' : 'opacity-50')} />
                    </button>
                  </th>
                )
              })}
              <th className="w-10 px-4 py-3">
                <span className="sr-only">{t('history.changes')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => {
              const open = openId === h.id
              return (
                <Fragment key={h.id}>
                  <tr className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-primary">{h.id}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{formatDate(h.date)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{h.time}</td>
                    <td className="px-4 py-3">{h.page}</td>
                    <td className="px-4 py-3">
                      <Pill tone={h.action.startsWith('Create') ? 'success' : h.action.startsWith('Delete') ? 'destructive' : 'primary'}>{h.action}</Pill>
                    </td>
                    <td className="px-4 py-3">{h.user}</td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon-sm" aria-expanded={open} aria-label={t('history.changes')} onClick={() => setOpenId(open ? null : h.id)}>
                        <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
                      </Button>
                    </td>
                  </tr>
                  {open && (
                    <tr className="border-b bg-muted/20">
                      <td colSpan={7} className="px-4 py-3">
                        <p className="mb-2 font-mono text-xs text-muted-foreground">{h.reference}</p>
                        <table className="w-full max-w-3xl text-xs">
                          <thead className="text-left text-muted-foreground">
                            <tr>
                              <th className="py-1.5 pr-4 font-medium">{t('history.property')}</th>
                              <th className="py-1.5 pr-4 font-medium">{t('history.previous')}</th>
                              <th className="py-1.5 font-medium">{t('history.current')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {h.changes.map((c) => (
                              <tr key={c.property} className="border-t">
                                <td className="py-1.5 pr-4 font-medium">{c.property}</td>
                                <td className="py-1.5 pr-4 text-muted-foreground">{c.previous}</td>
                                <td className="py-1.5">{c.current}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
