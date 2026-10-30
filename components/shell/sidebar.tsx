'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import {
  BarChart3, Boxes, Building2, ChevronDown, FileText, History, LayoutDashboard,
  PanelLeftClose, PanelLeftOpen, Package, Settings, ShoppingBag, ShoppingCart,
  Wallet, X,
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

export function Sidebar({ open, onClose, collapsed, onToggleCollapsed }: { open: boolean; onClose: () => void; collapsed: boolean; onToggleCollapsed: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { t, features } = useApp()
  const [expandedSections, setExpandedSections] = useState<string[]>(() => {
    const active = navigation.find((section) => section.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)))
    return active ? [active.label] : ['nav.overview']
  })
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  useEffect(() => {
    const active = navigation.find((section) => section.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)))
    if (active) setExpandedSections((current) => current.includes(active.label) ? current : [...current, active.label])
    setActiveCategory(null)
  }, [pathname])

  const visibleSections = navigation.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.feature || features[item.feature]),
  })).filter((section) => section.items.length > 0)

  const toggleSection = (label: string) => {
    setExpandedSections((current) => current.includes(label) ? current.filter((item) => item !== label) : [...current, label])
  }

  return (
    <>
      <div aria-hidden="true" onClick={onClose} className={cn('fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden', open ? 'opacity-100' : 'pointer-events-none opacity-0')} />
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[2px_0_12px_-10px_rgba(15,23,42,0.24)] transition-[width,transform] duration-200 lg:translate-x-0',
        collapsed ? 'w-64 lg:w-[4.5rem]' : 'w-64',
        open ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className={cn('flex h-16 shrink-0 items-center border-b border-sidebar-border/70 px-3', collapsed ? 'justify-center lg:px-2' : 'justify-between px-5')}>
          <Link href="/dashboard" onClick={onClose} aria-label="CuanApp Sales home" className={cn(collapsed && 'lg:hidden')}>
            <Logo />
          </Link>
          <button type="button" onClick={onToggleCollapsed} className="hidden size-8 shrink-0 items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground lg:flex" aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} title={collapsed ? 'Expand navigation' : 'Collapse navigation'}>
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden" aria-label="Close menu">
            <X className="size-4" />
          </button>
        </div>

        <nav aria-label="Main" className={cn('app-nav-scroll flex-1 overflow-y-auto overflow-x-hidden py-3', collapsed ? 'px-2' : 'px-3')}>
          {visibleSections.map((section) => {
            const isExpanded = expandedSections.includes(section.label)
            const hasActiveItem = section.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
            const Icon = categoryIcons[section.label] ?? Building2
            const singlePageSection = section.items.length === 1
            return (
              <div key={section.label} className={cn('relative', collapsed ? 'mb-1.5' : section.label === 'nav.settings' ? 'mt-3 border-t border-sidebar-border/60 pt-3' : 'mb-2')}>
                {/* Compact mode: multi-page categories use a floating submenu; single-page categories navigate directly. */}
                <button
                  type="button"
                  title={collapsed ? t(section.label) : undefined}
                  aria-label={t(section.label)}
                  aria-expanded={collapsed ? activeCategory === section.label : (singlePageSection ? undefined : isExpanded)}
                  onClick={() => {
                    if (collapsed) {
                      if (singlePageSection) {
                        router.push(section.items[0].href)
                        onClose()
                        return
                      }
                      setActiveCategory((current) => current === section.label ? null : section.label)
                    } else {
                      if (singlePageSection) {
                        router.push(section.items[0].href)
                        onClose()
                      } else {
                        toggleSection(section.label)
                      }
                    }
                  }}
                  className={cn(
                    'group relative flex w-full items-center rounded-lg text-sm transition-all duration-150',
                    collapsed ? 'h-10 justify-center px-0' : 'gap-3 px-3 py-2',
                    (hasActiveItem || activeCategory === section.label) ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/65 hover:text-sidebar-foreground',
                  )}
                >
                  {(hasActiveItem || activeCategory === section.label) && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-sidebar-primary" />}
                  <Icon className={cn('size-[17px] shrink-0', hasActiveItem || activeCategory === section.label ? 'text-sidebar-primary' : 'text-sidebar-muted group-hover:text-sidebar-foreground')} />
                  <span className={cn('min-w-0 flex-1 truncate text-left text-[12px] font-medium tracking-normal', collapsed && 'lg:hidden')}>{t(section.label)}</span>
                  {!collapsed && !singlePageSection && <ChevronDown className={cn('size-3.5 text-sidebar-muted transition-transform', isExpanded && 'rotate-180')} />}
                </button>

                {!collapsed && !singlePageSection && isExpanded && (
                  <div className="relative ml-[1.15rem] mt-1.5 border-l border-sidebar-border/90 pl-3">
                    <span aria-hidden="true" className="pointer-events-none absolute -left-px top-0 h-2.5 w-px bg-sidebar" />
                    <ul className="flex flex-col gap-0.5">
                      {section.items.map((item) => {
                        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                        const ItemIcon = item.icon
                        return (
                          <li key={item.href} className="relative">
                            <span aria-hidden="true" className="absolute -left-3 top-1/2 h-px w-2.5 bg-sidebar-border/90" />
                            <Link href={item.href} onClick={onClose} aria-current={active ? 'page' : undefined} className={cn(
                              'group flex min-h-9 items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors',
                              active ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                            )}>
                              <ItemIcon className={cn('size-3.5 shrink-0', active ? 'text-sidebar-primary' : 'text-sidebar-muted')} />
                              <span className="truncate">{t(item.label)}</span>
                              {active && <span className="ml-auto size-1.5 shrink-0 rounded-full bg-sidebar-primary" />}
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {!collapsed && (
          <div className="shrink-0 border-t border-sidebar-border p-3">
            <div className="rounded-lg border border-sidebar-border/70 bg-sidebar-accent/45 px-3 py-2.5">
              <p className="text-xs font-medium text-sidebar-foreground">CV Cuan Sejahtera</p>
              <p className="mt-0.5 text-[10px] text-sidebar-muted">IDR · Moving Weighted Average</p>
            </div>
          </div>
        )}
      </aside>

      {/* Floating category panel sits outside the scroll container so it never gets clipped. */}
      {collapsed && activeCategory && (
        <>
          <button type="button" aria-label="Close category menu" className="fixed inset-0 z-[55] hidden bg-transparent lg:block" onClick={() => setActiveCategory(null)} />
          <section className="fixed left-[4.75rem] top-[4.5rem] z-[60] hidden w-60 overflow-hidden rounded-xl border border-sidebar-border bg-popover p-2.5 text-popover-foreground shadow-[0_8px_24px_-12px_rgba(15,23,42,0.28),0_2px_6px_-3px_rgba(15,23,42,0.12)] lg:block" aria-label={t(activeCategory)}>
            <div className="flex items-center gap-2 border-b border-border/70 px-2 pb-2.5 pt-1">
              {(() => { const Icon = categoryIcons[activeCategory] ?? Building2; return <Icon className="size-4 text-primary" /> })()}
              <p className="text-[13px] font-medium tracking-normal">{t(activeCategory as Parameters<typeof t>[0])}</p>
            </div>
            <ul className="mt-1.5 flex flex-col gap-0.5">
              {(visibleSections.find((section) => section.label === activeCategory)?.items ?? []).map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                const ItemIcon = item.icon
                return (
                  <li key={item.href}>
                    <Link href={item.href} onClick={() => { setActiveCategory(null); onClose() }} aria-current={active ? 'page' : undefined} className={cn('flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors', active ? 'bg-accent font-medium text-accent-foreground' : 'text-foreground/75 hover:bg-accent/70 hover:text-foreground')}>
                      <ItemIcon className={cn('size-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
                      <span className="truncate">{t(item.label)}</span>
                      {active && <span className="ml-auto size-1.5 rounded-full bg-primary" />}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        </>
      )}
    </>
  )
}
