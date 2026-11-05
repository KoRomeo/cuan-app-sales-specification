'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { authClient } from '@/lib/auth-client'
import { Bell, Building2, Check, ChevronsUpDown, LogOut, Menu, Moon, Search, Settings, Sun, User, CheckCheck } from 'lucide-react'
import useSWR from 'swr'
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

type NotificationItem = {
  id: string
  kind: string
  entityId: string | null
  href: string
  priority: 'critical' | 'warning' | 'info'
  isRead: boolean
  createdAt: string
  resolvedAt: string | null
  title: string
  description: string
}
type NotificationResponse = { items: NotificationItem[]; unreadCount: number; activeCount: number }
type NotificationFilter = 'all' | 'unread' | 'read'

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error('Unable to load notifications')
  return response.json() as Promise<NotificationResponse>
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { t, locale } = useApp()
  const { resolvedTheme, setTheme } = useTheme()
  const router = useRouter()
  const [notificationFilter, setNotificationFilter] = useState<NotificationFilter>('all')
  const { data: session, mutate: mutateSession } = useSWR<{ user?: { name?: string; email?: string; image?: string | null } } | null>('/api/auth/get-session', (url: string) => fetch(url, { cache: 'no-store' }).then(async response => { if (!response.ok) throw new Error('Unable to load account'); return response.json() }))
  const { data: business } = useSWR<{ id: string; name: string; type: string; role?: string }>('/api/businesses/current', (url: string) => fetch(url, { cache: 'no-store' }).then(async (response) => { if (!response.ok) throw new Error('Unable to load business'); return response.json() }))
  const notificationKey = business?.id ? `/api/notifications?businessId=${encodeURIComponent(business.id)}&locale=${locale}` : null
  const { data: notificationData, mutate: mutateNotifications, error: notificationError } = useSWR<NotificationResponse>(notificationKey, fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
    keepPreviousData: true,
  })

  const userName = session?.user?.name?.trim() || session?.user?.email?.split('@')[0] || 'User'
  const initials = userName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'U'
  const signOut = async () => { await authClient.signOut(); await mutateSession(null, false); router.replace('/login'); router.refresh() }

  const markRead = async (id: string) => {
    if (!business?.id) return
    const response = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: business.id, id }),
    })
    if (!response.ok) throw new Error('Unable to mark notification as read')
    await mutateNotifications()
  }
  const markAllRead = async () => {
    if (!business?.id) return
    const response = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: business.id, all: true }),
    })
    if (!response.ok) throw new Error('Unable to mark notifications as read')
    await mutateNotifications()
  }

  const visibleNotifications = useMemo(() => (notificationData?.items ?? []).filter(item => {
    if (notificationFilter === 'unread') return !item.isRead && !item.resolvedAt
    if (notificationFilter === 'read') return item.isRead || Boolean(item.resolvedAt)
    return true
  }), [notificationData?.items, notificationFilter])

  const groupedNotifications = useMemo(() => {
    const today = new Date()
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    const startOfYesterday = startOfToday - 86400000
    const groups: { key: string; label: string; items: NotificationItem[] }[] = [
      { key: 'today', label: t('notif.today'), items: [] },
      { key: 'yesterday', label: t('notif.yesterday'), items: [] },
      { key: 'earlier', label: t('notif.earlier'), items: [] },
    ]
    for (const item of visibleNotifications) {
      const timestamp = new Date(item.createdAt).getTime()
      const group = timestamp >= startOfToday ? groups[0] : timestamp >= startOfYesterday ? groups[1] : groups[2]
      group.items.push(item)
    }
    return groups.filter(group => group.items.length > 0)
  }, [visibleNotifications, t])

  const filters: { value: NotificationFilter; label: string }[] = [
    { value: 'all', label: t('notif.all') },
    { value: 'unread', label: t('notif.unread') },
    { value: 'read', label: t('notif.read') },
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
            <span className="text-sm font-medium">{business?.name ?? t('common.loading')}</span>
            <span className="text-[11px] text-muted-foreground">{business ? t(business.type === 'bakery' ? 'onboarding.bakeryType' : 'onboarding.salesType') : ''}</span>
          </span>
          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t('top.switchBusiness')}</DropdownMenuLabel>
            {business && (
              <DropdownMenuItem onClick={() => router.push('/settings?tab=business')}>
                <Building2 />
                <span className="flex-1">{business.name}</span>
                <Check className="text-primary" />
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/settings?tab=business')}>
              <Settings />
              {t('settings.business')}
            </DropdownMenuItem>
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
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">/</kbd>
      </div>

      <div className="ml-auto flex items-center gap-1.5 md:ml-0">
        <LocaleSwitcher />
        <Button variant="ghost" size="icon" aria-label={t('top.theme')} onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
          <Sun className="hidden dark:block" />
          <Moon className="dark:hidden" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={t('top.notifications')} className="relative" />}>
            <Bell />
            {Boolean(notificationData?.unreadCount) && <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold leading-none text-white ring-2 ring-background">{notificationData?.unreadCount && notificationData.unreadCount > 9 ? '9+' : notificationData?.unreadCount}</span>}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[min(26rem,calc(100vw-2rem))] p-0">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="p-0 text-sm font-medium text-foreground">{t('top.notifications')}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t('notif.unreadCount', { n: notificationData?.unreadCount ?? 0 })}</p>
              </div>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs" disabled={!notificationData?.unreadCount} onClick={() => void markAllRead()}>
                <CheckCheck className="size-3.5" />{t('notif.markAllRead')}
              </Button>
            </div>
            <div className="flex gap-1 border-y px-3 py-2">
              {filters.map(filter => (
                <button key={filter.value} type="button" onClick={() => setNotificationFilter(filter.value)} className={`rounded-md px-3 py-1.5 text-xs transition-colors ${notificationFilter === filter.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="max-h-[min(28rem,65vh)] overflow-y-auto p-2">
              {notificationError ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t('notif.loadError')}</p>
              ) : !notificationData ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t('common.loading')}</p>
              ) : groupedNotifications.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t('notif.empty')}</p>
              ) : groupedNotifications.map(group => (
                <section key={group.key} className="pb-2">
                  <h3 className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</h3>
                  {group.items.map(item => (
                    <DropdownMenuItem key={item.id} onClick={() => { if (!item.isRead) void markRead(item.id); router.push(item.href) }} className="items-start gap-2.5 rounded-md px-2 py-3">
                      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${item.priority === 'critical' ? 'bg-destructive' : item.priority === 'warning' ? 'bg-warning' : 'bg-primary'}`} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className={`truncate text-sm ${!item.isRead && !item.resolvedAt ? 'font-semibold text-foreground' : 'font-medium'}`}>{item.title}</span>
                          {item.resolvedAt && <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">{t('notif.resolved')}</span>}
                        </span>
                        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{item.description}</span>
                        <span className="mt-1 block text-[10px] text-muted-foreground">{new Date(item.createdAt).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      </span>
                      {!item.isRead && !item.resolvedAt && <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />}
                    </DropdownMenuItem>
                  ))}
                </section>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button type="button" aria-label={t('top.profile')} className="ml-1 flex size-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-[oklch(0.45_0.2_268)] text-xs font-semibold text-white ring-2 ring-background" />
            }
          >
            {session?.user?.image ? <img src={session.user.image} alt="" className="size-full object-cover" /> : initials}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-3 py-2">
                <span className="block truncate text-sm font-semibold text-foreground">{userName}</span>
                <span className="block truncate text-xs font-normal text-muted-foreground">{session?.user?.email || ''}</span>
                <span className="mt-1 block text-xs font-medium capitalize text-muted-foreground">{business?.role === 'owner' ? t('settings.owner') : business?.role?.replace(/[_-]/g, ' ') || ''}</span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/settings?tab=profile')}><User />{t('top.profile')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')}><Settings />{t('nav.settings')}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void signOut()}><LogOut />{t('top.signOut')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
