'use client'

import Link from 'next/link'
import Image from 'next/image'
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
    <main className="auth-light relative min-h-screen bg-[#0E2A63] sm:px-7 sm:py-4">
      {/* square grid across the mat, like a self-healing cutting mat */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden sm:block"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to right, rgba(255,255,255,.14) 0 1px, transparent 1px 40px), repeating-linear-gradient(to bottom, rgba(255,255,255,.14) 0 1px, transparent 1px 40px), repeating-linear-gradient(to right, rgba(255,255,255,.30) 0 1px, transparent 1px 200px), repeating-linear-gradient(to bottom, rgba(255,255,255,.30) 0 1px, transparent 1px 200px)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1680px]">
        {/* torn-off nav strip, same as the landing page */}
        <header className="sticky top-3 z-40 flex h-12 items-center justify-between gap-4 border border-[#101A26]/25 bg-[#FCFCFA]/95 px-4 shadow-[0_10px_30px_-18px_rgba(0,0,0,.5)] backdrop-blur sm:px-6">
          <Link href="/" aria-label={t('auth.backToDashboard')} className="flex items-center gap-2.5">
            <span className="inline-flex h-7 w-7 items-center justify-center bg-[#0E2A63]">
              <Image src="/cuanapp-logo.svg" alt="" width={15} height={15} />
            </span>
            <span className="text-[14px] font-semibold tracking-[-.02em] text-[#101A26]">CuanApp</span>
          </Link>
          <LocaleSwitcher className="rounded-[2px] border-[#101A26]/20 bg-transparent" />
        </header>

        {/* paper sheet with one centred card */}
        <div className="relative mt-3 border border-[#101A26]/25 bg-[#FCFCFA]">
          <div className="pointer-events-none absolute inset-y-0 left-8 hidden w-px sm:block" style={{ backgroundImage: "repeating-linear-gradient(to bottom, rgba(16,26,38,.30) 0 4px, transparent 4px 10px)" }} />
          <div className="pointer-events-none absolute inset-y-0 right-8 hidden w-px sm:block" style={{ backgroundImage: "repeating-linear-gradient(to bottom, rgba(16,26,38,.30) 0 4px, transparent 4px 10px)" }} />
          <div aria-hidden className="punch-holes pointer-events-none absolute inset-y-4 left-[10px] hidden w-[9px] sm:block" />
          <div aria-hidden className="punch-holes pointer-events-none absolute inset-y-4 right-[10px] hidden w-[9px] sm:block" />

          <div className="flex min-h-[calc(100vh-9rem)] items-center justify-center px-4 py-12 sm:px-8">
<Card className="w-full max-w-[420px] rounded-[2px] border-[#101A26]/25 bg-white shadow-[0_20px_50px_-30px_rgba(10,20,40,.45)]">
              <CardHeader className="gap-3 border-b border-[#101A26]/15 pb-4">
                <span className="inline-flex w-fit items-center border border-[#0E2A63]/30 px-2 py-1 font-mono text-[10px] uppercase tracking-[.18em] text-[#0E2A63]">
                  CuanApp
                </span>
                <div className="grid gap-1.5">
                  <CardTitle role="heading" aria-level={1} className="text-[26px] font-semibold leading-[1.1] tracking-[-.035em] text-[#101A26]">{title}</CardTitle>
                  <CardDescription className="text-[13px] leading-[1.65] text-[#3C4A5A]">{description}</CardDescription>
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

                  <Button type="submit" className="mt-1 w-full rounded-[2px] bg-[#0E2A63] hover:bg-[#0A1F4A]" disabled={isLoading}>
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

              <CardFooter className="flex-col items-stretch gap-4 border-t border-[#101A26]/15 pt-5">
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

          <div className="border-t border-[#101A26]/15 px-4 py-4 sm:px-6">
            <p className="font-mono text-[10px] uppercase tracking-[.16em] text-[#8A94A1]">
              CuanApp — Business operating system · 2026
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
