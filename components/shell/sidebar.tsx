'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { useApp } from '@/components/providers'
import { Logo } from '@/components/shell/logo'
import { navigation } from '@/lib/navigation'
import { cn } from '@/lib/utils'

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
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
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/dashboard" onClick={onClose} aria-label="CuanApp Sales home">
            <Logo />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
            aria-label="Close menu"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav aria-label="Main" className="app-nav-scroll flex-1 overflow-y-auto px-3 pb-6">
          {navigation.map((section) => {
            const items = section.items.filter((item) => !item.feature || features[item.feature])
            if (items.length === 0) return null
            return (
              <div key={section.label} className="mt-5 first:mt-2">
                <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-muted">
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
                          onClick={onClose}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                            active
                              ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                              : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                          )}
                        >
                          {active && (
                            <span aria-hidden="true" className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-sidebar-primary" />
                          )}
                          <Icon className={cn('size-4 shrink-0', active ? 'text-sidebar-primary' : 'text-sidebar-muted group-hover:text-sidebar-foreground')} />
                          {t(item.label)}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-lg bg-sidebar-accent/70 p-3">
            <p className="text-xs font-medium text-sidebar-foreground">CV Cuan Sejahtera</p>
            <p className="mt-0.5 text-[11px] text-sidebar-muted">IDR · Moving Weighted Average</p>
          </div>
        </div>
      </aside>
    </>
  )
}
