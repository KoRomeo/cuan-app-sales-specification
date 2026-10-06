'use client'

import { ThemeProvider } from 'next-themes'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { dictionaries, type Locale, type TranslationKey } from '@/lib/i18n'
import { logFeatureChange } from '@/lib/services'
import { getVersion, subscribe } from '@/lib/store'

export type FeatureKey =
  | 'inventory'
  | 'negativeStock'
  | 'purchasing'
  | 'customerCredit'
  | 'supplierCredit'
  | 'ownDelivery'
  | 'expedition'
  | 'employees'
  | 'accounting'
  | 'tax'

type Features = Record<FeatureKey, boolean>

const defaultFeatures: Features = {
  inventory: true,
  negativeStock: true,
  purchasing: true,
  customerCredit: true,
  supplierCredit: true,
  ownDelivery: true,
  expedition: true,
  employees: true,
  accounting: true,
  tax: false,
}

interface AppContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
  features: Features
  setFeature: (key: FeatureKey, value: boolean) => void
  /** Bumps after every committed transaction so views re-read the tables. */
  dataVersion: number
}

const AppContext = createContext<AppContextValue | null>(null)

const LOCALE_KEY = 'cuanapp-locale'

export function Providers({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')
  const [features, setFeatures] = useState<Features>(defaultFeatures)

  useEffect(() => {
    const saved = window.localStorage.getItem(LOCALE_KEY)
    if (saved === 'en' || saved === 'id') setLocaleState(saved)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    window.localStorage.setItem(LOCALE_KEY, next)
  }, [])

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      let text: string = dictionaries[locale][key] ?? key
      if (vars) {
        for (const [k, v] of Object.entries(vars)) text = text.replace(`{${k}}`, String(v))
      }
      return text
    },
    [locale],
  )

  const dataVersion = useSyncExternalStore(subscribe, getVersion, getVersion)

  const setFeature = useCallback(
    (key: FeatureKey, value: boolean) => {
      if (features[key] === value) return
      logFeatureChange(key, features[key], value)
      setFeatures((prev) => ({ ...prev, [key]: value }))
    },
    [features],
  )

  const value = useMemo(
    () => ({ locale, setLocale, t, features, setFeature, dataVersion }),
    [locale, setLocale, t, features, setFeature, dataVersion],
  )

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <AppContext.Provider value={value}>{children}</AppContext.Provider>
    </ThemeProvider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within Providers')
  return ctx
}
