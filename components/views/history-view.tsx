'use client'

import { Eye, Lock } from 'lucide-react'
import { useMemo, useState } from 'react'
import { type Column, DataTable, IdCell } from '@/components/common/data-table'
import { PageHeader } from '@/components/common/page-header'
import { Pill } from '@/components/common/status-badge'
import { useApp } from '@/components/providers'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { history, type HistoryRecord } from '@/lib/data'
import { formatDate } from '@/lib/format'

function actionTone(action: string) {
  if (/^(create|add|record)/i.test(action)) return 'success' as const
  if (/^(delete|cancel|void)/i.test(action)) return 'destructive' as const
  return 'primary' as const
}

export function HistoryView() {
  const { t } = useApp()
  const [selected, setSelected] = useState<HistoryRecord | null>(null)

  const pages = useMemo(() => [...new Set(history.map((h) => h.page))], [])
  const filters = [
    { value: 'all', label: t('common.all'), predicate: () => true },
    ...pages.map((p) => ({ value: p, label: p, predicate: (h: HistoryRecord) => h.page === p })),
  ]

  const columns: Column<HistoryRecord>[] = [
    { key: 'id', header: t('history.recordId'), cell: (h) => <IdCell>{h.id}</IdCell> },
    {
      key: 'time',
      header: t('history.time'),
      cell: (h) => (
        <span className="whitespace-nowrap">
          {formatDate(h.date)} <span className="text-muted-foreground">{h.time}</span>
        </span>
      ),
    },
    { key: 'page', header: t('history.page'), cell: (h) => h.page },
    { key: 'action', header: t('history.action'), cell: (h) => <Pill tone={actionTone(h.action)}>{h.action}</Pill> },
    { key: 'reference', header: t('common.reference'), cell: (h) => <span className="font-mono text-xs">{h.reference}</span> },
    { key: 'user', header: t('history.user'), cell: (h) => h.user },
    {
      key: 'changes',
      header: t('history.changes'),
      align: 'right',
      cell: (h) => <span className="font-mono tabular-nums">{h.changes.length}</span>,
    },
  ]

  return (
    <>
      <PageHeader breadcrumbs={[{ label: t('nav.history') }]} title={t('history.title')} description={t('history.desc')} />
      <p className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="size-3.5" aria-hidden="true" />
        {t('history.immutable')}
      </p>
      <DataTable
        rows={history}
        columns={columns}
        getRowId={(h) => h.id}
        searchText={(h) => `${h.id} ${h.page} ${h.action} ${h.user} ${h.reference}`}
        filters={filters}
        editable={false}
        deletable={false}
        contextActions={(h) => [{ label: t('common.view'), icon: Eye, onSelect: () => setSelected(h) }]}
      />

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {t('history.detail')} <span className="font-mono text-primary">{selected.id}</span>
                </DialogTitle>
                <DialogDescription>
                  {selected.action} · {selected.page} · {selected.reference} · {selected.user} · {formatDate(selected.date)} {selected.time}
                </DialogDescription>
              </DialogHeader>
              {selected.changes.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('history.noChanges')}</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th scope="col" className="px-3 py-2 font-medium">{t('history.property')}</th>
                        <th scope="col" className="px-3 py-2 font-medium">{t('history.previous')}</th>
                        <th scope="col" className="px-3 py-2 font-medium">{t('history.current')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selected.changes.map((c) => (
                        <tr key={c.property}>
                          <td className="px-3 py-2 font-medium">{c.property}</td>
                          <td className="px-3 py-2 text-muted-foreground">{c.previous}</td>
                          <td className="px-3 py-2">{c.current}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
