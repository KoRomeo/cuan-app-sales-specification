'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { ArrowRight, Boxes, CheckCircle2, Eye, EyeOff, LoaderCircle, ShoppingCart, Wallet } from 'lucide-react'
import { appToast as toast } from '@/lib/toast'
import { authClient } from '@/lib/auth-client'
import { LocaleSwitcher } from '@/components/common/locale-switcher'
import { useApp } from '@/components/providers'
import { Logo } from '@/components/shell/logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type AuthMode = 'login' | 'register'
type AuthField = 'name' | 'email' | 'password' | 'confirm'

function AuthField({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function AuthView({ mode }: { mode: AuthMode }) {
  const { t } = useApp()
  const router = useRouter()
  const [fields, setFields] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Partial<Record<AuthField, string>>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [showResetNotice, setShowResetNotice] = useState(false)

  const updateField = (field: AuthField, value: string) => {
    setFields((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      if (!current[field] && !(field === 'password' && current.confirm)) return current
      const next = { ...current }
      delete next[field]
      if (field === 'password' && mode === 'register') delete next.confirm
      return next
    })
    setIsComplete(false)
    setShowResetNotice(false)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: Partial<Record<AuthField, string>> = {}

    if (mode === 'register' && !fields.name.trim()) nextErrors.name = t('auth.validationName')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) nextErrors.email = t('auth.validationEmail')
    if (fields.password.length < 8) nextErrors.password = t('auth.validationPassword')
    if (mode === 'register' && fields.confirm !== fields.password) nextErrors.confirm = t('auth.validationConfirm')

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error(t('auth.validationError'))
      return
    }

    setIsLoading(true)
    setIsComplete(false)
    const result = mode === 'register'
      ? await authClient.signUp.email({ name: fields.name.trim(), email: fields.email.trim(), password: fields.password })
      : await authClient.signIn.email({ email: fields.email.trim(), password: fields.password })
      setIsLoading(false)
      if (result.error) {
        const errorMessage =
          result.error.message || "Login failed. Please try again."
        toast.error(errorMessage)
        setErrors({ email: errorMessage })
        return
      }
    router.push(isRegister ? '/onboarding' : '/dashboard')
    router.refresh()
  }

  const isRegister = mode === 'register'
  const title = t(isRegister ? 'auth.registerTitle' : 'auth.loginTitle')
  const description = t(isRegister ? 'auth.registerDescription' : 'auth.loginDescription')
  const submitLabel = t(isRegister ? 'auth.registerAction' : 'auth.loginAction')
  const resultMessage = t(isRegister ? 'auth.registerResult' : 'auth.loginResult')
  const highlights = [
    { label: t('nav.orders'), icon: ShoppingCart },
    { label: t('nav.products'), icon: Boxes },
    { label: t('nav.profitLoss'), icon: Wallet },
  ]

  return (
    <main className="auth-light min-h-dvh bg-background">
      <div className="mx-auto grid min-h-dvh max-w-[1440px] lg:grid-cols-[1.02fr_0.98fr]">
        <aside className="hidden flex-col justify-between border-r bg-muted/45 px-10 py-9 lg:flex xl:px-14">
          <Link href="/dashboard" aria-label={t('auth.backToDashboard')} className="w-fit rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Logo />
          </Link>

          <div className="max-w-lg">
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {t('auth.badge')}
            </span>
            <h2 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-foreground xl:text-5xl">
              {t('auth.brandTitle')}
            </h2>
            <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">{t('auth.brandDescription')}</p>

            <ul className="mt-9 grid gap-3">
              {highlights.map(({ label, icon: Icon }) => (
                <li key={label} className="flex items-center gap-3 rounded-xl border bg-card/70 px-4 py-3 text-sm font-medium">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon aria-hidden="true" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <p role="note" className="max-w-md text-xs leading-5 text-muted-foreground">{t('common.demoDataNotice')}</p>
        </aside>

        <section className="flex min-h-dvh flex-col">
          <header className="flex items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:justify-end lg:px-12">
            <Link href="/dashboard" aria-label={t('auth.backToDashboard')} className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden">
              <Logo />
            </Link>
            <LocaleSwitcher />
          </header>

          <div className="flex flex-1 items-center justify-center px-4 pb-10 sm:px-8 lg:px-12">
            <Card className="w-full max-w-md border-border/80 shadow-xl shadow-black/5">
              <CardHeader className="gap-3">
                <span className="inline-flex w-fit items-center rounded-full border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  {t('auth.badge')}
                </span>
                <div className="grid gap-1.5">
                  <CardTitle role="heading" aria-level={1} className="text-2xl tracking-tight">{title}</CardTitle>
                  <CardDescription className="leading-6">{description}</CardDescription>
                </div>
              </CardHeader>

              <CardContent>
                <form noValidate onSubmit={handleSubmit} aria-busy={isLoading} className="grid gap-4">
                  {isRegister && (
                    <AuthField id="auth-name" label={t('auth.name')} error={errors.name}>
                      <Input
                        id="auth-name"
                        name="name"
                        autoComplete="name"
                        required
                        value={fields.name}
                        disabled={isLoading}
                        aria-invalid={Boolean(errors.name)}
                        aria-describedby={errors.name ? 'auth-name-error' : undefined}
                        onChange={(event) => updateField('name', event.target.value)}
                      />
                    </AuthField>
                  )}

                  <AuthField id="auth-email" label={t('auth.email')} error={errors.email}>
                    <Input
                      id="auth-email"
                      name="email"
                      type="email"
                      required
                      inputMode="email"
                      autoComplete="email"
                      value={fields.email}
                      disabled={isLoading}
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? 'auth-email-error' : undefined}
                      onChange={(event) => updateField('email', event.target.value)}
                    />
                  </AuthField>

                  <AuthField id="auth-password" label={t('auth.password')} hint={t('auth.passwordHint')} error={errors.password}>
                    <div className="relative">
                      <Input
                        id="auth-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={isRegister ? 'new-password' : 'current-password'}
                        required
                        minLength={8}
                        value={fields.password}
                        disabled={isLoading}
                        aria-invalid={Boolean(errors.password)}
                        aria-describedby={`auth-password-hint${errors.password ? ' auth-password-error' : ''}`}
                        className="pr-11"
                        onChange={(event) => updateField('password', event.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2"
                        aria-label={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')}
                        disabled={isLoading}
                        onClick={() => setShowPassword((visible) => !visible)}
                      >
                        {showPassword ? <EyeOff /> : <Eye />}
                      </Button>
                    </div>
                  </AuthField>

                  {isRegister && (
                    <AuthField id="auth-confirm" label={t('auth.confirmPassword')} error={errors.confirm}>
                      <Input
                        id="auth-confirm"
                        name="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={fields.confirm}
                        disabled={isLoading}
                        aria-invalid={Boolean(errors.confirm)}
                        aria-describedby={errors.confirm ? 'auth-confirm-error' : undefined}
                        onChange={(event) => updateField('confirm', event.target.value)}
                      />
                    </AuthField>
                  )}

                  {!isRegister && (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto px-0"
                        nativeButton={false}
                        onClick={() => {
                          setShowResetNotice(true)
                          toast.info(t('auth.passwordResetPreview'))
                        }}
                        render={<Link href="/forgot-password" />}
                      >
                        {t('auth.forgotPassword')}
                      </Button>
                    </div>
                  )}

                  {showResetNotice && (
                    <p role="status" className="rounded-lg border bg-muted/60 px-3 py-2 text-xs leading-5 text-muted-foreground">
                      {t('auth.passwordResetPreview')}
                    </p>
                  )}

                  <Button type="submit" className="mt-1 w-full" disabled={isLoading}>
                    {isLoading && <LoaderCircle className="animate-spin" data-icon="inline-start" aria-hidden="true" />}
                    {isLoading ? t('auth.checking') : submitLabel}
                    {!isLoading && <ArrowRight data-icon="inline-end" aria-hidden="true" />}
                  </Button>
                </form>

                {isComplete && (
                  <div role="status" aria-live="polite" className="mt-4 rounded-xl border border-primary/25 bg-primary/5 p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                      <div className="grid gap-2">
                        <p className="text-sm font-semibold">{t('auth.previewComplete')}</p>
                        <p className="text-sm leading-6 text-muted-foreground">{resultMessage}</p>
                        <Button size="sm" variant="outline" className="mt-1 w-fit" nativeButton={false} render={<Link href="/onboarding" />}>
                          {t('auth.previewOnboarding')}
                          <ArrowRight data-icon="inline-end" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex-col items-stretch gap-4 border-t pt-5">
                <p className="text-center text-sm text-muted-foreground">
                  <Link href={isRegister ? '/login' : '/register'} className="font-medium text-primary underline-offset-4 hover:underline">
                    {t(isRegister ? 'auth.toLogin' : 'auth.toRegister')}
                  </Link>
                </p>
                <Link href="/dashboard" className="text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                  {t('auth.backToDashboard')}
                </Link>
              </CardFooter>
            </Card>
          </div>
        </section>
      </div>
    </main>
  )
}

