'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { Globe2, Menu, X } from 'lucide-react'
import { useApp } from '@/components/providers'

const navigation = [
  { key: 'landing.nav.solutions', href: '/#solutions' },
  { key: 'landing.nav.industries', href: '/#industries' },
  { key: 'landing.nav.flexibility', href: '/#flexibility' },
  { key: 'landing.nav.tour', href: '/#product-tour' },
]

function RulerTicks({ side }: { side: 'left' | 'right' | 'top' | 'bottom' }) {
  const isVertical = side === 'left' || side === 'right'
  const ticks = Array.from({ length: 64 }, (_, index) => index * 100)

  return (
    <div
      className={`pointer-events-none absolute ${side === 'left' ? 'inset-y-0 left-0 w-7 border-r' : side === 'right' ? 'inset-y-0 right-0 w-7 border-l' : side === 'top' ? 'inset-x-0 top-0 h-7 border-b' : 'inset-x-0 bottom-0 h-7 border-t'} hidden border-white/50 sm:block`}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: isVertical
            ? 'repeating-linear-gradient(to bottom, rgba(255,255,255,.55) 0 1px, transparent 1px 10px), repeating-linear-gradient(to bottom, rgba(255,255,255,.95) 0 1px, transparent 1px 50px)'
            : 'repeating-linear-gradient(to right, rgba(255,255,255,.55) 0 1px, transparent 1px 10px), repeating-linear-gradient(to right, rgba(255,255,255,.95) 0 1px, transparent 1px 50px)',
          backgroundSize: isVertical ? '6px 100%, 14px 100%' : '100% 6px, 100% 14px',
          backgroundPosition: isVertical
            ? side === 'left' ? 'left 0, left 0' : 'right 0, right 0'
            : side === 'top' ? 'top 0, top 0' : 'bottom 0, bottom 0',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {ticks.map(value => (
        <span
          key={value}
          className="absolute font-mono text-[9px] leading-none text-white/85"
          style={isVertical
            ? { top: value + 16, [side === 'left' ? 'left' : 'right']: 3 }
            : { left: value + 16, [side === 'top' ? 'top' : 'bottom']: 4 }}
        >
          {value / 100}
        </span>
      ))}
    </div>
  )
}

export function MeasuredPageFrame({
  children,
  className = '',
  contentClassName = '',
}: {
  children: React.ReactNode
  className?: string
  contentClassName?: string
}) {
  const { t, locale, setLocale } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className={`auth-light relative min-h-dvh overflow-clip bg-[#0E2A63] sm:px-7 sm:py-4 ${className}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden sm:block"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to right, rgba(255,255,255,.14) 0 1px, transparent 1px 40px), repeating-linear-gradient(to bottom, rgba(255,255,255,.14) 0 1px, transparent 1px 40px), repeating-linear-gradient(to right, rgba(255,255,255,.30) 0 1px, transparent 1px 200px), repeating-linear-gradient(to bottom, rgba(255,255,255,.30) 0 1px, transparent 1px 200px)',
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden sm:block">
        <RulerTicks side="left" />
        <RulerTicks side="right" />
        <RulerTicks side="top" />
        <RulerTicks side="bottom" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1680px]">
        <header className="sticky top-3 z-40 border border-[#101A26]/25 bg-[#FCFCFA]/95 shadow-[0_10px_30px_-18px_rgba(0,0,0,.5)] backdrop-blur">
          <span aria-hidden className="punch-hole pointer-events-none absolute left-[9px] top-1/2 hidden h-[9px] w-[9px] -translate-y-1/2 sm:block" />
          <span aria-hidden className="punch-hole pointer-events-none absolute right-[9px] top-1/2 hidden h-[9px] w-[9px] -translate-y-1/2 sm:block" />
          <div className="flex h-12 items-center justify-between gap-3 px-4 sm:px-6">
            <Link href="/" className="flex shrink-0 items-center gap-2.5">
              <span className="inline-flex h-7 w-7 items-center justify-center bg-[#0E2A63]">
                <Image src="/cuanapp-logo.svg" alt="" width={15} height={15} />
              </span>
              <span className="text-[14px] font-semibold tracking-[-.02em] text-[#101A26]">CuanApp</span>
              <span className="hidden border-l border-[#101A26]/20 pl-2 font-mono text-[9px] uppercase tracking-[.14em] text-[#6B7887] sm:inline">
                {t('landing.brand')}
              </span>
            </Link>

            <nav aria-label={t('landing.nav.primary')} className="hidden items-center gap-4 xl:flex">
              {navigation.map(item => (
                <Link key={item.key} href={item.href} className="font-mono text-[9px] uppercase tracking-[.13em] text-[#3C4A5A] transition hover:text-[#0E2A63]">
                  {t(item.key)}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <div role="group" aria-label={t('landing.nav.language')} className="flex items-center gap-0.5 rounded-[2px] border border-[#101A26]/20 p-0.5">
                <Globe2 size={11} className="mx-1 text-[#3C4A5A]" />
                {(['en', 'id'] as const).map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setLocale(option)}
                    aria-pressed={locale === option}
                    className={`rounded-[2px] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[.1em] transition ${locale === option ? 'bg-[#0E2A63] text-white' : 'text-[#3C4A5A] hover:text-[#0E2A63]'}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <Link href="/login" className="hidden px-1 font-mono text-[9px] uppercase tracking-[.1em] text-[#3C4A5A] hover:text-[#0E2A63] sm:block">
                {t('landing.nav.login')}
              </Link>
              <Link href="/register" className="hidden rounded-[2px] bg-[#0E2A63] px-3 py-2 font-mono text-[9px] uppercase tracking-[.1em] text-white transition hover:bg-[#0A1F4A] sm:block">
                {t('landing.nav.cta')}
              </Link>
              <button
                type="button"
                className="rounded-[2px] border border-[#101A26]/20 p-2 text-[#3C4A5A] xl:hidden"
                onClick={() => setMenuOpen(open => !open)}
                aria-label={t('landing.nav.menu')}
                aria-expanded={menuOpen}
                aria-controls="measured-page-menu"
              >
                {menuOpen ? <X size={15} /> : <Menu size={15} />}
              </button>
            </div>
          </div>
          {menuOpen && (
            <div id="measured-page-menu" className="border-t border-[#101A26]/15 bg-[#FCFCFA] px-4 py-2 lg:hidden">
              {navigation.map(item => (
                <Link key={item.key} href={item.href} onClick={() => setMenuOpen(false)} className="block border-b border-[#101A26]/10 py-2.5 font-mono text-[10px] uppercase tracking-[.12em] text-[#3C4A5A]">
                  {t(item.key)}
                </Link>
              ))}
              <div className="flex gap-2 py-3 sm:hidden">
                <Link href="/login" className="flex-1 rounded-[2px] border border-[#101A26]/20 py-2 text-center font-mono text-[10px] uppercase tracking-[.1em]">
                  {t('landing.nav.login')}
                </Link>
                <Link href="/register" className="flex-1 rounded-[2px] bg-[#0E2A63] py-2 text-center font-mono text-[10px] uppercase tracking-[.1em] text-white">
                  {t('landing.nav.cta')}
                </Link>
              </div>
            </div>
          )}
        </header>

        <main lang={locale} className={`relative mt-3 min-h-[calc(100dvh-8rem)] border border-[#101A26]/25 bg-[#FCFCFA] text-[#101A26] ${contentClassName}`}>
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-8 hidden w-px sm:block" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, rgba(16,26,38,.30) 0 4px, transparent 4px 10px)' }} />
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-8 hidden w-px sm:block" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, rgba(16,26,38,.30) 0 4px, transparent 4px 10px)' }} />
          <div aria-hidden className="punch-holes pointer-events-none absolute inset-y-4 left-[10px] z-20 hidden w-[9px] sm:block" />
          <div aria-hidden className="punch-holes pointer-events-none absolute inset-y-4 right-[10px] z-20 hidden w-[9px] sm:block" />
          {children}
          <footer className="border-t border-[#101A26]/15 px-4 py-3 sm:px-8">
            <p className="font-mono text-[9px] uppercase tracking-[.14em] text-[#6B7887]">
              CuanApp — {t('landing.cta.productDescriptor')} · 2026
            </p>
          </footer>
        </main>
      </div>
    </div>
  )
}
