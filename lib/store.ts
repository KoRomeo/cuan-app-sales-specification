import { isBalanced, journalEntries } from '@/lib/accounting'
import { expenses, history, orders, products, purchases, replacements, stockMovements } from '@/lib/data'
import type { TranslationKey } from '@/lib/i18n'

/**
 * In-memory unit of work over the prototype tables. Mirrors the Laravel
 * `DB::transaction()` contract: all writes inside `transaction()` commit
 * together or are rolled back together, and the journal must balance.
 */
const tables: Record<string, object[]> = {
  orders,
  purchases,
  expenses,
  products,
  stockMovements,
  history,
  replacements,
  journalEntries,
}

let version = 0
const listeners = new Set<() => void>()

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const getVersion = () => version

export class DomainError extends Error {
  constructor(
    public key: TranslationKey,
    public vars?: Record<string, string | number>,
  ) {
    super(key)
  }
}

let depth = 0

export function transaction<T>(work: () => T): T {
  if (depth > 0) return work()

  const snapshot = Object.entries(tables).map(([name, rows]) => ({
    name,
    refs: [...rows],
    clones: rows.map((r) => (Object.isFrozen(r) ? r : structuredClone(r))),
  }))

  depth++
  try {
    const result = work()
    if (!journalEntries.every(isBalanced)) throw new DomainError('err.unbalanced')
    depth--
    version++
    for (const l of listeners) l()
    return result
  } catch (err) {
    depth--
    for (const { name, refs, clones } of snapshot) {
      const rows = tables[name]
      rows.splice(0, rows.length, ...refs)
      refs.forEach((ref, i) => {
        if (Object.isFrozen(ref)) return
        for (const key of Object.keys(ref)) delete (ref as Record<string, unknown>)[key]
        Object.assign(ref, clones[i])
      })
    }
    throw err
  }
}
