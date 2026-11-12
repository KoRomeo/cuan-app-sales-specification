"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useApp } from "@/components/providers"
import {
  ArrowLeft, ArrowRight, BarChart3, BookOpen, Boxes, BriefcaseBusiness,
  Check, ChevronDown, ClipboardList, Globe2, HeartPulse, Landmark, Menu,
  Package, Play, Settings2, ShieldCheck, ShoppingCart, SlidersHorizontal,
  Sparkles, Wallet, Wrench, X, Camera, GraduationCap, Plane, Smartphone, Pause,
  SprayCan, Handshake, Truck, ChartNoAxesCombined,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

const industries = [
  { icon: Smartphone, items: ["Counter HP, Pulsa & PPOB", "Servis HP, Gadget & Laptop", "Servis Elektronik Rumah Tangga", "Servis Komputer & PC Assembly"] },
  { icon: Handshake, items: ["Sales Outsourcing & Direct Selling", "Broker Properti", "Dealer Pulsa & Perdana", "Telemarketing & Inside Sales", "Digital Marketing", "Broker Asuransi & Keuangan"] },
  { icon: SprayCan, items: ["Laundry & Dry Cleaning", "Carwash & Auto Detailing", "Home & Office Cleaning", "Pest Control", "Landscaping"] },
  { icon: Truck, items: ["Rental Kendaraan", "Rental Alat Berat", "Peralatan Event & Panggung", "Kamera & Fotografi", "Gaun & Pakaian Formal"] },
  { icon: Camera, items: ["Fotografi & Videografi", "Percetakan & Digital Offset", "Sablon & Konveksi", "Studio Rekaman", "Event & Wedding Organizer"] },
  { icon: BriefcaseBusiness, items: ["Konsultan Akuntansi & Pajak", "Konsultan Hukum & Legal", "Manajemen, HR & Rekrutmen", "Software House & IT Services", "Agensi Penerjemah"] },
  { icon: Package, items: ["Agen Ekspedisi & Tiket", "Freight Forwarding", "Pengurusan Bea Cukai", "Jasa Pindahan Rumah & Kantor"] },
  { icon: Landmark, items: ["Pegadaian Swasta", "Koperasi Simpan Pinjam", "BPR", "Transfer & Remitansi"] },
  { icon: Wrench, items: ["Bengkel Umum", "Fast Fit & Tune-Up", "Towing & Roadside Assistance", "Uji Emisi", "Inspeksi Kendaraan Bekas"] },
  { icon: HeartPulse, items: ["Barbershop & Salon", "Beauty Clinic", "Spa & Massage", "Gym & Personal Trainer", "Klinik & Grooming Hewan"] },
  { icon: Plane, items: ["Travel Agent", "Tour Operator", "Perjalanan Umroh & Haji"] },
  { icon: GraduationCap, items: ["Warnet & Esports", "Kursus & Bimbingan Belajar", "Training Center", "Daycare & Preschool"] },
]

const modules = [
  "Dashboard", "Sales & Orders", "Inventory", "Purchasing", "Delivery",
  "Customer Credit", "Supplier Credit", "Accounting", "General Ledger",
  "Reconciliation", "HPP & Profit", "Reports",
]

const solutionRows = [
  { no: "01", titleKey: "landing.solutions.row1.title", bodyKey: "landing.solutions.row1.body", tags: ["landing.solutions.tag.purchasing", "landing.solutions.tag.sales", "landing.solutions.tag.inventory", "landing.solutions.tag.delivery"] },
  { no: "02", titleKey: "landing.solutions.row2.title", bodyKey: "landing.solutions.row2.body", tags: ["landing.solutions.tag.cashFlow", "landing.solutions.tag.receivables", "landing.solutions.tag.payables", "landing.solutions.tag.profitability"] },
  { no: "03", titleKey: "landing.solutions.row3.title", bodyKey: "landing.solutions.row3.body", tags: ["landing.solutions.tag.costOfGoods", "landing.solutions.tag.margin", "landing.solutions.tag.trend", "landing.solutions.tag.reports"] },
]

const flexibility = [
  { titleKey: "landing.flex.item1.title", bodyKey: "landing.flex.item1.body" },
  { titleKey: "landing.flex.item2.title", bodyKey: "landing.flex.item2.body" },
  { titleKey: "landing.flex.item3.title", bodyKey: "landing.flex.item3.body" },
  { titleKey: "landing.flex.item4.title", bodyKey: "landing.flex.item4.body" },
]

const tourItems = [
  { labelKey: "landing.tour.item1", detailKey: "landing.tour.item1.body", icon: BarChart3 },
  { labelKey: "landing.tour.item2", detailKey: "landing.tour.item2.body", icon: ShoppingCart },
  { labelKey: "landing.tour.item3", detailKey: "landing.tour.item3.body", icon: Boxes },
  { labelKey: "landing.tour.item4", detailKey: "landing.tour.item4.body", icon: ClipboardList },
  { labelKey: "landing.tour.item5", detailKey: "landing.tour.item5.body", icon: Wallet },
  { labelKey: "landing.tour.item6", detailKey: "landing.tour.item6.body", icon: ChartNoAxesCombined },
]

const navItems = [
  { labelKey: "landing.nav.solutions", href: "#solutions" },
  { labelKey: "landing.nav.industries", href: "#industries" },
  { labelKey: "landing.nav.flexibility", href: "#flexibility" },
  { labelKey: "landing.nav.tour", href: "#product-tour" },
]


/* ------------------------------------------------------------------ */
/* Small shared pieces                                                 */
/* ------------------------------------------------------------------ */

const INK = "#101A26"

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`font-mono text-[10px] uppercase tracking-[.18em] ${className}`}>{children}</span>
  )
}

function Rule({ className = "" }: { className?: string }) {
  return <div className={`h-px w-full bg-[#101A26]/15 ${className}`} />
}

/**
 * Continuous-form punch holes on the paper edges. Equal spacing everywhere,
 * set by --hole-gap so the content matches the footer strip exactly.
 */
function PunchHoles() {
  return (
    <>
      <div aria-hidden className="punch-holes pointer-events-none absolute inset-y-4 left-[10px] z-20 hidden w-[9px] sm:block" />
      <div aria-hidden className="punch-holes pointer-events-none absolute inset-y-4 right-[10px] z-20 hidden w-[9px] sm:block" />
    </>
  )
}

/** One pair of holes, centred vertically — for the thin navbar strip. */
function PunchHolePair() {
  return (
    <>
      <span aria-hidden className="punch-hole pointer-events-none absolute left-[9px] top-1/2 z-20 hidden h-[9px] w-[9px] -translate-y-1/2 sm:block" />
      <span aria-hidden className="punch-hole pointer-events-none absolute right-[9px] top-1/2 z-20 hidden h-[9px] w-[9px] -translate-y-1/2 sm:block" />
    </>
  )
}

function Tags({ items }: { items: string[] }) {
  const { t } = useApp()
  return (
    <div className="mt-5 flex flex-wrap items-center gap-1.5">
      {items.map(key => (
        <span key={key} className="rounded-[2px] border border-[#101A26]/20 px-2 py-1 font-mono text-[10px] uppercase tracking-[.12em] text-[#3C4A5A]">
          {t(key)}
        </span>
      ))}
    </div>
  )
}

function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center bg-[#0E2A63] ${className}`}>
      <Image src="/cuanapp-logo.svg" alt="" width={15} height={15} />
    </span>
  )
}

/**
 * Ruler strip for the blue mat: fine ticks every 10px, heavy ticks every
 * 50px, and mono numbers every 100px — like a self-healing cutting mat.
 */
function RulerTicks({ side, withNumbers = true }: { side: "left" | "right" | "top" | "bottom"; withNumbers?: boolean }) {
  const isVertical = side !== "top"
  const ticks = Array.from({ length: 64 }, (_, i) => i * 100)
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute ${side === "left" ? "inset-y-0 left-0 w-7 border-r border-white/50" : side === "right" ? "inset-y-0 right-0 w-7 border-l border-white/50" : side === "top" ? "inset-x-0 top-0 h-7 border-b border-white/50" : "inset-x-0 bottom-0 h-7 border-t border-white/50"}`}
    >
      {/* fine + heavy ticks */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: isVertical
            ? `repeating-linear-gradient(to bottom, rgba(255,255,255,.55) 0 1px, transparent 1px 10px), repeating-linear-gradient(to bottom, rgba(255,255,255,.95) 0 1px, transparent 1px 50px)`
            : `repeating-linear-gradient(to right, rgba(255,255,255,.55) 0 1px, transparent 1px 10px), repeating-linear-gradient(to right, rgba(255,255,255,.95) 0 1px, transparent 1px 50px)`,
          backgroundSize: isVertical ? "6px 100%, 14px 100%" : "100% 6px, 100% 14px",
          backgroundPosition: isVertical
            ? side === "left" ? "left 0, left 0" : "right 0, right 0"
            : side === "top" ? "top 0, top 0" : "bottom 0, bottom 0",
          backgroundRepeat: "no-repeat",
        }}
      />
      {/* numbers */}
      {withNumbers && (
        <div className={`absolute inset-0 ${isVertical ? (side === "left" ? "left-1.5" : "right-1.5") : "top-1 left-1.5"}`}>
          {ticks.map(n => (
            <span
              key={n}
              className="absolute font-mono text-[10px] leading-none text-white/85"
              style={isVertical
                ? { top: n + 16, [side === "left" ? "left" : "right"]: 0 }
                : { left: n + 16, top: 0 }}
            >
              {n / 100 || ""}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Product screenshot                                                  */
/* ------------------------------------------------------------------ */

function DashboardPreview() {
  const { t } = useApp()
  return (
    <div className="relative w-full">
      <div className="overflow-hidden rounded-[2px] border border-[#101A26]/25 bg-white">
        <div className="flex h-9 items-center justify-between border-b border-[#101A26]/12 bg-[#FAFAF5] px-3">
          <div className="flex w-full items-center gap-2">
            <span className="h-2 w-2 rounded-[1px] bg-[#101A26]/20" />
            <span className="h-2 w-2 rounded-[1px] bg-[#101A26]/20" />
            <span className="h-2 w-2 rounded-[1px] bg-[#101A26]/20" />
            <span className="ml-3 font-mono text-[9px] uppercase tracking-[.14em] text-[#6B7887]">app.cuanapp.id / dashboard</span>
          </div>
          <Label className="hidden text-[#6B7887] sm:block">{t("landing.preview.label")}</Label>
        </div>

        <div className="grid min-h-[380px] grid-cols-[46px_1fr] sm:min-h-[430px] sm:grid-cols-[168px_1fr]">
          <aside className="border-r border-[#101A26]/12 bg-[#FAFAF5] p-2 sm:p-3">
            <Label className="mb-4 hidden text-[#8A94A1] sm:block">{t("landing.preview.workspace")}</Label>
            {[[BarChart3, t("landing.tour.item1")], [ShoppingCart, t("landing.tour.item2")], [Boxes, t("landing.tour.item3")], [ClipboardList, t("landing.tour.item4")], [Wallet, t("landing.tour.item5")], [BookOpen, t("landing.tour.item6")]].map(([Icon, label], i) => {
              const I = Icon as typeof BarChart3
              return (
                <div key={String(label)} className={`mb-0.5 flex items-center justify-center gap-2 rounded-[2px] px-2 py-2 text-[10px] sm:justify-start ${i === 0 ? "bg-[#0E2A63] font-medium text-white" : "text-[#59667A]"}`}>
                  <I size={13} /><span className="hidden sm:inline">{String(label)}</span>
                </div>
              )
            })}
          </aside>

          <div className="min-w-0 bg-white p-3 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#101A26]/12 pb-3">
              <div>
                <Label className="text-[#0E2A63]">{t("landing.preview.businessOverview")}</Label>
                <div className="mt-1.5 text-[15px] font-semibold tracking-[-.02em] text-[#101A26] sm:text-lg">{t("landing.preview.greeting")}</div>
              </div>
              <span className="rounded-[2px] border border-[#101A26]/20 px-2 py-1 font-mono text-[9px] uppercase tracking-[.1em] text-[#59667A]">{t("landing.preview.thisMonth")}</span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-px bg-[#101A26]/12 md:grid-cols-4">
              {[
                ["landing.preview.totalSales", "Rp 48.250.000", "+12.8%"],
                ["landing.preview.grossProfit", "Rp 12.840.000", "+8.2%"],
                ["landing.preview.receivables", "Rp 6.450.000", "landing.preview.open"],
                ["landing.preview.inventory", "Rp 32.600.000", "128 SKU"],
              ].map(([labelKey, v, detail], i) => (
                <div key={labelKey} className="bg-white p-2.5">
                  <Label className="text-[#8A94A1]">{t(labelKey)}</Label>
                  <div className="mt-1.5 text-[11px] font-semibold tracking-[-.01em] text-[#101A26] sm:text-[13px]">{v}</div>
                  <div className={`mt-0.5 font-mono text-[9px] ${i === 1 ? "text-emerald-700" : i === 2 ? "text-amber-700" : "text-[#0E2A63]"}`}>{detail === "landing.preview.open" ? t(detail) : detail}</div>
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-[1.4fr_1fr]">
              <div className="rounded-[2px] border border-[#101A26]/12 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-[#101A26]">{t("landing.preview.salesPerformance")}</span>
                  <Label className="text-[#8A94A1]">{t("landing.preview.sixMonths")}</Label>
                </div>
                <div className="mt-3 flex h-[92px] items-end gap-1.5 border-b border-[#101A26]/12">
                  {[38, 55, 46, 72, 61, 88].map((h, i) => (
                    <div key={i} className="flex-1 bg-[#0E2A63]" style={{ height: `${h}%`, opacity: 0.35 + i * 0.11 }} />
                  ))}
                </div>
                <div className="mt-1.5 flex justify-between font-mono text-[8px] uppercase text-[#8A94A1]">
                  <span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span>
                </div>
              </div>
              <div className="rounded-[2px] border border-[#101A26]/12 p-3">
                <Label className="text-[#8A94A1]">{t("landing.preview.recentActivity")}</Label>
                <div className="mt-3 space-y-2.5">
                  {[
                    [t("landing.preview.purchaseRecorded"), `${t("landing.preview.supplierInvoice")} · 2m`, "bg-[#0E2A63]"],
                    [t("landing.preview.orderDelivered"), "ORD-2026-0082 · 24m", "bg-emerald-600"],
                    [t("landing.preview.paymentReceived"), "BCA · 1h", "bg-violet-600"],
                  ].map(([a, b, d]) => (
                    <div key={a} className="flex gap-2">
                      <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-[1px] ${d}`} />
                      <div>
                        <div className="text-[9px] font-medium text-[#101A26]">{a}</div>
                        <div className="font-mono text-[8px] text-[#8A94A1]">{b}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingsPreview() {
  const { t } = useApp()
  const [toggles, setToggles] = useState([true, true, true, false, true, false])
  const [method, setMethod] = useState("FIFO")
  const rows = [
    "landing.preview.inventory",
    "landing.preview.purchasing",
    "landing.preview.sales",
    "landing.preview.delivery",
    "landing.preview.customerCredit",
    "landing.preview.supplierCredit",
  ]

  return (
    <div className="overflow-hidden rounded-[2px] border border-[#101A26]/25 bg-white">
      <div className="flex items-center justify-between border-b border-[#101A26]/12 bg-[#FAFAF5] px-4 py-2.5">
        <span className="flex items-center gap-2 text-[11px] font-semibold text-[#101A26]"><Settings2 size={13} /> {t("landing.preview.businessSettings")}</span>
        <Label className="text-[#8A94A1]">{t("landing.preview.configuration")}</Label>
      </div>
      <div className="p-4">
        <Label className="text-[#8A94A1]">{t("landing.preview.features")}</Label>
        <div className="mt-2">
          {rows.map((f, i) => (
            <div key={f} className="flex items-center justify-between border-b border-[#101A26]/12 py-2 last:border-0">
              <span className="text-[11px] text-[#101A26]">{t(f)}</span>
              <button
                onClick={() => setToggles(t => t.map((v, j) => (j === i ? !v : v)))}
                role="switch"
                aria-checked={toggles[i]}
                aria-label={t(f)}
                className={`m-toggle-track relative h-4 w-7 rounded-[2px] border ${toggles[i] ? "border-[#0E2A63] bg-[#0E2A63]" : "border-[#101A26]/25 bg-white"}`}
              >
                <span className={`m-toggle-knob absolute top-[1px] h-[12px] w-[12px] rounded-[1px] ${toggles[i] ? "translate-x-[13px] bg-white" : "translate-x-[1px] bg-[#101A26]/25"}`} />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 border border-[#101A26]/15 p-3">
          <Label className="text-[#8A94A1]">{t("landing.preview.costingMethod")}</Label>
          <div className="mt-2 flex gap-1.5">
            {["FIFO", "Weighted Average"].map(m => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                aria-pressed={method === m}
                className={`m-chip rounded-[2px] border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[.08em] ${method === m ? "border-[#0E2A63] bg-[#0E2A63] text-white" : "border-[#101A26]/20 text-[#3C4A5A]"}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const { t, locale, setLocale } = useApp()
  const [activeTour, setActiveTour] = useState(0)
  const [tourOpen, setTourOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [progress, setProgress] = useState(12)
  const [pausedUi, setPausedUi] = useState(false)

  const trackRef = useRef<HTMLDivElement>(null)
  const tourTriggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const paused = useRef(false)
  const hover = useRef(false)
  const pauseUntil = useRef(0)
  const drag = useRef<{ x: number; left: number } | null>(null)

  /* time-based auto-scroll so refresh rate does not change the speed */
  useEffect(() => {
    const SPEED = 26
    let raf = 0
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min(now - last, 64)
      last = now
      const el = trackRef.current
      if (el && !paused.current && !hover.current && now > pauseUntil.current && !document.hidden) {
        el.scrollLeft += (SPEED * dt) / 1000
        if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 2) el.scrollLeft = 0
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [])

  /* Reduced motion starts the carousel paused; Play is an explicit opt-in. */
  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    paused.current = true
    setPausedUi(true)
  }, [])

  /* reveal once, in view */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"))
    els.forEach(el => el.setAttribute("data-reveal-ready", ""))
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return
        e.target.classList.add("is-in")
        io.unobserve(e.target)
      })
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" })
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!tourOpen && !menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (tourOpen) {
          setTourOpen(false)
          tourTriggerRef.current?.focus()
        }
        setMenuOpen(false)
        return
      }
      if (e.key !== "Tab" || !tourOpen) return
      /* keep focus inside the dialog */
      const panel = panelRef.current
      if (!panel) return
      const focusables = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    document.addEventListener("keydown", onKey)
    if (tourOpen) panelRef.current?.focus()
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener("keydown", onKey)
    }
  }, [tourOpen, menuOpen])

  const onScroll = () => {
    const el = trackRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setProgress(max > 0 ? (el.scrollLeft / max) * 100 : 0)
  }

  const scrollCarousel = (dir: 1 | -1) => {
    const el = trackRef.current
    if (!el) return
    const card = el.querySelector<HTMLElement>("[data-card]")
    const w = card ? card.offsetWidth + 12 : 300
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    /* let the smooth scroll finish before the auto-scroll resumes */
    pauseUntil.current = performance.now() + 450
    el.scrollBy({ left: dir * w, behavior: reduce ? "auto" : "smooth" })
  }

  const onCarouselKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault()
      scrollCarousel(1)
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      scrollCarousel(-1)
    }
  }

  const ActiveIcon = tourItems[activeTour].icon

  return (
    <>
      <div className="relative min-h-screen overflow-clip bg-[#0E2A63] sm:px-7 sm:py-4">
      {/* square grid across the whole mat, like a self-healing cutting mat */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden sm:block"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to right, rgba(255,255,255,.14) 0 1px, transparent 1px 40px), repeating-linear-gradient(to bottom, rgba(255,255,255,.14) 0 1px, transparent 1px 40px), repeating-linear-gradient(to right, rgba(255,255,255,.30) 0 1px, transparent 1px 200px), repeating-linear-gradient(to bottom, rgba(255,255,255,.30) 0 1px, transparent 1px 200px)",
        }}
      />
      {/* rulers on the mat, all four edges */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden sm:block">
        <RulerTicks side="left" />
        <RulerTicks side="right" />
        <RulerTicks side="top" />
        <RulerTicks side="bottom" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1680px]">
      {/* ---------- navigation: its own torn-off strip of paper ---------- */}
      <header className="sticky top-3 z-40 border border-[#101A26]/25 bg-[#FCFCFA]/95 shadow-[0_10px_30px_-18px_rgba(0,0,0,.5)] backdrop-blur">
        <PunchHolePair />
        <div className="flex h-12 items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <LogoMark className="h-7 w-7" />
              <span className="text-[14px] font-semibold tracking-[-.02em]">CuanApp</span>
            </Link>
            <span className="hidden h-4 w-px bg-[#101A26]/20 sm:block" />
            <span className="hidden font-mono text-[10px] uppercase tracking-[.18em] text-[#6B7887] sm:block">{t("landing.brand")}</span>
          </div>

          <nav className="hidden items-center gap-6 lg:flex" aria-label={t("landing.nav.primary")}>
            {navItems.map(item => (
              <a key={t(item.labelKey)} href={item.href} className="font-mono text-[10px] uppercase tracking-[.16em] text-[#3C4A5A] transition hover:text-[#0E2A63]">
                {t(item.labelKey)}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <div role="group" aria-label={t("landing.nav.language")} className="hidden items-center gap-0.5 rounded-[2px] border border-[#101A26]/20 p-0.5 sm:flex">
              <Globe2 size={11} className="mx-1 text-[#3C4A5A]" />
              {(["en", "id"] as const).map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setLocale(option)}
                  aria-pressed={locale === option}
                  className={`rounded-[2px] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[.1em] transition ${locale === option ? "bg-[#0E2A63] text-white" : "text-[#3C4A5A] hover:text-[#0E2A63]"}`}
                >
                  {option}
                </button>
              ))}
            </div>
            <Link href="/login" className="hidden px-1.5 font-mono text-[10px] uppercase tracking-[.12em] text-[#3C4A5A] hover:text-[#101A26] sm:block">{t("landing.nav.login")}</Link>
            <Link href="/register" className="rounded-[2px] bg-[#0E2A63] px-3.5 py-2 font-mono text-[10px] uppercase tracking-[.12em] text-white transition hover:bg-[#0A1F4A]">
              {t("landing.nav.cta")}
            </Link>
            <button
              className="rounded-[2px] border border-[#101A26]/20 p-2 lg:hidden"
              onClick={() => setMenuOpen(v => !v)}
              aria-label={t("landing.nav.menu")}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              {menuOpen ? <X size={15} /> : <Menu size={15} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div id="mobile-menu" className="border-t border-[#101A26]/15 bg-[#FCFCFA] px-4 py-3 lg:hidden">
            {navItems.map(item => (
              <a key={t(item.labelKey)} href={item.href} onClick={() => setMenuOpen(false)} className="block border-b border-[#101A26]/10 py-2.5 font-mono text-[11px] uppercase tracking-[.14em] text-[#3C4A5A]">
                {t(item.labelKey)}
              </a>
            ))}
            <div className="mt-3 flex gap-2">
              <Link href="/login" className="flex-1 rounded-[2px] border border-[#101A26]/20 py-2 text-center text-[12px]">{t("landing.nav.login")}</Link>
              <Link href="/register" className="flex-1 rounded-[2px] bg-[#0E2A63] py-2 text-center text-[12px] text-white">{t("landing.nav.cta")}</Link>
            </div>
          </div>
        )}
      </header>

      {/* ---------- paper sheet: a separate sheet below the torn-off nav ---------- */}
      <div className="relative mt-3 border border-[#101A26]/25 bg-[#FCFCFA]">
        {/* perforation lines, like continuous-form paper */}
        <div className="pointer-events-none absolute inset-y-0 left-8 hidden w-px sm:block" style={{ backgroundImage: "repeating-linear-gradient(to bottom, rgba(16,26,38,.30) 0 4px, transparent 4px 10px)" }} />
        <div className="pointer-events-none absolute inset-y-0 right-8 hidden w-px sm:block" style={{ backgroundImage: "repeating-linear-gradient(to bottom, rgba(16,26,38,.30) 0 4px, transparent 4px 10px)" }} />

      <main id="main" lang={locale} className="min-h-screen text-[#101A26]">
      {/* ---------- hero ---------- */}
      <PunchHoles />
      <section className="relative border-b border-[#101A26]/15">
        <div
          className="pointer-events-none absolute inset-0 hidden lg:block"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(16,26,38,.10) 0 1px, transparent 1px 25%)",
          }}
        />

        <div className="relative mx-auto max-w-[1360px] px-4 sm:px-8">
          <div className="grid gap-8 [&>*]:min-w-0 border-[#101A26]/15 py-12 sm:py-16 lg:grid-cols-[1.1fr_.9fr] lg:gap-16 lg:border-b lg:py-20">
            <div>
              <div className="flex items-center gap-3">
                <Label className="text-[#0E2A63]">{t("landing.hero.eyebrow")}</Label>
                <span className="h-px w-14 bg-[#101A26]/25" />
              </div>
              <h1 className="m-enter m-enter--1 mt-6 max-w-[15ch] text-[42px] font-semibold leading-[1.02] tracking-[-.045em] sm:text-[56px] lg:text-[68px]">
                {t("landing.hero.title1")}{" "}<span className="text-[#0E2A63]">{t("landing.hero.title2")}</span>
              </h1>
              <div className="mt-7 flex flex-wrap items-center gap-2">
                <Link href="/register" className="m-enter m-enter--4 inline-flex items-center gap-2 rounded-[2px] bg-[#0E2A63] px-4 py-2.5 text-[12.5px] font-medium text-white transition hover:bg-[#0A1F4A]">
                  {t("landing.hero.primary")} <ArrowRight size={13} />
                </Link>
                <a href="#product-tour" className="m-enter m-enter--4 inline-flex items-center gap-2 rounded-[2px] border border-[#101A26]/25 px-4 py-2.5 text-[12px] font-medium text-[#101A26] transition hover:border-[#101A26]/50">
                  <Play size={12} /> {t("landing.hero.secondary")}
                </a>
              </div>
            </div>

            <div className="flex flex-col justify-end">
              <p className="m-enter m-enter--2 max-w-[52ch] text-[16px] leading-[1.7] text-[#3C4A5A] sm:text-[17px]">
                {t("landing.hero.body")}
              </p>
              <div className="mt-6 flex items-center gap-3 border-t border-[#101A26]/15 pt-4">
                <Label className="text-[#8A94A1]">{t("landing.hero.meta1")}</Label>
                <span className="h-px flex-1 bg-[#101A26]/10" />
                <Label className="text-[#8A94A1]">{t("landing.hero.meta2")}</Label>
              </div>
            </div>
          </div>

          {/* screenshot, framed like a figure in a document */}
          <div className="m-enter m-enter--5 relative pb-12 pt-8 sm:pb-16">
            <div className="mb-3 flex items-end justify-between">
              <Label className="text-[#8A94A1]">{t("landing.hero.figure")}</Label>
              <Label className="hidden text-[#8A94A1] sm:block">{t("landing.hero.figureRight")}</Label>
            </div>
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* ---------- module marquee ---------- */}
      <section aria-label={t("landing.marquee.label")} className="border-b border-[#101A26]/15 bg-[#F5F5F0] py-3">
        <div className="group flex overflow-hidden">
          <div className="flex shrink-0 animate-marquee items-center gap-6 pr-6 group-hover:[animation-play-state:paused]">
            {[...modules, ...modules].map((m, i) => (
              <span key={`${m}-${i}`} className="flex items-center gap-2 whitespace-nowrap">
                <span className="h-1 w-1 rounded-[1px] bg-[#0E2A63]" />
                <Label className="text-[#3C4A5A]">{m}</Label>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 02 industries ---------- */}
      <PunchHoles />
      <section id="industries" className="relative scroll-mt-16 overflow-x-clip border-b border-[#101A26]/15">
        <div className="mx-auto max-w-[1360px] px-4 sm:px-8">
          <div className="grid [&>*]:min-w-0 lg:grid-cols-[260px_1fr]">
            <div className="border-[#101A26]/15 py-10 lg:border-r lg:py-14 lg:pr-8">
              <Label className="text-[#0E2A63]">{t("landing.industries.eyebrow")}</Label>
              <h2 data-reveal className="mt-4 text-[30px] font-semibold leading-[1.08] tracking-[-.035em] sm:text-[36px]">
                {t("landing.industries.title1")}<br /><span className="text-[#0E2A63]">{t("landing.industries.title2")}</span>
              </h2>
              <p className="mt-4 max-w-[38ch] text-[14px] leading-[1.7] text-[#3C4A5A]">
                {t("landing.industries.body")}
              </p>
              <div className="mt-6 flex items-center gap-2">
                <button onClick={() => scrollCarousel(-1)} aria-label={t("landing.industries.prev")} className="flex h-8 w-8 items-center justify-center rounded-[2px] border border-[#101A26]/20 transition hover:border-[#0E2A63] hover:text-[#0E2A63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E2A63] focus-visible:ring-offset-2">
                  <ArrowLeft size={13} />
                </button>
                <button onClick={() => scrollCarousel(1)} aria-label={t("landing.industries.next")} className="flex h-8 w-8 items-center justify-center rounded-[2px] border border-[#101A26]/20 transition hover:border-[#0E2A63] hover:text-[#0E2A63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E2A63] focus-visible:ring-offset-2">
                  <ArrowRight size={13} />
                </button>
                <div className="ml-2 h-0.5 w-24 overflow-hidden bg-[#101A26]/15">
                  <div className="m-progress h-full bg-[#0E2A63]" style={{ width: `${progress}%` }} />
                </div>
                <button
                  onClick={() => {
                    const next = !paused.current
                    paused.current = next
                    if (!next) hover.current = false
                    setPausedUi(next)
                  }}
                  className="ml-1 flex h-8 items-center gap-1.5 rounded-[2px] border border-[#101A26]/20 px-2 font-mono text-[9px] uppercase tracking-[.12em] text-[#3C4A5A] transition hover:border-[#0E2A63] hover:text-[#0E2A63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E2A63] focus-visible:ring-offset-2"
                >
                  {pausedUi ? <Play size={10} /> : <Pause size={10} />}
                  {pausedUi ? t("landing.industries.play") : t("landing.industries.pause")}
                </button>
              </div>
            </div>

            <div className="border-t border-[#101A26]/15 py-8 lg:border-t-0 lg:pl-8 lg:py-14">
              <div
                ref={trackRef}
                role="region"
                aria-label={t("landing.industries.region")}
                tabIndex={0}
                onKeyDown={onCarouselKey}
                onScroll={onScroll}
                onMouseEnter={() => { hover.current = true }}
                onMouseLeave={() => { hover.current = false }}
                onPointerDown={e => {
                  const el = trackRef.current
                  if (!el) return
                  drag.current = { x: e.clientX, left: el.scrollLeft }
                  el.setPointerCapture?.(e.pointerId)
                  hover.current = true
                }}
                onPointerMove={e => {
                  const el = trackRef.current
                  if (!el || !drag.current) return
                  el.scrollLeft = drag.current.left - (e.clientX - drag.current.x)
                }}
                onPointerUp={e => {
                  drag.current = null
                  if (e.pointerType !== "mouse") hover.current = false
                }}
                onPointerCancel={() => { drag.current = null; hover.current = false }}
                onPointerLeave={() => { drag.current = null }}
                className="m-track flex cursor-grab touch-pan-y gap-3 overflow-x-auto pb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E2A63] focus-visible:ring-offset-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {industries.map((group, i) => {
                  const Icon = group.icon
                  return (
                    <div key={i} data-card className="m-card w-[248px] shrink-0 select-none rounded-[2px] border border-[#101A26]/20 bg-white p-4">
                      <div className="flex items-center justify-between">
                        <span className="flex h-8 w-8 items-center justify-center rounded-[2px] border border-[#101A26]/15 text-[#0E2A63]">
                          <Icon size={15} strokeWidth={1.7} />
                        </span>
                        <Label className="text-[#8A94A1]">{String(i + 1).padStart(2, "0")}</Label>
                      </div>
                      <ul className="mt-4 space-y-1.5">
                        {group.items.map(item => (
                          <li key={item} className="flex items-start gap-1.5 border-t border-[#101A26]/10 pt-1.5 text-[12px] leading-[1.55] text-[#3C4A5A] first:border-0 first:pt-0">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 03 solutions ---------- */}
      <PunchHoles />
      <section id="solutions" className="relative scroll-mt-16 border-b border-[#101A26]/15">
        <div className="mx-auto max-w-[1360px] px-4 sm:px-8">
          <div className="grid [&>*]:min-w-0 lg:grid-cols-[260px_1fr]">
            <div className="border-[#101A26]/15 py-10 lg:border-r lg:py-14 lg:pr-8">
              <Label className="text-[#0E2A63]">{t("landing.solutions.eyebrow")}</Label>
              <h2 data-reveal className="mt-4 text-[30px] font-semibold leading-[1.08] tracking-[-.035em] sm:text-[36px]">
                {t("landing.solutions.title1")}<br /><span className="text-[#0E2A63]">{t("landing.solutions.title2")}</span>
              </h2>
              <p className="mt-4 max-w-[38ch] text-[14px] leading-[1.7] text-[#3C4A5A]">
                {t("landing.solutions.body")}
              </p>
            </div>

            <div className="py-8 lg:py-14 lg:pl-8">
              <div data-reveal data-reveal-stagger>
                {solutionRows.map((row, i) => (
                  <div key={row.no} className={`m-lift grid gap-3 border-t border-[#101A26]/15 py-6 sm:grid-cols-[54px_1fr] ${i === solutionRows.length - 1 ? "border-b" : ""}`}>
                    <div>
                      <Label className="text-[#0E2A63]">{row.no}</Label>
                    </div>
                    <div>
                      <h3 className="text-[17px] font-semibold tracking-[-.02em] sm:text-[19px]">{t(row.titleKey)}</h3>
                      <p className="mt-2 max-w-[68ch] text-[14px] leading-[1.75] text-[#3C4A5A]">{t(row.bodyKey)}</p>
                      <Tags items={row.tags} />
                    </div>
                  </div>
                ))}
              </div>
              <a href="#product-tour" className="mt-7 inline-flex items-center gap-2 rounded-[2px] border border-[#101A26]/25 px-4 py-2.5 text-[12px] font-medium transition hover:border-[#0E2A63] hover:text-[#0E2A63]">
                {t("landing.solutions.cta")} <ArrowRight size={13} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 04 flexibility ---------- */}
      <PunchHoles />
      <section id="flexibility" className="relative scroll-mt-16 border-b border-[#101A26]/15">
        <div className="mx-auto max-w-[1360px] px-4 sm:px-8">
          <div className="grid [&>*]:min-w-0 lg:grid-cols-[260px_1fr]">
            <div className="border-[#101A26]/15 py-10 lg:border-r lg:py-14 lg:pr-8">
              <Label className="text-[#0E2A63]">{t("landing.flex.eyebrow")}</Label>
              <h2 data-reveal className="mt-4 text-[30px] font-semibold leading-[1.08] tracking-[-.035em] sm:text-[36px]">
                {t("landing.flex.title1")}<br /><span className="text-[#0E2A63]">{t("landing.flex.title2")}</span>
              </h2>
              <p className="mt-4 max-w-[38ch] text-[14px] leading-[1.7] text-[#3C4A5A]">
                {t("landing.flex.body")}
              </p>
              <div className="mt-6 flex items-center gap-2">
                <SlidersHorizontal size={13} className="text-[#0E2A63]" />
                <Label className="text-[#8A94A1]">{t("landing.flex.meta")}</Label>
              </div>
            </div>

            <div className="grid gap-8 border-t border-[#101A26]/15 py-8 lg:border-t-0 lg:grid-cols-[1fr_.85fr] lg:py-14 lg:pl-8">
              <div data-reveal>
                {flexibility.map((f, i) => (
                  <div key={f.titleKey} className="border-t border-[#101A26]/15 py-4 first:border-t-0 first:pt-0">
                    <div className="flex items-baseline gap-3">
                      <Label className="text-[#8A94A1]">{String(i + 1).padStart(2, "0")}</Label>
                      <h3 className="text-[14px] font-semibold tracking-[-.01em]">{t(f.titleKey)}</h3>
                    </div>
                    <p className="mt-1.5 pl-8 text-[13.5px] leading-[1.7] text-[#3C4A5A]">{t(f.bodyKey)}</p>
                  </div>
                ))}
                <a href="#product-tour" className="mt-5 inline-flex items-center gap-2 rounded-[2px] border border-[#101A26]/25 px-4 py-2.5 text-[12px] font-medium transition hover:border-[#0E2A63] hover:text-[#0E2A63]">
                  {t("landing.flex.cta")} <ArrowRight size={13} />
                </a>
              </div>
              <div data-reveal>
                <SettingsPreview />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 05 product tour ---------- */}
      <PunchHoles />
      <section id="product-tour" className="relative scroll-mt-16 border-b border-[#101A26]/15">
        <div className="mx-auto max-w-[1360px] px-4 sm:px-8">
          <div className="grid [&>*]:min-w-0 lg:grid-cols-[260px_1fr]">
            <div className="border-[#101A26]/15 py-10 lg:border-r lg:py-14 lg:pr-8">
              <Label className="text-[#0E2A63]">{t("landing.tour.eyebrow")}</Label>
              <h2 data-reveal className="mt-4 text-[30px] font-semibold leading-[1.08] tracking-[-.035em] sm:text-[36px]">
                {t("landing.tour.title")}
              </h2>
              <p className="mt-4 max-w-[38ch] text-[14px] leading-[1.7] text-[#3C4A5A]">
                {t("landing.tour.body")}
              </p>
              <div className="mt-6 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-[1px] bg-[#0E2A63]" />
                <Label className="text-[#8A94A1]">{t("landing.tour.meta")}</Label>
              </div>
            </div>

            <div className="grid gap-6 [&>*]:min-w-0 border-t border-[#101A26]/15 py-8 lg:border-t-0 lg:grid-cols-[.6fr_1fr] lg:py-14 lg:pl-8">
              <div className="flex flex-col">
                {tourItems.map((item, index) => {
                  const Icon = item.icon
                  const active = activeTour === index
                  return (
                    <button
                      key={t(item.labelKey)}
                      onClick={() => setActiveTour(index)}
                      aria-pressed={active}
                      className={`flex items-center gap-2.5 border-b border-[#101A26]/15 px-1 py-2.5 text-left transition ${active ? "text-[#101A26]" : "text-[#6B7887] hover:text-[#101A26]"}`}
                    >
                      <Label className="text-[#8A94A1]">{String(index + 1).padStart(2, "0")}</Label>
                      <Icon size={13} className={active ? "text-[#0E2A63]" : "text-[#8A94A1]"} />
                      <span className="flex-1 text-[13px] font-medium">{t(item.labelKey)}</span>
                      {active && <span className="h-1.5 w-1.5 rounded-[1px] bg-[#0E2A63]" />}
                    </button>
                  )
                })}
              </div>

              <div className="rounded-[2px] border border-[#101A26]/20 bg-white p-5 sm:p-6">
                <div className="flex items-center justify-between border-b border-[#101A26]/12 pb-3">
                  <Label className="text-[#8A94A1]">{t("landing.tour.preview")}</Label>
                  <Label className="text-[#8A94A1]">{String(activeTour + 1).padStart(2, "0")} / 06</Label>
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[2px] bg-[#0E2A63] text-white"><ActiveIcon size={16} /></span>
                  <h3 className="text-[17px] font-semibold tracking-[-.02em]">{t(tourItems[activeTour].labelKey)}</h3>
                </div>
                <p className="mt-3 text-[13px] leading-[1.7] text-[#3C4A5A]">{t(tourItems[activeTour].detailKey)}</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {tourItems.map((item, index) => (
                      <button
                        key={t(item.labelKey)}
                        onClick={() => setActiveTour(index)}
                        aria-label={t("landing.tour.show", { item: t(item.labelKey) })}
                        aria-current={activeTour === index}
                        className="flex h-9 w-9 items-center justify-center rounded-[2px]"
                      >
                        <span className={`h-1 w-full rounded-[1px] ${activeTour === index ? "bg-[#0E2A63]" : "bg-[#101A26]/15"}`} />
                      </button>
                    ))}
                  </div>
                  <button ref={tourTriggerRef} onClick={() => setTourOpen(true)} className="ml-auto inline-flex items-center gap-2 rounded-[2px] bg-[#101A26] px-3.5 py-2 text-[11px] font-medium text-white transition hover:bg-[#0E2A63]">
                    {t("landing.tour.cta")} <Play size={11} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 06 closing block (white, like the rest of the paper) ---------- */}
      <PunchHoles />
      <section className="relative border-b border-[#101A26]/15">
        <div className="relative mx-auto max-w-[1360px] px-4 py-14 sm:px-8 sm:py-20">
          <div className="grid gap-10 border-[#101A26]/15 [&>*]:min-w-0 lg:grid-cols-[1.05fr_1fr_1fr] lg:gap-12">
            <div>
              <Label className="text-[#0E2A63]">{t("landing.cta.eyebrow")}</Label>
              <h2 data-reveal className="mt-4 text-[30px] font-semibold leading-[1.06] tracking-[-.04em] text-[#101A26] sm:text-[40px] lg:text-[44px]">
                {t("landing.cta.title1")} <span className="text-[#0E2A63]">{t("landing.cta.title2")}</span>
              </h2>
              <p className="mt-4 max-w-[38ch] text-[14px] leading-[1.7] text-[#3C4A5A]">
                {t("landing.cta.body")}
              </p>
            </div>

            <div className="flex flex-col justify-end">
              <div className="border-t border-[#101A26]/15 pt-4">
                <Label className="text-[#8A94A1]">{t("landing.cta.col1.head")}</Label>
                <p className="mt-2 text-[13.5px] leading-[1.7] text-[#3C4A5A]">
                  {t("landing.cta.col1.body")}
                </p>
              </div>
              <div className="mt-5 border-t border-[#101A26]/15 pt-4">
                <Label className="text-[#8A94A1]">{t("landing.cta.col2.head")}</Label>
                <p className="mt-2 text-[13.5px] leading-[1.7] text-[#3C4A5A]">
                  {t("landing.cta.col2.body")}
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between">
              <div className="flex flex-wrap gap-2">
                <Link href="/register" className="inline-flex items-center gap-2 rounded-[2px] bg-[#0E2A63] px-4 py-2.5 text-[12px] font-medium text-white transition hover:bg-[#0A1F4A]">
                  {t("landing.hero.primary")} <ArrowRight size={13} />
                </Link>
                <a href="#product-tour" className="inline-flex items-center gap-2 rounded-[2px] border border-[#101A26]/25 px-4 py-2.5 text-[12px] font-medium text-[#101A26] transition hover:border-[#0E2A63] hover:text-[#0E2A63]">
                  <Play size={12} /> {t("landing.hero.secondary")}
                </a>
              </div>
              <div className="mt-8 flex items-end justify-between border-t border-[#101A26]/15 pt-4">
                <div>
                  <Label className="text-[#8A94A1]">CuanApp</Label>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-[.14em] text-[#59667A]">{t("landing.cta.productDescriptor")}</div>
                </div>
                <Label className="text-[#8A94A1]">{t("landing.cta.year")}</Label>
              </div>
            </div>
          </div>
        </div>
      </section>
      </main>

      {/* ---------- footer: a second torn-off sheet, with its own holes ---------- */}
      </div>{/* end first paper sheet */}

      <div className="relative mt-3 border border-[#101A26]/25 bg-[#FCFCFA]">
        <div className="pointer-events-none absolute inset-y-0 left-8 hidden w-px sm:block" style={{ backgroundImage: "repeating-linear-gradient(to bottom, rgba(16,26,38,.30) 0 4px, transparent 4px 10px)" }} />
        <div className="pointer-events-none absolute inset-y-0 right-8 hidden w-px sm:block" style={{ backgroundImage: "repeating-linear-gradient(to bottom, rgba(16,26,38,.30) 0 4px, transparent 4px 10px)" }} />
      <PunchHoles />
      <footer className="bg-[#FCFCFA]">
        <div className="mx-auto max-w-[1360px] px-4 sm:px-8">
          <div className="grid gap-8 border-b border-[#101A26]/15 py-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2.5">
                <LogoMark />
                <span className="text-[14px] font-semibold tracking-[-.02em]">CuanApp</span>
              </div>
              <p className="mt-3 max-w-[34ch] text-[13px] leading-[1.7] text-[#59667A]">
                {t("landing.footer.tagline")}
              </p>
            </div>
            {[
              { headKey: "landing.footer.product", links: [["landing.nav.solutions", "#solutions"], ["landing.nav.industries", "#industries"], ["landing.nav.flexibility", "#flexibility"], ["landing.nav.tour", "#product-tour"]] },
              { headKey: "landing.footer.account", links: [["landing.footer.signIn", "/login"], ["landing.footer.signUp", "/register"]] },
              { headKey: "landing.footer.help", links: [["landing.footer.howItWorks", "#product-tour"], ["landing.footer.customization", "#flexibility"]] },
            ].map(col => (
              <div key={col.headKey}>
                <Label className="text-[#8A94A1]">{t(col.headKey)}</Label>
                <ul className="mt-3 space-y-2">
                  {col.links.map(([labelKey, href]) => (
                    <li key={labelKey}>
                      {href.startsWith("#")
                        ? <a href={href} className="text-[13px] text-[#3C4A5A] transition hover:text-[#0E2A63]">{t(labelKey)}</a>
                        : <Link href={href} className="text-[13px] text-[#3C4A5A] transition hover:text-[#0E2A63]">{t(labelKey)}</Link>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-start justify-between gap-3 py-5 sm:flex-row sm:items-center">
            <Label className="text-[#8A94A1]">{t("landing.footer.rights")}</Label>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><Globe2 size={11} className="text-[#8A94A1]" /><Label className="text-[#59667A]">{t("landing.footer.language")}</Label></span>
              <span className="flex items-center gap-1.5"><ShieldCheck size={11} className="text-[#8A94A1]" /><Label className="text-[#59667A]">{t("landing.footer.privacy")}</Label></span>
            </div>
          </div>
        </div>
      </footer>
      </div>{/* end paper sheet */}
      </div>{/* end inner wrapper */}
      </div>{/* end mat wrapper */}

      {/* ---------- tour modal ---------- */}
      {tourOpen && (
        <div
          className="m-overlay fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-[#101A26]/70 p-4 sm:items-center"
          onMouseDown={e => {
            if (e.target === e.currentTarget) {
              setTourOpen(false)
              tourTriggerRef.current?.focus()
            }
          }}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tour-title"
            tabIndex={-1}
            className="m-panel relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-[2px] border border-[#101A26]/25 bg-[#FCFCFA] p-4 shadow-xl outline-none sm:p-7"
          >
            <div className="flex items-center justify-between border-b border-[#101A26]/15 pb-3">
              <h2 id="tour-title" className="font-mono text-[10px] uppercase tracking-[.18em] text-[#0E2A63]">{t("landing.tour.dialogTitle")}</h2>
              <button onClick={() => setTourOpen(false)} className="rounded-[2px] border border-[#101A26]/20 p-1.5 text-[#3C4A5A] hover:border-[#101A26]/40" aria-label={t("landing.tour.dialogClose")}>
                <X size={14} />
              </button>
            </div>
            <div className="mt-4 flex aspect-video flex-col items-center justify-center border border-[#101A26]/20 bg-white text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-[2px] border border-[#101A26]/20"><Play size={18} /></span>
              <div className="mt-4 text-[15px] font-semibold">{t("landing.tour.dialogHeading")}</div>
              <p className="mt-2 max-w-md px-6 text-[13px] leading-[1.7] text-[#59667A]">
                {t("landing.tour.dialogBody")}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <Label className="text-[#8A94A1]">{t("landing.tour.modules")}</Label>
              <button onClick={() => setTourOpen(false)} className="rounded-[2px] bg-[#0E2A63] px-3.5 py-2 text-[11px] font-medium text-white">{t("landing.tour.dialogClose")}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
