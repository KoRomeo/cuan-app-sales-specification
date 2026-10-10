'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { ArrowRight, CheckCircle2, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { LocaleSwitcher } from '@/components/common/locale-switcher'
import { useApp } from '@/components/providers'
import { Logo } from '@/components/shell/logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { appToast as toast } from '@/lib/toast'

type ResetMode = 'forgot' | 'reset'

export function PasswordResetView({ mode }: { mode: ResetMode }) {
  const { t } = useApp()
  const isForgot = mode === 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [complete, setComplete] = useState(false)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    if (isForgot && !validEmail) {
      setError(t('auth.validationEmail'))
      return
    }
    if (!isForgot && password.length < 8) {
      setError(t('auth.validationPassword'))
      return
    }
    if (!isForgot && password !== confirm) {
      setError(t('auth.validationConfirm'))
      return
    }
    setError('')
    setIsLoading(true)
    window.setTimeout(() => {
      setIsLoading(false)
      setComplete(true)
      toast.info(t(isForgot ? 'auth.resetSent' : 'auth.resetComplete'))
    }, 400)
  }

  return (
    <main className="auth-light min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh max-w-[560px] flex-col px-5 sm:px-8">
        <header className="flex items-center justify-between gap-4 py-6">
          <Link href="/login" aria-label={t('auth.backToDashboard')} className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Logo />
          </Link>
          <LocaleSwitcher />
        </header>
        <div className="flex flex-1 items-center justify-center pb-12">
          <Card className="w-full border-border/80 shadow-xl shadow-black/5">
            <CardHeader className="gap-3">
              <span className="inline-flex w-fit rounded-full border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">{t('auth.badge')}</span>
              <div className="grid gap-1.5">
                <CardTitle className="text-2xl tracking-tight">{t(isForgot ? 'auth.forgotTitle' : 'auth.resetTitle')}</CardTitle>
                <CardDescription className="leading-6">{t(isForgot ? 'auth.forgotDescription' : 'auth.resetDescription')}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form noValidate onSubmit={submit} aria-busy={isLoading} className="grid gap-4">
                {isForgot ? (
                  <div className="grid gap-1.5">
                    <Label htmlFor="reset-email">{t('auth.email')}</Label>
                    <Input id="reset-email" type="email" inputMode="email" autoComplete="email" value={email} disabled={isLoading} aria-invalid={Boolean(error)} onChange={(event) => { setEmail(event.target.value); setError(''); setComplete(false) }} />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-1.5">
                      <Label htmlFor="new-password">{t('auth.password')}</Label>
                      <div className="relative">
                        <Input id="new-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} value={password} disabled={isLoading} aria-invalid={Boolean(error)} className="pr-11" onChange={(event) => { setPassword(event.target.value); setError(''); setComplete(false) }} />
                        <Button type="button" variant="ghost" size="icon-sm" className="absolute right-1 top-1/2 -translate-y-1/2" aria-label={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff /> : <Eye />}</Button>
                      </div>
                      <p className="text-xs text-muted-foreground">{t('auth.passwordHint')}</p>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="confirm-password">{t('auth.confirmPassword')}</Label>
                      <Input id="confirm-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirm} disabled={isLoading} aria-invalid={Boolean(error)} onChange={(event) => { setConfirm(event.target.value); setError(''); setComplete(false) }} />
                    </div>
                  </>
                )}
                {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <LoaderCircle className="animate-spin" data-icon="inline-start" aria-hidden="true" />}
                  {isLoading ? t('auth.checking') : t(isForgot ? 'auth.sendResetAction' : 'auth.resetAction')}
                  {!isLoading && <ArrowRight data-icon="inline-end" aria-hidden="true" />}
                </Button>
              </form>
              {complete && <div role="status" aria-live="polite" className="mt-4 flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /><p className="text-sm leading-6 text-muted-foreground">{t(isForgot ? 'auth.resetSent' : 'auth.resetComplete')}</p></div>}
            </CardContent>
            <CardFooter className="flex-col gap-3 border-t pt-5">
              <Link href={isForgot ? '/login' : '/forgot-password'} className="text-sm font-medium text-primary underline-offset-4 hover:underline">{isForgot ? t('auth.toLogin') : t('auth.forgotPassword')}</Link>
              <Link href="/dashboard" className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">{t('auth.backToDashboard')}</Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  )
}
