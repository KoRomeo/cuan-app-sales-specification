'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, LoaderCircle, Store, Truck } from 'lucide-react'
import { appToast as toast } from '@/lib/toast'
import { MeasuredPageFrame } from '@/components/landing/measured-page-frame'
import { useApp } from '@/components/providers'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type BusinessType = 'sales' | 'bakery'
type Workflow = 'retail' | 'wholesale' | 'mixed' | 'fresh' | 'batch' | 'madeToOrder' | ''

export function OnboardingView() {
  const { t } = useApp()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [businessType, setBusinessType] = useState<BusinessType>('sales')
  const [businessName, setBusinessName] = useState('')
  const [city, setCity] = useState('')
  const [workflow, setWorkflow] = useState<Workflow>('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
  }, [])

  const stepLabels = [
    t('onboarding.stepBusiness'),
    t('onboarding.stepDetails'),
    t('onboarding.stepWorkflow'),
    t('onboarding.stepReview'),
  ]
  const percent = Math.round(((step + 1) / stepLabels.length) * 100)
  const workflowChoices: { value: Workflow; label: string }[] = businessType === 'sales'
    ? [
        { value: 'retail', label: t('onboarding.retail') },
        { value: 'wholesale', label: t('onboarding.wholesale') },
        { value: 'mixed', label: t('onboarding.mixed') },
      ]
    : [
        { value: 'fresh', label: t('onboarding.fresh') },
        { value: 'batch', label: t('onboarding.batch') },
        { value: 'madeToOrder', label: t('onboarding.madeToOrder') },
      ]

  const advance = (skip = false) => {
    if (step === 1 && !skip && !businessName.trim()) {
      setError(t('onboarding.requiredError'))
      return
    }
    setError('')
    setStep((current) => Math.min(current + 1, 3))
  }

  const goBack = () => {
    setError('')
    setStep((current) => Math.max(current - 1, 0))
  }

  const finishPreview = async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: businessName.trim(), type: businessType }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error ?? 'Unable to create business')
      }
      setIsComplete(true)
      toast.success(t('onboarding.completeTitle'))
      router.refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create business')
      toast.error(reason instanceof Error ? reason.message : 'Unable to create business')
    } finally {
      setIsLoading(false)
    }
  }

  const restart = () => {
    setStep(0)
    setBusinessType('sales')
    setBusinessName('')
    setCity('')
    setWorkflow('')
    setError('')
    setIsComplete(false)
  }

  return (
    <MeasuredPageFrame contentClassName="flex flex-col">
      <div className="flex flex-1 items-center justify-center px-4 py-6 sm:px-10 sm:py-10">
          <Card className="w-full max-w-[900px] rounded-none border-[#101A26]/20 bg-[#FCFCFA] shadow-none">
            <CardHeader className="gap-3 border-b border-[#101A26]/15 px-5 py-5 sm:px-8 sm:py-7">
              <span className="inline-flex w-fit items-center border border-[#0E2A63]/30 px-2 py-1 font-mono text-[10px] uppercase tracking-[.16em] text-[#0E2A63]">
                {t('onboarding.badge')}
              </span>
              <div className="grid gap-1.5">
                <CardTitle role="heading" aria-level={1} className="text-[24px] font-semibold leading-[1.15] tracking-[-.03em] text-[#101A26] sm:text-[30px]">{t('onboarding.title')}</CardTitle>
                <CardDescription className="max-w-[65ch] text-[13.5px] leading-[1.65] text-[#3C4A5A]">{t('onboarding.description')}</CardDescription>
              </div>
              <p role="note" className="border-l-2 border-[#0E2A63] bg-[#0E2A63]/[.04] px-3 py-2 text-xs leading-5 text-[#3C4A5A]">{t('onboarding.note')}</p>
            </CardHeader>

            <CardContent aria-busy={isLoading} className="grid gap-6 px-5 py-5 sm:px-8 sm:py-7">
              {!isComplete ? (
                <>
                  <div className="grid gap-4">
                    <ol aria-label={t('onboarding.progress')} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {stepLabels.map((label, index) => (
                        <li
                          key={label}
                          aria-current={index === step ? 'step' : undefined}
                          className={`flex items-center gap-2 border px-3 py-2 text-xs ${index === step ? 'border-[#0E2A63]/40 bg-[#0E2A63]/[.04] text-[#101A26]' : index < step ? 'border-[#0E2A63]/20 text-[#0E2A63]' : 'border-[#101A26]/15 text-[#6B7887]'}`}
                        >
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-[2px] border text-[11px] font-semibold">
                            {index < step ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
                          </span>
                          <span className="leading-4">{label}</span>
                        </li>
                      ))}
                    </ol>
                    <div
                      role="progressbar"
                      aria-label={t('onboarding.progress')}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percent}
                      className="h-1 overflow-hidden bg-[#101A26]/10"
                    >
                      <div className="h-full bg-[#0E2A63] transition-[width] duration-300" style={{ width: `${percent}%` }} />
                    </div>
                  </div>

                  {step === 0 && (
                    <section aria-labelledby="onboarding-business-type-title" className="grid gap-4">
                      <div className="grid gap-1">
                        <h2 id="onboarding-business-type-title" className="text-lg font-semibold">{t('onboarding.businessTypeTitle')}</h2>
                        <p className="text-sm text-muted-foreground">{t('onboarding.businessTypeDescription')}</p>
                      </div>
                      <fieldset className="grid gap-3 sm:grid-cols-2">
                        <legend className="sr-only">{t('onboarding.businessTypeTitle')}</legend>
                        {([
                          { value: 'sales' as const, label: t('onboarding.salesType'), description: t('onboarding.salesTypeDescription'), icon: Truck },
                          { value: 'bakery' as const, label: t('onboarding.bakeryType'), description: t('onboarding.bakeryTypeDescription'), icon: Store },
                        ]).map(({ value, label, description, icon: Icon }) => (
                          <label key={value} className={`relative flex cursor-pointer gap-3 rounded-[2px] border p-4 transition-colors focus-within:ring-2 focus-within:ring-[#0E2A63]/60 ${businessType === value ? 'border-[#0E2A63] bg-[#0E2A63]/[.04]' : 'border-[#101A26]/20 hover:bg-[#101A26]/[.02]'}`}>
                            <input
                              type="radio"
                              name="businessType"
                              value={value}
                              checked={businessType === value}
                              onChange={() => {
                                setBusinessType(value)
                                setWorkflow('')
                              }}
                              className="sr-only"
                            />
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-[2px] bg-[#0E2A63]/[.08] text-[#0E2A63]">
                              <Icon aria-hidden="true" />
                            </span>
                            <span className="grid gap-1">
                              <span className="font-medium">{label}</span>
                              <span className="text-xs leading-5 text-muted-foreground">{description}</span>
                            </span>
                            {businessType === value && <CheckCircle2 className="absolute right-3 top-3 size-4 text-primary" aria-hidden="true" />}
                          </label>
                        ))}
                      </fieldset>
                    </section>
                  )}

                  {step === 1 && (
                    <section aria-labelledby="onboarding-business-details-title" className="grid gap-4">
                      <div className="grid gap-1">
                        <h2 id="onboarding-business-details-title" className="text-lg font-semibold">{t('onboarding.stepDetails')}</h2>
                        <p className="text-sm text-muted-foreground">{t('onboarding.detailsDescription')}</p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-1.5">
                          <Label htmlFor="onboarding-business-name" className="font-mono text-[10px] uppercase tracking-[.16em] text-[#3C4A5A]">{t('onboarding.businessName')}</Label>
                          <Input
                            id="onboarding-business-name"
                            required
                            value={businessName}
                            placeholder={t('onboarding.businessNamePlaceholder')}
                            aria-invalid={Boolean(error)}
                            aria-describedby={error ? 'onboarding-name-error' : undefined}
                            onChange={(event) => {
                              setBusinessName(event.target.value)
                              setError('')
                            }}
                          />
                          {error && <p id="onboarding-name-error" role="alert" className="text-xs text-destructive">{error}</p>}
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor="onboarding-city" className="font-mono text-[10px] uppercase tracking-[.16em] text-[#3C4A5A]">{t('onboarding.city')}</Label>
                          <Input id="onboarding-city" value={city} placeholder={t('onboarding.cityPlaceholder')} onChange={(event) => setCity(event.target.value)} />
                        </div>
                      </div>
                    </section>
                  )}

                  {step === 2 && (
                    <section aria-labelledby="onboarding-workflow-title" className="grid gap-4">
                      <div className="grid gap-1">
                        <h2 id="onboarding-workflow-title" className="text-lg font-semibold">{t(businessType === 'sales' ? 'onboarding.workflowSales' : 'onboarding.workflowBakery')}</h2>
                        <p className="text-sm text-muted-foreground">{t('onboarding.workflowDescription')}</p>
                      </div>
                      <fieldset className="grid gap-3 sm:grid-cols-3">
                        <legend className="sr-only">{t(businessType === 'sales' ? 'onboarding.workflowSales' : 'onboarding.workflowBakery')}</legend>
                        {workflowChoices.map((choice) => (
                          <label key={choice.value} className={`flex cursor-pointer items-center gap-3 rounded-[2px] border px-4 py-3 transition-colors focus-within:ring-2 focus-within:ring-[#0E2A63]/60 ${workflow === choice.value ? 'border-[#0E2A63] bg-[#0E2A63]/[.04]' : 'border-[#101A26]/20 hover:bg-[#101A26]/[.02]'}`}>
                            <input
                              type="radio"
                              name="workflow"
                              value={choice.value}
                              checked={workflow === choice.value}
                              onChange={() => setWorkflow(choice.value)}
                              className="size-4 accent-primary"
                            />
                            <span className="text-sm font-medium">{choice.label}</span>
                          </label>
                        ))}
                      </fieldset>
                    </section>
                  )}

                  {step === 3 && (
                    <section aria-labelledby="onboarding-review-title" className="grid gap-4">
                      <div className="grid gap-1">
                        <h2 id="onboarding-review-title" className="text-lg font-semibold">{t('onboarding.reviewSummary')}</h2>
                        <p className="text-sm text-muted-foreground">{t('onboarding.reviewDescription')}</p>
                      </div>
                      <dl className="grid gap-3 border border-[#101A26]/15 bg-[#101A26]/[.02] p-4 sm:grid-cols-2">
                        <div className="grid gap-1">
                          <dt className="text-xs text-muted-foreground">{t('onboarding.businessTypeLabel')}</dt>
                          <dd className="text-sm font-medium">{t(businessType === 'sales' ? 'onboarding.salesType' : 'onboarding.bakeryType')}</dd>
                        </div>
                        <div className="grid gap-1">
                          <dt className="text-xs text-muted-foreground">{t('onboarding.businessName')}</dt>
                          <dd className="text-sm font-medium">{businessName.trim() || t('onboarding.emptyValue')}</dd>
                        </div>
                        <div className="grid gap-1">
                          <dt className="text-xs text-muted-foreground">{t('onboarding.city')}</dt>
                          <dd className="text-sm font-medium">{city.trim() || t('onboarding.emptyValue')}</dd>
                        </div>
                        <div className="grid gap-1">
                          <dt className="text-xs text-muted-foreground">{t('onboarding.workflowLabel')}</dt>
                          <dd className="text-sm font-medium">{workflowChoices.find((choice) => choice.value === workflow)?.label ?? t('onboarding.emptyValue')}</dd>
                        </div>
                      </dl>
                    </section>
                  )}
                </>
              ) : (
                <section aria-labelledby="onboarding-complete-title" className="grid justify-items-center gap-4 py-8 text-center">
                  <span className="flex size-14 items-center justify-center rounded-[2px] bg-[#0E2A63]/[.08] text-[#0E2A63]">
                    <CheckCircle2 className="size-7" aria-hidden="true" />
                  </span>
                  <div className="grid max-w-lg gap-2">
                    <h2 id="onboarding-complete-title" className="text-xl font-semibold">{t('onboarding.completeTitle')}</h2>
                    <p className="text-sm leading-6 text-muted-foreground">{t('onboarding.completeDescription')}</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button nativeButton={false} render={<Link href="/dashboard" />}>
                      {t('onboarding.previewDashboard')}
                      <ArrowRight data-icon="inline-end" aria-hidden="true" />
                    </Button>
                    <Button variant="outline" onClick={restart}>{t('onboarding.restart')}</Button>
                  </div>
                </section>
              )}
            </CardContent>

            {!isComplete && (
              <CardFooter className="flex-col items-stretch gap-3 border-t border-[#101A26]/15 px-5 py-4 sm:flex-row sm:justify-between sm:px-8">
                <div>
                  {step === 0 ? (
                    <Button variant="ghost" disabled={isLoading} nativeButton={false} render={<Link href="/register" />}>
                      <ArrowLeft data-icon="inline-start" aria-hidden="true" />
                      {t('onboarding.back')}
                    </Button>
                  ) : (
                    <Button variant="ghost" disabled={isLoading} onClick={goBack}>
                      <ArrowLeft data-icon="inline-start" aria-hidden="true" />
                      {t('onboarding.back')}
                    </Button>
                  )}
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  {step < 3 ? (
                    <>
                      <Button variant="outline" disabled={isLoading} onClick={() => advance(true)}>{t('onboarding.skip')}</Button>
                      <Button disabled={isLoading} onClick={() => advance(false)}>
                        {t('onboarding.continue')}
                        <ArrowRight data-icon="inline-end" aria-hidden="true" />
                      </Button>
                    </>
                  ) : (
                    <Button onClick={finishPreview} disabled={isLoading}>
                      {isLoading ? <LoaderCircle className="animate-spin" data-icon="inline-start" aria-hidden="true" /> : null}
                      {isLoading ? t('onboarding.loading') : t('onboarding.completeAction')}
                    </Button>
                  )}
                </div>
              </CardFooter>
            )}
          </Card>
      </div>
    </MeasuredPageFrame>
  )
}

