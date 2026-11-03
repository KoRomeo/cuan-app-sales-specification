'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/shell/sidebar'
import { Topbar } from '@/components/shell/topbar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="app-shell-surface min-h-dvh">
      <Sidebar open={open} onClose={() => setOpen(false)} collapsed onToggleCollapsed={() => undefined} />
      <div className="flex min-h-dvh flex-col transition-[padding] duration-200 lg:pl-[6.5rem]">
        <Topbar onMenu={() => setOpen(true)} />
        <main className="flex-1 px-4 py-6 md:px-6 md:py-7">
          <div className="mx-auto w-full max-w-none">{children}</div>
        </main>
      </div>
    </div>
  )
}
