'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, LoaderCircle, Store, Truck } from 'lucide-react'
import { appToast as toast } from '@/lib/toast'
import { LocaleSwitcher } from '@/components/common/locale-switcher'
import { useApp } from '@/components/providers'
import { Logo } from '@/components/shell/logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type BusinessType = 'sales' | 'bakery'
type Workflow = 'retail' | 'wholesale' | 'mixed' | 'fresh' | 'batch' | 'madeToOrder' | ''

export function OnboardingView() {
  const { t } = useApp()
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

  const finishPreview = () => {
    setIsLoading(true)
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      setIsLoading(false)
      setIsComplete(true)
      toast.info(t('onboarding.completeTitle'))
    }, 400)
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
    <main className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 sm:px-8">
        <header className="flex items-center justify-between gap-4 py-5">
          <Link href="/dashboard" aria-label={t('auth.backToDashboard')} className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Logo />
          </Link>
          <LocaleSwitcher />
        </header>

        <div className="flex flex-1 items-center justify-center pb-10">
          <Card className="w-full max-w-3xl border-border/80 shadow-xl shadow-black/5">
            <CardHeader className="gap-3 border-b pb-6">
              <span className="inline-flex w-fit items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                {t('onboarding.badge')}
              </span>
              <div className="grid gap-1.5">
                <CardTitle role="heading" aria-level={1} className="text-2xl tracking-tight sm:text-3xl">{t('onboarding.title')}</CardTitle>
                <CardDescription className="max-w-2xl leading-6">{t('onboarding.description')}</CardDescription>
              </div>
              <p role="note" className="rounded-lg border bg-muted/50 px-3 py-2 text-xs leading-5 text-muted-foreground">{t('onboarding.note')}</p>
            </CardHeader>

            <CardContent aria-busy={isLoading} className="grid gap-6 pt-6">
              {!isComplete ? (
                <>
                  <div className="grid gap-4">
                    <ol aria-label={t('onboarding.progress')} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {stepLabels.map((label, index) => (
                        <li
                          key={label}
                          aria-current={index === step ? 'step' : undefined}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${index === step ? 'border-primary/40 bg-primary/5 text-foreground' : index < step ? 'border-primary/20 text-primary' : 'text-muted-foreground'}`}
                        >
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold">
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
                      className="h-1.5 overflow-hidden rounded-full bg-muted"
                    >
                      <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${percent}%` }} />
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
                          <label key={value} className={`relative flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-ring/60 ${businessType === value ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/50'}`}>
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
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
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
                          <Label htmlFor="onboarding-business-name">{t('onboarding.businessName')}</Label>
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
                          <Label htmlFor="onboarding-city">{t('onboarding.city')}</Label>
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
                          <label key={choice.value} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors focus-within:ring-2 focus-within:ring-ring/60 ${workflow === choice.value ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/50'}`}>
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
                      <dl className="grid gap-3 rounded-xl border bg-muted/30 p-4 sm:grid-cols-2">
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
                  <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
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
              <CardFooter className="flex-col items-stretch gap-3 border-t pt-5 sm:flex-row sm:justify-between">
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
      </div>
    </main>
  )
}

