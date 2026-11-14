'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

export type SearchableSelectOption = { value: string; label: string; description?: string; disabled?: boolean }

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search…',
  emptyText = 'No results found',
  disabled = false,
  required = false,
  multiple = false,
  className,
  name,
  id,
  ariaLabel,
  selectedText = 'selected',
  doneLabel = 'Done',
  clearSearchLabel = 'Clear search',
  popoverClassName,
}: {
  value: string | string[]
  onChange: (value: string | string[]) => void
  options: SearchableSelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  required?: boolean
  multiple?: boolean
  className?: string
  name?: string
  id?: string
  ariaLabel?: string
  selectedText?: string
  doneLabel?: string
  clearSearchLabel?: string
  popoverClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  /* Keep the panel glued to the trigger while the page scrolls or resizes. */
  const reanchor = useCallback(() => {
    const el = triggerRef.current
    if (el) setAnchor(el.getBoundingClientRect())
  }, [])
  useEffect(() => {
    if (!open) return
    reanchor()
    const onMove = () => reanchor()
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
  }, [open, reanchor])

  const selected = Array.isArray(value) ? value : value ? [value] : []
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase()
    return options.filter((option) => !q || option.label.toLocaleLowerCase().includes(q) || option.description?.toLocaleLowerCase().includes(q))
  }, [options, query])
  const selectedLabels = selected.map((id) => options.find((option) => option.value === id)?.label ?? id)

  /* Position the portalled panel under the trigger, clamped to the viewport. */
  const panelStyle: CSSProperties = useMemo(() => {
    if (!anchor || typeof window === 'undefined') return {}
    const gutter = 8
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const width = Math.min(Math.max(anchor.width, 220), Math.max(220, viewportWidth - gutter * 2))
    const spaceBelow = viewportHeight - anchor.bottom
    const openUp = spaceBelow < 320 && anchor.top > spaceBelow
    const available = (openUp ? anchor.top : spaceBelow) - 12
    return {
      position: 'fixed',
      left: Math.max(gutter, Math.min(anchor.left, viewportWidth - width - gutter)),
      ...(openUp ? { bottom: viewportHeight - anchor.top + 4 } : { top: anchor.bottom + 4 }),
      width,
      maxHeight: Math.max(180, Math.min(420, available)),
    }
  }, [anchor])

  const commit = (option: SearchableSelectOption) => {
    if (option.disabled) return
    if (multiple) {
      const next = selected.includes(option.value) ? selected.filter((item) => item !== option.value) : [...selected, option.value]
      onChange(next)
    } else {
      onChange(option.value)
      setOpen(false)
      setQuery('')
    }
  }
  return (
    <div className={cn('relative min-w-0', className)}>
      {name && <input type="hidden" name={name} value={selected.join(',')} />}{required && <input aria-hidden="true" tabIndex={-1} className="pointer-events-none absolute size-px opacity-0" value={selected.length ? 'selected' : ''} onChange={() => {}} required />}
      <button id={id} ref={triggerRef} type="button" disabled={disabled} aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex min-h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm shadow-xs outline-none transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50">
        <span className={cn('min-w-0 truncate', selected.length === 0 && 'text-muted-foreground')}>{selected.length ? selectedLabels.join(', ') : placeholder}</span>
        <span className="flex shrink-0 items-center gap-1">{multiple && selected.length > 0 && <span className="rounded bg-muted px-1.5 text-xs">{selected.length}</span>}<ChevronDown className="size-4 opacity-60" /></span>
      </button>
      {open && !disabled && anchor && typeof document !== 'undefined' && createPortal(
        <>
          <button type="button" aria-label="Close options" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div style={panelStyle} className={cn("z-50 flex flex-col overflow-hidden rounded-md border bg-popover p-2 text-popover-foreground shadow-lg", popoverClassName)}>
        <div className="relative mb-2"><Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} className="h-9 pl-8 pr-8" /><button type="button" aria-label={clearSearchLabel} onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button></div>
        <div role="listbox" aria-multiselectable={multiple || undefined} className="min-h-0 flex-1 overflow-y-auto">
          {filtered.length ? filtered.map((option) => {
            const active = selected.includes(option.value)
            return <button key={option.value} type="button" role="option" aria-selected={active} disabled={option.disabled} onClick={() => commit(option)} className={cn('flex w-full items-start gap-2 rounded-sm px-2.5 py-2 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40', active && 'bg-accent/70')}>
              <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">{active && <Check className="size-3.5" />}</span>
              <span className="min-w-0 flex-1"><span className="block break-words">{option.label}</span>{option.description && <span className="mt-0.5 block text-xs text-muted-foreground">{option.description}</span>}</span>
            </button>
          }) : <p className="px-2.5 py-5 text-center text-sm text-muted-foreground">{emptyText}</p>}
        </div>
        {multiple && <div className="mt-2 flex items-center justify-between border-t pt-2"><span className="text-xs text-muted-foreground">{selected.length} {selectedText}</span><button type="button" onClick={() => { setOpen(false); setQuery('') }} className="rounded-md px-3 py-1.5 text-xs font-medium hover:bg-accent">{doneLabel}</button></div>}
      </div>
        </>
      , document.body)}
    </div>
  )
}
