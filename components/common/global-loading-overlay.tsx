'use client'

import { usePathname } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useCallback, useEffect, useRef, useState } from 'react'

const SHOW_DELAY = 180

export function GlobalLoadingOverlay() {
  const pathname = usePathname()
  const [navigationVisible, setNavigationVisible] = useState(false)
  const [processVisible, setProcessVisible] = useState(false)
  const [portalReady, setPortalReady] = useState(false)
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const processTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigationPending = useRef(false)
  const activeProcesses = useRef(0)

  const cancelNavigation = useCallback(() => {
    navigationPending.current = false
    if (navigationTimer.current) clearTimeout(navigationTimer.current)
    navigationTimer.current = null
    setNavigationVisible(false)
  }, [])

  useEffect(() => { setPortalReady(true) }, [])

  useEffect(() => { cancelNavigation() }, [pathname, cancelNavigation])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const target = event.target
      if (!(target instanceof Element)) return
      const link = target.closest('a[href]')
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank' || link.hasAttribute('download')) return
      const url = new URL(link.href, window.location.href)
      if (url.origin !== window.location.origin || (url.pathname === window.location.pathname && url.search === window.location.search)) return
      navigationPending.current = true
      if (navigationTimer.current) clearTimeout(navigationTimer.current)
      navigationTimer.current = setTimeout(() => { if (navigationPending.current) setNavigationVisible(true) }, SHOW_DELAY)
    }
    const onNavigationIntercepted = () => {
      navigationPending.current = false
      if (navigationTimer.current) clearTimeout(navigationTimer.current)
      navigationTimer.current = null
      setNavigationVisible(false)
    }
    window.addEventListener('cuanapp:navigation-intercepted', onNavigationIntercepted)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('cuanapp:navigation-intercepted', onNavigationIntercepted)
      document.removeEventListener('click', onClick, true)
      if (navigationTimer.current) clearTimeout(navigationTimer.current)
    }
  }, [])

  useEffect(() => {
    const originalFetch = window.fetch
    const wrappedFetch: typeof window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const isInvoiceProcess = /\/api\/purchase-documents\/[^/]+\/process(?:\?|$)/.test(url)
      if (!isInvoiceProcess) return originalFetch.call(window, input, init)
      activeProcesses.current += 1
      if (processTimer.current) clearTimeout(processTimer.current)
      processTimer.current = setTimeout(() => setProcessVisible(true), SHOW_DELAY)
      try {
        return await originalFetch.call(window, input, init)
      } finally {
        activeProcesses.current = Math.max(0, activeProcesses.current - 1)
        if (activeProcesses.current === 0) {
          if (processTimer.current) clearTimeout(processTimer.current)
          processTimer.current = null
          setProcessVisible(false)
        }
      }
    }
    window.fetch = wrappedFetch
    return () => {
      if (window.fetch === wrappedFetch) window.fetch = originalFetch
      if (processTimer.current) clearTimeout(processTimer.current)
    }
  }, [])

  if (!portalReady || (!navigationVisible && !processVisible)) return null
  return createPortal(
    <div className="cuan-loading-overlay" role="status" aria-live="polite" aria-label="Loading">
      <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/95 px-5 py-3.5 shadow-lg backdrop-blur-sm">
        <span className="cuan-loading-spinner" aria-hidden="true" />
        <span className="text-sm font-medium text-foreground">Loading…</span>
      </div>
    </div>,
    document.body,
  )
}
