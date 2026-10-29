'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { useApp } from '@/components/providers'
import { Logo } from '@/components/shell/logo'
import { navigation } from '@/lib/navigation'
import { cn } from '@/lib/utils'

export function Sidebar({ open, onClose, collapsed, onToggleCollapsed }: { open: boolean; onClose: () => void; collapsed: boolean; onToggleCollapsed: () => void }) {
  const pathname = usePathname()
  const { t, features } = useApp()

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width,transform] duration-200 lg:translate-x-0',
          collapsed ? 'w-64 lg:w-[4.5rem]' : 'w-64',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className={cn("flex h-16 items-center px-4", collapsed ? "justify-center lg:px-2" : "justify-between px-5")}>
          <Link href="/dashboard" onClick={onClose} aria-label="CuanApp Sales home" className={cn(collapsed && "lg:hidden")}>
            <Logo />
          </Link>
          {collapsed && <Link href="/dashboard" onClick={onClose} aria-label="CuanApp Sales home" className="hidden size-9 items-center justify-center rounded-lg bg-gradient-to-br from-sidebar-primary to-[oklch(0.45_0.2_268)] shadow-[0_0_0_1px_oklch(1_0_0/0.12)_inset] lg:flex"><svg viewBox="0 0 24 24" className="size-4.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16l5-5 4 4 7-8" /><path d="M15 7h5v5" /></svg></Link>}
          <button type="button" onClick={onToggleCollapsed} className="hidden size-8 shrink-0 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground lg:flex" aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} title={collapsed ? "Expand navigation" : "Collapse navigation"}>
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
            aria-label="Close menu"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav aria-label="Main" className={cn("app-nav-scroll flex-1 overflow-y-auto pb-6", collapsed ? "px-2" : "px-3")}>
          {navigation.map((section) => {
            const items = section.items.filter((item) => !item.feature || features[item.feature])
            if (items.length === 0) return null
            return (
              <div key={section.label} className={cn("mt-5 first:mt-2", collapsed && "lg:mt-3")}>
                <p className={cn("px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-muted", collapsed && "lg:hidden")}>
                  {t(section.label)}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                    const Icon = item.icon
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          title={collapsed ? t(item.label) : undefined}
                          onClick={onClose}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'group relative flex items-center gap-3 rounded-md py-2 text-sm transition-colors',
                            collapsed ? 'justify-center px-2 lg:px-0' : 'px-3',
                            active
                              ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                              : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                          )}
                        >
                          {active && (
                            <span aria-hidden="true" className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-sidebar-primary" />
                          )}
                          <Icon className={cn('size-4 shrink-0', active ? 'text-sidebar-primary' : 'text-sidebar-muted group-hover:text-sidebar-foreground')} />
                          <span className={cn(collapsed && "lg:hidden")}>{t(item.label)}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </nav>

        <div className={cn("border-t border-sidebar-border p-4", collapsed && "lg:hidden")}>
          <div className="rounded-lg bg-sidebar-accent/70 p-3">
            <p className="text-xs font-medium text-sidebar-foreground">CV Cuan Sejahtera</p>
            <p className="mt-0.5 text-[11px] text-sidebar-muted">IDR · Moving Weighted Average</p>
          </div>
        </div>
      </aside>
    </>
  )
}
