'use client'

import { CalendarDays } from 'lucide-react'
import { useApp } from '@/components/providers'
import { SearchableSelect } from '@/components/common/searchable-select'
import type { Period } from '@/lib/data'

const periods: Period[] = ['today', 'thisWeek', 'thisMonth', 'lastMonth', 'thisQuarter', 'thisYear', 'allTime']

export function PeriodSelect({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const { t } = useApp()
  return (
    <div className="flex items-center gap-2">
      <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
      <SearchableSelect id="period-select" value={value} onChange={(next) => onChange(String(next) as Period)} options={periods.map((period) => ({ value: period, label: t(`period.${period}`) }))} placeholder={t(`period.${value}`)} searchPlaceholder={t('common.search')} emptyText={t('common.noResults')} />

    </div>
  )
}
