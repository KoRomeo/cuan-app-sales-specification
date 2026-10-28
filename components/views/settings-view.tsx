'use client'

import { useTheme } from 'next-themes'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { appToast as toast } from '@/lib/toast'
import { PageHeader } from '@/components/common/page-header'
import { SectionCard } from '@/components/common/section-card'
import { type FeatureKey, useApp } from '@/components/providers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { Locale } from '@/lib/i18n'

type Tab = 'business' | 'features' | 'profile' | 'preferences'

const featureKeys: FeatureKey[] = ['inventory', 'purchasing', 'customerCredit', 'supplierCredit', 'ownDelivery', 'expedition', 'employees', 'accounting', 'tax']

function Field({ id, label, hint, error, required, children }: { id: string; label: string; hint?: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true" className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function SettingsView() {
  const { t, locale, setLocale, features, setFeature } = useApp()
  const { theme, setTheme } = useTheme()
  const params = useSearchParams()
  const requested = params.get('tab')
  const [tab, setTab] = useState<Tab>(
    requested === 'features' || requested === 'profile' || requested === 'preferences' ? requested : 'business',
  )
  const [businessName, setBusinessName] = useState('')
  const [businessLoading, setBusinessLoading] = useState(true)
  const [businessSaving, setBusinessSaving] = useState(false)
  const [businessError, setBusinessError] = useState('')
  const [profileName, setProfileName] = useState('Shane')
  const [profileEmail, setProfileEmail] = useState('shane@cuanapp.id')
  const [profileNameError, setProfileNameError] = useState('')
  const [profileEmailError, setProfileEmailError] = useState('')

  useEffect(() => {
    let active = true
    fetch('/api/businesses/current', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load business details')
        return response.json()
      })
      .then((business) => { if (active) setBusinessName(business.name ?? '') })
      .catch((error) => { if (active) toast.error(error instanceof Error ? error.message : 'Unable to load business details') })
      .finally(() => { if (active) setBusinessLoading(false) })
    return () => { active = false }
  }, [])

  const validateBusiness = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = businessName.trim()
    if (!name) {
      const message = t('settings.businessNameRequired')
      setBusinessError(message)
      toast.error(message)
      return
    }
    setBusinessSaving(true)
    setBusinessError('')
    try {
      const response = await fetch('/api/businesses/current', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error ?? 'Unable to save business name')
      setBusinessName(result.name ?? name)
      toast.success(locale === 'id' ? 'Nama bisnis berhasil disimpan.' : 'Business name saved.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save business name'
      setBusinessError(message)
      toast.error(message)
    } finally {
      setBusinessSaving(false)
    }
  }

  const validateProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nameError = profileName.trim() ? '' : t('settings.nameRequired')
    const emailError = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileEmail.trim()) ? '' : t('settings.emailInvalid')
    setProfileNameError(nameError)
    setProfileEmailError(emailError)
    if (nameError || emailError) {
      toast.error(t('settings.profileInvalid'))
      return
    }
    toast.success(t('settings.draftValidated'))
  }

  const tabs: { value: Tab; label: string }[] = [
    { value: 'business', label: t('settings.business') },
    { value: 'features', label: t('settings.features') },
    { value: 'profile', label: t('settings.profile') },
    { value: 'preferences', label: t('settings.preferences') },
  ]
  const languages: { value: Locale; label: string }[] = [
    { value: 'en', label: 'English' },
    { value: 'id', label: 'Bahasa Indonesia' },
  ]
  const themes = [
    { value: 'light', label: t('settings.light') },
    { value: 'dark', label: t('settings.dark') },
    { value: 'system', label: t('settings.system') },
  ]

  return (
    <>
      <PageHeader breadcrumbs={[{ label: t('nav.settings') }]} title={t('settings.title')} description={t('settings.desc')} />

      <div role="group" aria-label={t('settings.title')} className="mb-6 flex flex-wrap gap-2">
        {tabs.map((x) => (
          <Button key={x.value} type="button" aria-pressed={tab === x.value} variant={tab === x.value ? 'default' : 'outline'} size="sm" onClick={() => setTab(x.value)}>
            {x.label}
          </Button>
        ))}
      </div>

      {tab === 'business' && (
        <SectionCard title={t('settings.business')} description={t('settings.businessDesc')} className="max-w-2xl">
          <form onSubmit={validateBusiness} noValidate className="grid gap-4">
            <Field id="settings-business-name" label={t('settings.businessName')} error={businessError} required>
              <Input
                id="settings-business-name"
                value={businessName}
                disabled={businessLoading || businessSaving}
                required
                aria-invalid={Boolean(businessError)}
                aria-describedby={businessError ? 'settings-business-name-error' : undefined}
                onChange={(event) => {
                  setBusinessName(event.target.value)
                  setBusinessError('')
                }}
              />
            </Field>
            <Field id="settings-business-type" label={t('settings.businessType')}>
              <Input id="settings-business-type" value={t('onboarding.salesType')} disabled readOnly />
            </Field>
            <Field id="settings-currency" label={t('settings.currency')} hint={t('settings.currencyLocked')}>
              <Input id="settings-currency" value="IDR (Rp)" disabled readOnly aria-describedby="settings-currency-hint" />
            </Field>
            <Field id="settings-costing" label={t('settings.costing')}>
              <Input id="settings-costing" value={t('settings.costingValue')} disabled readOnly />
            </Field>
            <Button type="submit" disabled={businessLoading || businessSaving} className="w-fit">{businessSaving ? (locale === 'id' ? 'Menyimpan…' : 'Saving…') : t('settings.savePreview')}</Button>
          </form>
        </SectionCard>
      )}

      {tab === 'features' && (
        <SectionCard title={t('settings.features')} description={t('settings.featuresHint')} className="max-w-2xl">
          <p role="note" className="mb-2 text-xs text-muted-foreground">{t('settings.featureSessionOnly')}</p>
          <ul className="divide-y">
            {featureKeys.map((key) => (
              <li key={key} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <Label htmlFor={`feature-${key}`} className="text-sm font-medium">
                    {t(`feature.${key}`)}
                  </Label>
                  <p className="text-xs text-muted-foreground">{t(`feature.${key}Desc`)}</p>
                </div>
                <Switch id={`feature-${key}`} checked={features[key]} onCheckedChange={(v) => setFeature(key, v)} />
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {tab === 'profile' && (
        <SectionCard title={t('settings.profile')} description={t('settings.accountDesc')} className="max-w-2xl">
          <form onSubmit={validateProfile} noValidate className="grid gap-4">
            <Field id="settings-profile-name" label={t('settings.name')} error={profileNameError} required>
              <Input
                id="settings-profile-name"
                value={profileName}
                required
                autoComplete="name"
                aria-invalid={Boolean(profileNameError)}
                aria-describedby={profileNameError ? 'settings-profile-name-error' : undefined}
                onChange={(event) => {
                  setProfileName(event.target.value)
                  setProfileNameError('')
                }}
              />
            </Field>
            <Field id="settings-profile-email" label={t('settings.email')} error={profileEmailError} required>
              <Input
                id="settings-profile-email"
                type="email"
                value={profileEmail}
                required
                autoComplete="email"
                aria-invalid={Boolean(profileEmailError)}
                aria-describedby={profileEmailError ? 'settings-profile-email-error' : undefined}
                onChange={(event) => {
                  setProfileEmail(event.target.value)
                  setProfileEmailError('')
                }}
              />
            </Field>
            <Field id="settings-profile-role" label={t('settings.role')}>
              <Input id="settings-profile-role" value={t('settings.owner')} disabled readOnly />
            </Field>
            <Button type="submit" className="w-fit">{t('settings.savePreview')}</Button>
          </form>
        </SectionCard>
      )}

      {tab === 'preferences' && (
        <SectionCard title={t('settings.preferences')} description={t('settings.preferencesDesc')} className="max-w-2xl">
          <div className="grid gap-6">
            <fieldset className="grid gap-1.5">
              <legend className="text-sm font-medium">{t('top.language')}</legend>
              <div className="flex flex-wrap gap-2">
                {languages.map((language) => (
                  <Button key={language.value} type="button" variant={locale === language.value ? 'default' : 'outline'} size="sm" aria-pressed={locale === language.value} onClick={() => setLocale(language.value)}>
                    {language.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{t('settings.languageNote')}</p>
            </fieldset>
            <fieldset className="grid gap-1.5">
              <legend className="text-sm font-medium">{t('settings.theme')}</legend>
              <div className="flex flex-wrap gap-2">
                {themes.map((option) => (
                  <Button key={option.value} type="button" variant={theme === option.value ? 'default' : 'outline'} size="sm" aria-pressed={theme === option.value} onClick={() => setTheme(option.value)}>
                    {option.label}
                  </Button>
                ))}
              </div>
            </fieldset>
          </div>
        </SectionCard>
      )}
    </>
  )
}
