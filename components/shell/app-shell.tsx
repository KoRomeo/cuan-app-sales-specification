'use client'

import { useCallback, useState } from 'react'
import { Sidebar } from '@/components/shell/sidebar'
import { Topbar } from '@/components/shell/topbar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [navigationExpanded, setNavigationExpanded] = useState(true)
  const handleExpandedChange = useCallback((expanded: boolean) => {
    setNavigationExpanded(expanded)
  }, [])

  return (
    <div className="app-shell-surface min-h-dvh">
      <Sidebar
        open={open}
        onClose={() => setOpen(false)}
        onExpandedChange={handleExpandedChange}
      />
      <div className={`flex min-h-dvh flex-col transition-[padding] duration-200 ease-out ${navigationExpanded ? 'lg:pl-[18.25rem]' : 'lg:pl-[4.75rem]'}`}>
        <Topbar onMenu={() => setOpen(true)} />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-6 md:py-7">
          <div className="mx-auto w-full max-w-none">{children}</div>
        </main>
      </div>
    </div>
  )
}
