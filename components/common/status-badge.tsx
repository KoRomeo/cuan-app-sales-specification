'use client'

import { ChevronDown, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '@/components/providers'
import { type Tone, toneDot, toneSoft } from '@/components/common/tone'
import type { OrderStatus, PaymentStatus, StockStatus } from '@/lib/data'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export function Pill({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium', toneSoft[tone], className)}>
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', toneDot[tone])} />
      {children}
    </span>
  )
}

const orderTone: Record<OrderStatus, Tone> = { requested: 'warning', ready: 'primary', delivered: 'success', cancelled: 'neutral' }
const paymentTone: Record<PaymentStatus, Tone> = { unpaid: 'destructive', partial: 'warning', paid: 'success' }
const stockTone: Record<StockStatus, Tone> = { normal: 'success', low: 'warning', negative: 'destructive' }

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useApp()
  return <Pill tone={orderTone[status]}>{t(`status.${status}`)}</Pill>
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { t } = useApp()
  return <Pill tone={paymentTone[status]}>{t(`pay.${status}`)}</Pill>
}

export function StockStatusBadge({ status }: { status: StockStatus }) {
  const { t } = useApp()
  return <Pill tone={stockTone[status]}>{t(`stock.${status}`)}</Pill>
}

export interface StatusOption<T extends string = string> {
  value: T
  label: string
  tone: Tone
  disabled?: boolean
}

export function StatusDropdown<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
  align = 'end',
}: {
  value: T
  options: StatusOption<T>[]
  onChange: (value: T) => void
  disabled?: boolean
  align?: 'start' | 'center' | 'end'
}) {
  const [pendingValue, setPendingValue] = useState<T | null>(null)
  const [saving, setSaving] = useState(false)
  const current = options.find((option) => option.value === value)
  const pending = options.find((option) => option.value === pendingValue)
  if (!current) return null
  return (
    <div className="flex w-full justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="sm" disabled={disabled} className="h-7 gap-1 rounded-full px-2 hover:bg-muted" aria-label={`Status: ${current.label}. Change status`} />}>
          <Pill tone={current.tone} className="px-2">{current.label}</Pill>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="min-w-44">
          {options.map((option) => (
            <DropdownMenuItem
              key={option.value}
              disabled={disabled || option.disabled || option.value === value}
              onClick={() => setPendingValue(option.value)}
              className="cursor-pointer"
            >
              <Pill tone={option.tone}>{option.label}</Pill>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={pendingValue !== null} onOpenChange={(open) => { if (!open && !saving) setPendingValue(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <span className="flex size-10 items-center justify-center rounded-full bg-warning/15 text-warning"><AlertTriangle className="size-5" /></span>
            <DialogTitle>Confirm status change</DialogTitle>
            <DialogDescription>Change status from <strong>{current.label}</strong> to <strong>{pending?.label}</strong>? The change will only be saved after you confirm.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => setPendingValue(null)}>Cancel</Button>
            <Button type="button" disabled={saving || !pending} onClick={async () => {
              if (!pending) return
              setSaving(true)
              try { await onChange(pending.value); setPendingValue(null) } finally { setSaving(false) }
            }}>{saving ? 'Saving…' : 'Save status'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
