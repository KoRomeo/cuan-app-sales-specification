'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Bell, Building2, Check, ChevronsUpDown, LogIn, Menu, Moon, Search, Settings, Sun, User, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { LocaleSwitcher } from '@/components/common/locale-switcher'
import { useApp } from '@/components/providers'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { isOverdue, orderOutstanding, orders, products, purchaseOutstanding, purchases } from '@/lib/data'
import { cn } from '@/lib/utils'

const businesses = [
  { id: 'BUS-0001', name: 'CV Cuan Sejahtera', type: 'Sales / Distribution' },
  { id: 'BUS-0002', name: 'Toko Grosir Makmur', type: 'Sales / Distribution' },
]

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { t } = useApp()
  const { resolvedTheme, setTheme } = useTheme()
  const router = useRouter()
  const [business, setBusiness] = useState(businesses[0])

  const negativeCount = products.filter((p) => p.stock < 0).length
  const overdueCount = orders.filter((o) => isOverdue(o.dueDate, orderOutstanding(o))).length
  const payableSoon = purchases.filter((p) => p.dueDate && purchaseOutstanding(p) > 0).length
  const notifications = [
    { text: t('notif.negative', { n: negativeCount }), href: '/stock?filter=negative', tone: 'destructive' },
    { text: t('notif.overdue', { n: overdueCount }), href: '/receivables', tone: 'warning' },
    { text: t('notif.payable', { n: payableSoon }), href: '/payables', tone: 'primary' },
  ]

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-xl md:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label={t('top.menu')}>
        <Menu />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="flex items-center gap-2.5 rounded-lg border bg-card px-2.5 py-1.5 text-left transition-colors hover:bg-muted"
            />
          }
        >
          <span className="flex size-6 items-center justify-center rounded-md bg-primary/12 text-primary">
            <Building2 className="size-3.5" />
          </span>
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="text-sm font-medium">{business.name}</span>
            <span className="text-[11px] text-muted-foreground">{business.type}</span>
          </span>
          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t('top.switchBusiness')}</DropdownMenuLabel>
            <DropdownMenuLabel className="whitespace-normal text-xs font-normal normal-case leading-5 text-muted-foreground">
              {t('top.businessPreview')}
            </DropdownMenuLabel>
            {businesses.map((b) => (
              <DropdownMenuItem key={b.id} onClick={() => setBusiness(b)}>
                <Building2 />
                <span className="flex-1">{b.name}</span>
                {b.id === business.id && <Check className="text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="relative ml-auto hidden max-w-sm flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder={t('top.search')}
          aria-label={t('top.search')}
          className="h-9 w-full rounded-lg border bg-card pl-9 pr-12 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
          /
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-1.5 md:ml-0">
        <LocaleSwitcher />

        <Button
          variant="ghost"
          size="icon"
          aria-label={t('top.theme')}
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="hidden dark:block" />
          <Moon className="dark:hidden" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={t('top.notifications')} className="relative" />}>
            <Bell />
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive ring-2 ring-background" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t('top.notifications')}</DropdownMenuLabel>
              <DropdownMenuLabel className="whitespace-normal text-xs font-normal normal-case leading-5 text-muted-foreground">
                {t('common.demoDataNotice')}
              </DropdownMenuLabel>
              {notifications.map((n) => (
                <DropdownMenuItem key={n.href} onClick={() => router.push(n.href)} className="items-start py-2">
                  <span
                    className={cn(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      n.tone === 'destructive' && 'bg-destructive',
                      n.tone === 'warning' && 'bg-warning',
                      n.tone === 'primary' && 'bg-primary',
                    )}
                  />
                  <span className="text-sm">{n.text}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label={t('top.profile')}
                className="ml-1 flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[oklch(0.45_0.2_268)] text-xs font-semibold text-white ring-2 ring-background"
              />
            }
          >
            SE
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <span className="block text-sm font-medium text-foreground">Shane Emanuel</span>
                <span className="block text-xs font-normal">shane@cuanapp.id</span>
                <span className="mt-1 block whitespace-normal text-xs font-normal text-muted-foreground">{t('top.profilePreview')}</span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/settings?tab=profile" />}>
              <User />
              {t('top.profile')}
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/settings" />}>
              <Settings />
              {t('nav.settings')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t('top.accessPreview')}</DropdownMenuLabel>
            <DropdownMenuItem render={<Link href="/login" />}>
              <LogIn />
              {t('auth.loginAction')}
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/register" />}>
              <UserPlus />
              {t('auth.registerAction')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
