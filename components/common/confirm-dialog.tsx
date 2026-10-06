'use client'

import { AlertTriangle } from 'lucide-react'
import { useApp } from '@/components/providers'
import { useDomainError } from '@/lib/use-domain-error'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  onConfirm?: () => void
}) {
  const { t } = useApp()
  const { error, run, clear } = useDomainError()
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        clear()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <span className="flex size-10 items-center justify-center rounded-full bg-destructive/12 text-destructive">
            <AlertTriangle className="size-5" />
          </span>
          <DialogTitle className="text-base">{title}</DialogTitle>
          <DialogDescription className="leading-relaxed">{description}</DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={() => {
              if (run(() => onConfirm?.())) onOpenChange(false)
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
