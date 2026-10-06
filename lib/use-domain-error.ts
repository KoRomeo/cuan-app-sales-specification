'use client'

import { useCallback, useState } from 'react'
import { useApp } from '@/components/providers'
import { UnbalancedJournalError } from '@/lib/accounting'
import { DomainError } from '@/lib/store'

/** Runs a mutation and turns a thrown DomainError into a translated message. Returns true on success. */
export function useDomainError() {
  const { t } = useApp()
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(
    (work: () => void) => {
      try {
        work()
        setError(null)
        return true
      } catch (err) {
        if (err instanceof DomainError) {
          let msg = t(err.key)
          for (const [k, v] of Object.entries(err.vars ?? {})) msg = msg.replace(`{${k}}`, String(v))
          setError(msg)
        } else if (err instanceof UnbalancedJournalError) {
          setError(t('err.unbalanced'))
        } else {
          setError(t('err.unexpected'))
          console.error(err)
        }
        return false
      }
    },
    [t],
  )

  return { error, run, clear: useCallback(() => setError(null), []) }
}
