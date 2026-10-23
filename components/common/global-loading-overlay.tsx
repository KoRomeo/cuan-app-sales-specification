'use client'

import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

const SHOW_DELAY = 200

export function GlobalLoadingOverlay() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigationPending = useRef(false)
  const activeProcesses = useRef(0)
  const processTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelNavigation = useCallback(() => {
    navigationPending.current = false
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setVisible(false)
  }, [])

  useEffect(() => {
    cancelNavigation()
  }, [pathname, cancelNavigation])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const target = event.target
      if (!(target instanceof Element)) return
      const link = target.closest('a[href]')
      if (!(link instanceof HTMLAnchorElement)) return
      if (link.target === '_blank' || link.hasAttribute('download')) return
      const url = new URL(link.href, window.location.href)
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname && url.search === window.location.search) return

      navigationPending.current = true
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        if (navigationPending.current) setVisible(true)
      }, SHOW_DELAY)
    }

    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  useEffect(() => {
    const originalFetch = window.fetch.bind(window)
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const isLongProcess = /\/api\/purchase-documents\/[^/]+\/process(?:\?|$)/.test(url)
      if (!isLongProcess) return originalFetch(input, init)

      activeProcesses.current += 1
      if (processTimer.current) clearTimeout(processTimer.current)
      processTimer.current = setTimeout(() => setVisible(true), SHOW_DELAY)
      try {
        return await originalFetch(input, init)
      } finally {
        activeProcesses.current = Math.max(0, activeProcesses.current - 1)
        if (activeProcesses.current === 0) {
          if (processTimer.current) clearTimeout(processTimer.current)
          processTimer.current = null
          setVisible(false)
        }
      }
    }

    return () => {
      window.fetch = originalFetch
      if (processTimer.current) clearTimeout(processTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!visible) return
    const onPathChange = () => cancelNavigation()
    window.addEventListener('popstate', onPathChange)
    return () => window.removeEventListener('popstate', onPathChange)
  }, [visible, cancelNavigation])

  if (!visible) return null

  return (
    <div
      className="cuan-loading-overlay fixed inset-0 z-[100] flex items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="cuan-loading-orbit" aria-hidden="true">
        <span className="cuan-loading-orbit__ring" />
        <span className="cuan-loading-orbit__dot" />
        <span className="cuan-loading-orbit__core" />
      </div>
    </div>
  )
}
