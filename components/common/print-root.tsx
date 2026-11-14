'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Renders print-only content as a direct child of <body>.
 *
 * The print stylesheet hides every other body child, so the document starts at
 * the top of page 1 without relying on visibility tricks, absolute positioning
 * or knowledge of the surrounding dialog markup.
 */
export function PrintRoot({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return createPortal(<div data-print-root="">{children}</div>, document.body)
}
