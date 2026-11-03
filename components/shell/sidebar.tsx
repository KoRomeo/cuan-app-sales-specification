'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3, Building2, History, LayoutDashboard, Package, PanelLeftClose,
  Settings, ShoppingBag, ShoppingCart, Wallet,
} from 'lucide-react'
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
  return navigation.find((section) =>
    section.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)),
  )?.label ?? 'nav.overview'
}

type SidebarProps = {
  open: boolean
  onClose: () => void
  onExpandedChange: (expanded: boolean) => void
}

export function Sidebar({ open, onClose, onExpandedChange }: SidebarProps) {
  const pathname = usePathname()
  const { t, features } = useApp()
  const [activeCategory, setActiveCategory] = useState<string | null>(() => getActiveCategory(pathname))
  const expanded = Boolean(activeCategory)

  useEffect(() => {
    setActiveCategory(getActiveCategory(pathname))
  }, [pathname])

  useEffect(() => {
    onExpandedChange(expanded)
  }, [expanded, onExpandedChange])

  const visibleSections = navigation.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.feature || features[item.feature]),
  })).filter((section) => section.items.length > 0)
  const selectedSection = visibleSections.find((section) => section.label === activeCategory)

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px] transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <aside className={cn(
        'app-sidebar-dock fixed bottom-3 left-3 top-3 z-50 flex overflow-hidden rounded-xl shadow-[0_8px_32px_rgba(15,23,42,0.14)] transition-[width,transform] duration-200 ease-out lg:bottom-4 lg:left-4 lg:top-4',
        expanded ? 'w-[min(20.25rem,calc(100vw-1.5rem))] lg:w-[20.25rem]' : 'w-[4.25rem]',
        open ? 'translate-x-0' : '-translate-x-[150%] lg:translate-x-0',
      )}>
        <div className="app-sidebar-rail relative z-10 flex w-[4.25rem] shrink-0 flex-col items-center py-3 text-white">
          <Link
            href="/dashboard"
            onClick={onClose}
            aria-label="CuanApp dashboard"
            className="mb-6 flex size-10 shrink-0 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10"
          >
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
                    isActive || hasCurrentPage
                      ? 'bg-white text-[#172D55]'
                      : 'text-white/85 hover:bg-white/12 hover:text-white',
                  )}
                >
                  <Icon className="size-[18px]" strokeWidth={1.8} />
                </button>
              )
            })}
          </nav>
        </div>

        {selectedSection && (
          <section
            aria-label={t(activeCategory as Parameters<typeof t>[0])}
            className="app-sidebar-subnav flex min-w-0 flex-1 flex-col bg-card px-5 pb-4 pt-4 text-card-foreground"
          >
            <div className="flex min-h-10 shrink-0 items-center justify-between gap-3 border-b border-border/70 pb-3">
              <div className="flex min-w-0 items-center gap-2.5">
                {(() => {
                  const Icon = categoryIcons[activeCategory!] ?? Building2
                  return <Icon className="size-[17px] shrink-0 text-foreground" strokeWidth={1.8} />
                })()}
                <h2 className="truncate text-sm font-semibold">
                  {t(activeCategory as Parameters<typeof t>[0])}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                aria-label="Collapse navigation"
                title="Collapse navigation"
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <PanelLeftClose className="size-[17px]" strokeWidth={1.7} />
              </button>
            </div>

            <nav
              aria-label={t(activeCategory as Parameters<typeof t>[0])}
              className="min-h-0 flex-1 overflow-y-auto pt-3"
            >
              <ul className="flex flex-col gap-1">
                {selectedSection.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                  const ItemIcon = item.icon
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors',
                          active
                            ? 'bg-muted font-medium text-foreground'
                            : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                        )}
                      >
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
      </aside>
    </>
  )
}
