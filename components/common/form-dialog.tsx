'use client'

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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export interface FormField {
  name: string
  label: string
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea'
  options?: { value: string; label: string }[]
  defaultValue?: string
  placeholder?: string
  hint?: string
  half?: boolean
  prefix?: string
}

export const selectClass =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30'

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  submitLabel,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  fields: FormField[]
  submitLabel?: string
  children?: React.ReactNode
}) {
  const { t } = useApp()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onOpenChange(false)
          }}
          className="flex flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle className="text-base">{title}</DialogTitle>
            <DialogDescription>{description ?? t('common.prototypeNote')}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            {fields.map((f) => {
              const id = `field-${f.name}`
              return (
                <div key={f.name} className={cn('flex flex-col gap-1.5', f.half ? 'col-span-2 sm:col-span-1' : 'col-span-2')}>
                  <Label htmlFor={id}>{f.label}</Label>
                  {f.type === 'select' ? (
                    <select id={id} name={f.name} defaultValue={f.defaultValue} className={selectClass}>
                      {f.options?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : f.type === 'textarea' ? (
                    <Textarea id={id} name={f.name} defaultValue={f.defaultValue} placeholder={f.placeholder} rows={3} />
                  ) : (
                    <div className="relative">
                      {f.prefix && (
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          {f.prefix}
                        </span>
                      )}
                      <Input
                        id={id}
                        name={f.name}
                        type={f.type ?? 'text'}
                        defaultValue={f.defaultValue}
                        placeholder={f.placeholder}
                        className={cn(f.prefix && 'pl-8', f.type === 'number' && 'font-mono tabular-nums')}
                      />
                    </div>
                  )}
                  {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
                </div>
              )
            })}
          </div>

          {children}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">{submitLabel ?? t('common.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
