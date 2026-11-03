'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BarChart3, Building2, History, LayoutDashboard, Package, Settings, ShoppingBag, ShoppingCart, Wallet, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useApp } from '@/components/providers'
import { Logo } from '@/components/shell/logo'
import { navigation } from '@/lib/navigation'
import { cn } from '@/lib/utils'

const categoryIcons: Record<string, LucideIcon> = {
  'nav.overview': LayoutDashboard,
  'nav.sales': ShoppingCart,
  'nav.purchasing': ShoppingBag,
  'nav.inventory': Package,
  'nav.finance': Wallet,
  'nav.reports': BarChart3,
  'nav.activity': History,
  'nav.settings': Settings,
}

function getActiveCategory(pathname: string) {
  return navigation.find((section) => section.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)))?.label ?? 'nav.overview'
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void; collapsed: boolean; onToggleCollapsed: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { t, features } = useApp()
  const [activeCategory, setActiveCategory] = useState<string | null>(() => getActiveCategory(pathname))

  useEffect(() => {
    setActiveCategory(getActiveCategory(pathname))
  }, [pathname])

  const visibleSections = navigation.filter((section) => section.label !== 'nav.settings').map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.feature || features[item.feature]),
  })).filter((section) => section.items.length > 0)

  const selectedSection = visibleSections.find((section) => section.label === activeCategory)

  return (
    <>
      <button type="button" aria-label="Close navigation" onClick={onClose} className={cn('fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity lg:hidden', open ? 'opacity-100' : 'pointer-events-none opacity-0')} />

      <aside className={cn(
        'app-sidebar-rail fixed inset-y-3 left-3 z-50 flex w-[4.25rem] flex-col items-center overflow-hidden rounded-xl py-3 text-white shadow-[0_0_18px_rgba(15,23,42,0.12)] transition-transform duration-200 lg:inset-y-4 lg:left-4 lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-[150%]',
      )}>
        <Link href="/dashboard" onClick={onClose} aria-label="CuanApp dashboard" className="mb-6 flex size-10 shrink-0 items-center justify-center rounded-xl text-white transition-colors hover:bg-white/10">
          <Logo className="[&>div:first-child]:size-9 [&>div:first-child]:rounded-lg [&>div:first-child]:bg-transparent [&>div:first-child]:shadow-none [&>div:last-child]:hidden [&_svg]:size-7 [&_svg]:text-white" />
        </Link>

        <nav aria-label="Main navigation" className="flex min-h-0 w-full flex-1 flex-col items-center gap-2 overflow-y-auto px-2">
          {visibleSections.map((section) => {
            const Icon = categoryIcons[section.label] ?? Building2
            const isActive = activeCategory === section.label
            const hasCurrentPage = section.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
            return (
              <button
                key={section.label}
                type="button"
                title={t(section.label)}
                aria-label={t(section.label)}
                aria-expanded={isActive}
                onClick={() => setActiveCategory((current) => current === section.label ? null : section.label)}
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-150',
                  isActive || hasCurrentPage ? 'bg-white text-[#172D55]' : 'text-white/85 hover:bg-white/12 hover:text-white',
                )}
              >
                <Icon className="size-[18px]" strokeWidth={1.8} />
              </button>
            )
          })}
        </nav>

        <div className="mt-3 flex w-full shrink-0 flex-col items-center gap-2 px-2">
          <button type="button" title={t('nav.settings')} aria-label={t('nav.settings')} onClick={() => { router.push('/settings'); onClose() }} className={cn('flex size-10 items-center justify-center rounded-lg transition-colors', pathname.startsWith('/settings') ? 'bg-white text-[#172D55]' : 'text-white/85 hover:bg-white/12 hover:text-white')}>
            <Settings className="size-[18px]" strokeWidth={1.8} />
          </button>
        </div>
      </aside>

      {activeCategory && selectedSection && (
        <section aria-label={t(activeCategory as Parameters<typeof t>[0])} className={cn(
          'fixed bottom-3 left-[5.25rem] top-3 z-[60] flex w-[15.5rem] flex-col overflow-hidden rounded-xl border border-border/60 bg-card p-3 text-card-foreground shadow-[0_0_24px_rgba(15,23,42,0.12)] lg:bottom-4 lg:left-[5.75rem] lg:top-4',
          open ? 'max-lg:left-[5.25rem]' : 'max-lg:hidden',
        )}>
          <div className="flex min-h-11 shrink-0 items-center justify-between border-b border-border/70 px-1 pb-3">
            <div className="flex min-w-0 items-center gap-2.5">
              {(() => { const Icon = categoryIcons[activeCategory] ?? Building2; return <Icon className="size-[17px] shrink-0 text-foreground" strokeWidth={1.8} /> })()}
              <h2 className="truncate text-sm font-semibold">{t(activeCategory as Parameters<typeof t>[0])}</h2>
            </div>
            <button type="button" onClick={() => setActiveCategory(null)} aria-label="Close submenu" title="Close submenu" className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>

          <nav aria-label={t(activeCategory as Parameters<typeof t>[0])} className="min-h-0 flex-1 overflow-y-auto pt-3">
            <ul className="flex flex-col gap-1">
              {selectedSection.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                const ItemIcon = item.icon
                return (
                  <li key={item.href}>
                    <Link href={item.href} onClick={onClose} aria-current={active ? 'page' : undefined} className={cn(
                      'flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors',
                      active ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                    )}>
                      <ItemIcon className="size-4 shrink-0" strokeWidth={1.8} />
                      <span className="min-w-0 flex-1 truncate">{t(item.label)}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </section>
      )}
    </>
  )
}
