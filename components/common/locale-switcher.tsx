'use client'

import { useApp } from '@/components/providers'
import { cn } from '@/lib/utils'

export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useApp()

  return (
    <div role="group" aria-label={t('top.language')} className={cn('flex items-center rounded-lg border bg-card p-0.5', className)}>
      {(['en', 'id'] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-label={option === 'en' ? 'English' : 'Bahasa Indonesia'}
          aria-pressed={locale === option}
          onClick={() => setLocale(option)}
          className={cn(
            'rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            locale === option ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

