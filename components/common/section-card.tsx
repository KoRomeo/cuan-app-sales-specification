import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SectionCard({
  title,
  description,
  action,
  href,
  hrefLabel,
  children,
  className,
  bodyClassName,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  href?: string
  hrefLabel?: string
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn('flex flex-col rounded-md border bg-card shadow-xs', className)}>
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3 md:px-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
        {href && (
          <Link href={href} className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline">
            {hrefLabel}
            <ArrowRight className="size-3.5" />
          </Link>
        )}
      </header>
      <div className={cn('flex-1 p-4 md:p-5', bodyClassName)}>{children}</div>
    </section>
  )
}

export function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  )
}
