'use client'

import { ChevronDown } from 'lucide-react'
import { Fragment, useState } from 'react'
import { PageHeader } from '@/components/common/page-header'
import { Pill } from '@/components/common/status-badge'
import { useApp } from '@/components/providers'
import { Button } from '@/components/ui/button'
import { history } from '@/lib/data'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

export function HistoryView() {
  const { t } = useApp()
  const [openId, setOpenId] = useState<string | null>(history[0]?.id ?? null)

  return (
    <>
      <PageHeader breadcrumbs={[{ label: t('nav.activity') }, { label: t('nav.history') }]} title={t('history.title')} description={t('history.desc')} />
      <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">{t('history.recordId')}</th>
              <th className="px-4 py-3 font-medium">{t('common.date')}</th>
              <th className="px-4 py-3 font-medium">{t('history.time')}</th>
              <th className="px-4 py-3 font-medium">{t('history.page')}</th>
              <th className="px-4 py-3 font-medium">{t('history.action')}</th>
              <th className="px-4 py-3 font-medium">{t('history.user')}</th>
              <th className="w-10 px-4 py-3">
                <span className="sr-only">{t('history.changes')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => {
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
