import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ArrowUpRight } from 'lucide-react'
import { type Tone, toneText, toneSoft } from '@/components/common/tone'
import { cn } from '@/lib/utils'

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'primary',
  href,
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  icon?: LucideIcon
  tone?: Tone
  href?: string
}) {
  const amountDigits = typeof value === 'string' ? value.replace(/\\D/g, '').length : 0
  const valueSize = amountDigits >= 13 ? 'text-xs sm:text-sm md:text-base' : amountDigits >= 10 ? 'text-sm sm:text-base md:text-lg' : 'text-xl md:text-2xl'
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        {Icon && (
          <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-md', toneSoft[tone])}>
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className={cn('mt-3 min-w-0 overflow-x-auto whitespace-nowrap font-mono font-semibold tabular-nums tracking-tight', valueSize, tone === 'destructive' && toneText.destructive)}>
        {value}
      </p>
      {hint && <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div>}
      {href && (
        <ArrowUpRight className="absolute bottom-4 right-4 size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </>
  )

  const className =
    'group relative flex flex-col rounded-md border bg-card p-4 shadow-xs transition-colors md:p-5'

  if (href) {
    return (
      <Link href={href} className={cn(className, 'hover:border-primary/40')}>
        {body}
      </Link>
    )
  }
  return <div className={className}>{body}</div>
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return <div className="mb-6 grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">{children}</div>
}
