'use client'

import { CalendarDays } from 'lucide-react'
import { useApp } from '@/components/providers'
import type { Period } from '@/lib/data'

const periods: Period[] = ['today', 'thisWeek', 'thisMonth', 'lastMonth', 'thisQuarter', 'thisYear', 'allTime']

export function PeriodSelect({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const { t } = useApp()
  return (
    <div className="relative">
      <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Period)}
        aria-label="Period"
        className="h-8 appearance-none rounded-lg border bg-card pl-8 pr-8 text-sm font-medium outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        {periods.map((p) => (
          <option key={p} value={p}>
            {t(`period.${p}`)}
          </option>
        ))}
      </select>
      <svg aria-hidden="true" viewBox="0 0 16 16" className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 6l4 4 4-4" />
      </svg>
    </div>
  )
}
