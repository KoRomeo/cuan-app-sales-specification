'use client'

import { useTheme } from 'next-themes'
import { Lock, Monitor, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/common/page-header'
import { type FeatureKey, useApp } from '@/components/providers'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { TranslationKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type Tab = 'business' | 'profile' | 'features' | 'preferences'

const tabs: { value: Tab; label: TranslationKey }[] = [
  { value: 'business', label: 'settings.business' },
  { value: 'profile', label: 'settings.profile' },
  { value: 'features', label: 'settings.features' },
  { value: 'preferences', label: 'settings.preferences' },
]

const featureList: { key: FeatureKey; label: TranslationKey; desc: TranslationKey }[] = [
  { key: 'inventory', label: 'feature.inventory', desc: 'feature.inventoryDesc' },
  { key: 'negativeStock', label: 'feature.negativeStock', desc: 'feature.negativeStockDesc' },
  { key: 'purchasing', label: 'feature.purchasing', desc: 'feature.purchasingDesc' },
  { key: 'customerCredit', label: 'feature.customerCredit', desc: 'feature.customerCreditDesc' },
  { key: 'supplierCredit', label: 'feature.supplierCredit', desc: 'feature.supplierCreditDesc' },
  { key: 'ownDelivery', label: 'feature.ownDelivery', desc: 'feature.ownDeliveryDesc' },
  { key: 'expedition', label: 'feature.expedition', desc: 'feature.expeditionDesc' },
  { key: 'employees', label: 'feature.employees', desc: 'feature.employeesDesc' },
  { key: 'accounting', label: 'feature.accounting', desc: 'feature.accountingDesc' },
  { key: 'tax', label: 'feature.tax', desc: 'feature.taxDesc' },
]

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="max-w-2xl rounded-xl border bg-card p-4 shadow-xs md:p-6">{children}</div>
}

export function SettingsView() {
  const { t, features, setFeature, locale, setLocale } = useApp()
  const { theme, setTheme } = useTheme()
  const [tab, setTab] = useState<Tab>('business')
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const themes = [
    { value: 'light', label: t('settings.light'), icon: Sun },
    { value: 'dark', label: t('settings.dark'), icon: Moon },
    { value: 'system', label: t('settings.system'), icon: Monitor },
  ]

  return (
    <>
      <PageHeader breadcrumbs={[{ label: t('nav.settings') }]} title={t('settings.title')} description={t('settings.desc')} />

      <div role="tablist" aria-label={t('settings.title')} className="mb-6 flex w-fit flex-wrap gap-1 rounded-lg bg-muted p-0.5">
        {tabs.map((x) => (
          <button
            key={x.value}
            type="button"
            role="tab"
            aria-selected={tab === x.value}
            onClick={() => setTab(x.value)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              tab === x.value ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t(x.label)}
          </button>
        ))}
      </div>

      {tab === 'business' && (
        <Panel>
          <div className="flex flex-col gap-5">
            <Field id="business-name" label={t('settings.businessName')}>
              <Input id="business-name" defaultValue="Toko Sembako Maju" />
            </Field>
            <Field id="business-type" label={t('settings.businessType')}>
              <Input id="business-type" defaultValue="Wholesale / Distribution" />
            </Field>
            <Field id="currency" label={t('settings.currency')} hint={t('settings.currencyLocked')}>
              <div className="relative">
                <Input id="currency" value="IDR — Indonesian Rupiah" disabled readOnly />
                <Lock className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              </div>
            </Field>
            <Field id="costing" label={t('settings.costing')}>
              <Input id="costing" value={t('settings.costingValue')} disabled readOnly />
            </Field>
            <Field id="timezone" label={t('settings.timezone')}>
              <Input id="timezone" defaultValue="Asia/Jakarta (WIB, UTC+7)" />
            </Field>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">{t('common.prototypeNote')}</p>
        </Panel>
      )}

      {tab === 'profile' && (
        <Panel>
          <div className="flex flex-col gap-5">
            <Field id="profile-name" label={t('settings.name')}>
              <Input id="profile-name" defaultValue="Shane" />
            </Field>
            <Field id="profile-email" label={t('settings.email')}>
              <Input id="profile-email" type="email" defaultValue="shane@example.com" />
            </Field>
            <Field id="profile-role" label={t('settings.role')} hint={t('settings.ownerOnly')}>
              <Input id="profile-role" value={t('settings.owner')} disabled readOnly />
            </Field>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">{t('common.prototypeNote')}</p>
        </Panel>
      )}

      {tab === 'features' && (
        <div className="max-w-2xl">
          <p className="mb-4 text-sm text-muted-foreground">{t('settings.featuresHint')}</p>
          <ul className="divide-y rounded-xl border bg-card shadow-xs">
            {featureList.map((f) => (
              <li key={f.key} className="flex items-center justify-between gap-4 p-4 md:px-5">
                <div className="min-w-0">
                  <Label htmlFor={`feature-${f.key}`} className="text-sm font-medium">
                    {t(f.label)}
                  </Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t(f.desc)}</p>
                </div>
                <Switch
                  id={`feature-${f.key}`}
                  checked={features[f.key]}
                  onCheckedChange={(v) => setFeature(f.key, v)}
                  aria-label={t(f.label)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'preferences' && (
        <Panel>
          <div className="flex flex-col gap-6">
            <fieldset>
              <legend className="mb-2 text-sm font-medium">{t('settings.theme')}</legend>
              <div className="grid grid-cols-3 gap-2">
                {themes.map((x) => {
                  const active = mounted && theme === x.value
                  return (
                    <button
                      key={x.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setTheme(x.value)}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-lg border p-3 text-sm transition-colors',
                        active ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted',
                      )}
                    >
                      <x.icon className="size-4" />
                      {x.label}
                    </button>
                  )
                })}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">{t('settings.language')}</legend>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['en', 'English'],
                  ['id', 'Bahasa Indonesia'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={locale === value}
                    onClick={() => setLocale(value)}
                    className={cn(
                      'rounded-lg border p-3 text-sm transition-colors',
                      locale === value ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </Panel>
      )}
    </>
  )
}
