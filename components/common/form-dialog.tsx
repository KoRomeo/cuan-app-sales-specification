'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'
import { appToast as toast } from '@/lib/toast'
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
  required?: boolean
  min?: number
  max?: number
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
  onSubmit,
  persisted = false,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  fields: FormField[]
  submitLabel?: string
  onSubmit?: (values: Record<string, string>) => Promise<void> | void
  persisted?: boolean
  children?: React.ReactNode
}) {
  const { t } = useApp()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [validated, setValidated] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
  }, [])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
      setIsChecking(false)
      setErrors({})
      setValidated(false)
    }
    onOpenChange(nextOpen)
  }

  const clearFieldError = (name: string) => {
    setValidated(false)
    setErrors((current) => {
      if (!current[name]) return current
      const next = { ...current }
      delete next[name]
      return next
    })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isChecking) return
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[name]'))
    const invalid = controls.filter((control) => !control.validity.valid)
    const nextErrors = Object.fromEntries(
      invalid.map((control) => [control.name, control.validity.valueMissing ? t('form.fieldRequired') : t('form.invalidValue')]),
    )

    setErrors(nextErrors)
    if (invalid.length > 0) {
      setValidated(false)
      toast.error(t('form.validationError'))
      invalid[0]?.focus()
      return
    }

    setValidated(false)
    setIsChecking(true)
    const values = Object.fromEntries(controls.map((control) => [control.name, control.value]))
    if (onSubmit) {
      Promise.resolve(onSubmit(values))
        .then(() => {
          setIsChecking(false)
          setValidated(true)
        })
        .catch((error) => {
          setIsChecking(false)
          toast.error(error instanceof Error ? error.message : t('form.validationError'))
        })
      return
    }
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      setIsChecking(false)
      setValidated(true)
      toast.info(t('form.previewFeedback'))
    }, 350)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form noValidate onSubmit={handleSubmit} aria-busy={isChecking} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle className="text-base">{title}</DialogTitle>
            <DialogDescription>{description ?? t('common.prototypeNote')}</DialogDescription>
            {!persisted && <p role="note" className="rounded-md border bg-muted/50 px-3 py-2 text-xs leading-5 text-muted-foreground">{t('form.previewFeedback')}</p>}
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            {fields.map((field) => {
              const id = `field-${field.name}`
              const required = field.required ?? field.type !== 'textarea'
              const describedBy = [field.hint ? `${id}-hint` : null, errors[field.name] ? `${id}-error` : null].filter(Boolean).join(' ') || undefined
              return (
                <div key={field.name} className={cn('flex flex-col gap-1.5', field.half ? 'col-span-2 sm:col-span-1' : 'col-span-2')}>
                  <Label htmlFor={id}>
                    {field.label}
                    {required && <span aria-hidden="true" className="ml-1 text-destructive">*</span>}
                  </Label>
                  {field.type === 'select' ? (
                    <select
                      id={id}
                      name={field.name}
                      defaultValue={field.defaultValue}
                      required={required}
                      disabled={isChecking}
                      aria-invalid={Boolean(errors[field.name])}
                      aria-describedby={describedBy}
                      className={selectClass}
                      onChange={() => clearFieldError(field.name)}
                    >
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <Textarea
                      id={id}
                      name={field.name}
                      defaultValue={field.defaultValue}
                      placeholder={field.placeholder}
                      rows={3}
                      required={required}
                      disabled={isChecking}
                      aria-invalid={Boolean(errors[field.name])}
                      aria-describedby={describedBy}
                      onChange={() => clearFieldError(field.name)}
                    />
                  ) : (
                    <div className="relative">
                      {field.prefix && (
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          {field.prefix}
                        </span>
                      )}
                      <Input
                        id={id}
                        name={field.name}
                        type={field.type ?? 'text'}
                        defaultValue={field.defaultValue}
                        placeholder={field.placeholder}
                        required={required}
                        disabled={isChecking}
                        min={field.min}
                        max={field.max}
                        aria-invalid={Boolean(errors[field.name])}
                        aria-describedby={describedBy}
                        onChange={() => clearFieldError(field.name)}
                        className={cn(field.prefix && 'pl-8', field.type === 'number' && 'font-mono tabular-nums')}
                      />
                    </div>
                  )}
                  {field.hint && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{field.hint}</p>}
                  {errors[field.name] && <p id={`${id}-error`} role="alert" className="text-xs text-destructive">{errors[field.name]}</p>}
                </div>
              )
            })}
          </div>

          {children}

          {validated && (
            <div role="status" aria-live="polite" className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2">
              <p className="text-sm font-medium">{t('form.validated')}</p>
              <p className="text-xs leading-5 text-muted-foreground">{persisted ? t('form.savedFeedback') : t('form.previewFeedback')}</p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isChecking} aria-label={isChecking ? t('form.checking') : submitLabel ?? t('form.validateAction')}>
              {isChecking && <LoaderCircle data-icon="inline-start" className="animate-spin" aria-hidden="true" />}
              {isChecking ? t('form.checking') : submitLabel ?? t('form.validateAction')}
            </Button>

          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
