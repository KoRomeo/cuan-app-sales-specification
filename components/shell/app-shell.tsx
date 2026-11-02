'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/shell/sidebar'
import { Topbar } from '@/components/shell/topbar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="app-shell-surface min-h-dvh">
      <Sidebar open={open} onClose={() => setOpen(false)} collapsed={collapsed} onToggleCollapsed={() => setCollapsed((value) => !value)} />
      <div className={`flex min-h-dvh flex-col transition-[padding] duration-200 ${collapsed ? "lg:pl-[4.25rem]" : "lg:pl-60"}`}>
        <Topbar onMenu={() => setOpen(true)} />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className={`mx-auto w-full ${collapsed ? "max-w-none" : "max-w-screen-2xl"}`}>{children}</div>
        </main>
      </div>
    </div>
  )
}
