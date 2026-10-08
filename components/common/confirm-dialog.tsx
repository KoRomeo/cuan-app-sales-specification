'use client'

import { AlertTriangle, Info } from 'lucide-react'
import { useApp } from '@/components/providers'
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
  previewOnly = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  onConfirm?: () => void
  previewOnly?: boolean
}) {
  const { t } = useApp()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <span className={`flex size-10 items-center justify-center rounded-full ${previewOnly ? 'bg-muted text-muted-foreground' : 'bg-destructive/12 text-destructive'}`}>
            {previewOnly ? <Info className="size-5" /> : <AlertTriangle className="size-5" />}
          </span>
          <DialogTitle className="text-base">{title}</DialogTitle>
          <DialogDescription className="leading-relaxed">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant={previewOnly ? 'outline' : 'destructive'}
            onClick={() => {
              onConfirm?.()
              onOpenChange(false)
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
