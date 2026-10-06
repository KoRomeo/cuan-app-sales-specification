'use client'

import { useApp } from '@/components/providers'
import { type Tone, toneDot, toneSoft } from '@/components/common/tone'
import type { OrderStatus, PaymentStatus, StockStatus } from '@/lib/data'
import { cn } from '@/lib/utils'

export function Pill({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium',
        toneSoft[tone],
        className,
      )}
    >
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', toneDot[tone])} />
      {children}
    </span>
  )
}

const orderTone: Record<OrderStatus, Tone> = {
  requested: 'warning',
  ready: 'primary',
  delivered: 'success',
  cancelled: 'neutral',
}

const paymentTone: Record<PaymentStatus, Tone> = {
  unpaid: 'destructive',
  partial: 'warning',
  paid: 'success',
}

const stockTone: Record<StockStatus, Tone> = {
  normal: 'success',
  low: 'warning',
  negative: 'destructive',
}

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
