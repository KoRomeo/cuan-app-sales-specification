'use client'

import { CalendarDays } from 'lucide-react'
import { useApp } from '@/components/providers'
import { SearchableSelect } from '@/components/common/searchable-select'
import type { Period } from '@/lib/data'

const periods: Period[] = ['today', 'thisWeek', 'thisMonth', 'lastMonth', 'thisQuarter', 'thisYear', 'allTime']

export function PeriodSelect({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const { t } = useApp()
  return (
    <div className="relative">
      <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <SearchableSelect id="period-select" value={value} onChange={(next) => onChange(String(next) as Period)} options={periods.map((period) => ({ value: period, label: t(`period.${period}`) }))} placeholder={t(`period.${value}`)} searchPlaceholder={t('common.search')} emptyText={t('common.noResults')} />

    </div>
  )
}
