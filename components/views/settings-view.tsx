'use client'

import { useTheme } from 'next-themes'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
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

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
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

      <div role="tablist" aria-label={t('settings.title')} className="mb-6 flex flex-wrap gap-2">
        {tabs.map((x) => (
          <Button key={x.value} role="tab" aria-selected={tab === x.value} variant={tab === x.value ? 'default' : 'outline'} size="sm" onClick={() => setTab(x.value)}>
            {x.label}
          </Button>
        ))}
      </div>

      {tab === 'business' && (
        <SectionCard title={t('settings.business')} className="max-w-2xl">
          <div className="grid gap-4">
            <Field label={t('settings.businessName')}>
              <Input defaultValue="CuanApp Sales" />
            </Field>
            <Field label={t('settings.businessType')}>
              <Input value="CuanApp Sales" disabled readOnly />
            </Field>
            <Field label={t('settings.currency')} hint={t('settings.currencyLocked')}>
              <Input value="IDR (Rp)" disabled readOnly />
            </Field>
            <Field label={t('settings.costing')}>
              <Input value={t('settings.costingValue')} disabled readOnly />
            </Field>
            <p className="text-xs text-muted-foreground">{t('common.prototypeNote')}</p>
          </div>
        </SectionCard>
      )}

      {tab === 'features' && (
        <SectionCard title={t('settings.features')} description={t('settings.featuresHint')} className="max-w-2xl">
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
        <SectionCard title={t('settings.profile')} className="max-w-2xl">
          <div className="grid gap-4">
            <Field label={t('settings.name')}>
              <Input defaultValue="Shane" />
            </Field>
            <Field label={t('settings.email')}>
              <Input type="email" defaultValue="shane@cuanapp.id" />
            </Field>
            <Field label={t('settings.role')}>
              <Input value={t('settings.owner')} disabled readOnly />
            </Field>
            <p className="text-xs text-muted-foreground">{t('common.prototypeNote')}</p>
          </div>
        </SectionCard>
      )}

      {tab === 'preferences' && (
        <SectionCard title={t('settings.preferences')} className="max-w-2xl">
          <div className="grid gap-6">
            <Field label={t('top.language')}>
              <div className="flex flex-wrap gap-2">
                {languages.map((l) => (
                  <Button key={l.value} variant={locale === l.value ? 'default' : 'outline'} size="sm" aria-pressed={locale === l.value} onClick={() => setLocale(l.value)}>
                    {l.label}
                  </Button>
                ))}
              </div>
            </Field>
            <Field label={t('settings.theme')}>
              <div className="flex flex-wrap gap-2">
                {themes.map((x) => (
                  <Button key={x.value} variant={theme === x.value ? 'default' : 'outline'} size="sm" aria-pressed={theme === x.value} onClick={() => setTheme(x.value)}>
                    {x.label}
                  </Button>
                ))}
              </div>
            </Field>
          </div>
        </SectionCard>
      )}
    </>
  )
}
