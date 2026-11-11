"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
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
  {
    no: "01",
    title: "Unified Business Operations",
    body: "Kelola pembelian, penjualan, persediaan, dan pengiriman melalui satu sistem yang saling terhubung. Sederhanakan operasional tanpa kehilangan kendali atas setiap transaksi.",
    tags: ["Purchasing", "Sales", "Inventory", "Delivery"],
  },
  {
    no: "02",
    title: "Complete Financial Visibility",
    body: "Pantau arus kas, utang, piutang, biaya, dan profitabilitas melalui pencatatan serta laporan keuangan yang terintegrasi.",
    tags: ["Cash flow", "Receivables", "Payables", "Profitability"],
  },
  {
    no: "03",
    title: "Smarter Business Decisions",
    body: "Ubah data transaksi menjadi informasi yang bermakna. Pahami performa bisnis dan gunakan informasi tersebut untuk menentukan langkah selanjutnya.",
    tags: ["HPP", "Margin", "Trend", "Reports"],
  },
]

const flexibility = [
  { title: "Flexible Feature Management", body: "Aktifkan dan nonaktifkan modul seperti Inventory, Purchasing, Sales, Delivery, Customer Credit, Supplier Credit, dan Accounting sesuai kebutuhan bisnis." },
  { title: "Customizable Business Logic", body: "Sesuaikan metode perhitungan dan aturan bisnis, termasuk metode penilaian persediaan seperti FIFO dan Weighted Average." },
  { title: "Configurable Workflows", body: "Atur bagaimana proses pembelian, penjualan, pembayaran, persediaan, dan aktivitas operasional berjalan sesuai model bisnis Anda." },
  { title: "Designed to Expand", body: "Mulai dengan fitur yang diperlukan hari ini dan kembangkan konfigurasi sistem seiring bertambahnya kebutuhan bisnis." },
]

const tourItems = [
  { label: "Dashboard", icon: BarChart3, detail: "Pahami kondisi bisnis melalui ringkasan penjualan, laba, persediaan, dan aktivitas terbaru." },
  { label: "Sales & Orders", icon: ShoppingCart, detail: "Kelola pesanan, pelanggan, status pengiriman, pembayaran, dan retur dalam alur yang terhubung." },
  { label: "Inventory", icon: Boxes, detail: "Pantau pergerakan stok dan nilai persediaan berdasarkan transaksi yang tercatat." },
  { label: "Purchasing", icon: ClipboardList, detail: "Catat pembelian, invoice pemasok, penerimaan barang, dan kewajiban pembayaran." },
  { label: "Finance", icon: Wallet, detail: "Hubungkan penerimaan, pengeluaran, akun keuangan, utang, dan piutang." },
  { label: "Reports", icon: ChartNoAxesCombined, detail: "Telusuri performa usaha melalui laporan operasional dan laporan keuangan." },
]

const navItems = [
  { label: "Solutions", href: "#solutions" },
  { label: "Industries", href: "#industries" },
  { label: "Flexibility", href: "#flexibility" },
  { label: "Product Tour", href: "#product-tour" },
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

function Tags({ items }: { items: string[] }) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-1.5">
      {items.map(t => (
        <span key={t} className="rounded-[3px] border border-[#101A26]/20 px-2 py-1 font-mono text-[10px] uppercase tracking-[.12em] text-[#3C4A5A]">
          {t}
        </span>
      ))}
    </div>
  )
}

function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-[3px] bg-[#0E2A63] ${className}`}>
      <Image src="/cuanapp-logo.svg" alt="" width={15} height={15} />
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Product screenshot                                                  */
/* ------------------------------------------------------------------ */

function DashboardPreview() {
  return (
    <div className="relative w-full">
      <div className="overflow-hidden rounded-[3px] border border-[#101A26]/25 bg-white">
        <div className="flex h-9 items-center justify-between border-b border-[#101A26]/12 bg-[#FAFAF5] px-3">
          <div className="flex w-full items-center gap-2">
            <span className="h-2 w-2 rounded-[1px] bg-[#101A26]/20" />
            <span className="h-2 w-2 rounded-[1px] bg-[#101A26]/20" />
            <span className="h-2 w-2 rounded-[1px] bg-[#101A26]/20" />
            <span className="ml-3 font-mono text-[9px] uppercase tracking-[.14em] text-[#6B7887]">app.cuanapp.id / dashboard</span>
          </div>
          <Label className="hidden text-[#6B7887] sm:block">Illustrative preview</Label>
        </div>

        <div className="grid min-h-[380px] grid-cols-[46px_1fr] sm:min-h-[430px] sm:grid-cols-[168px_1fr]">
          <aside className="border-r border-[#101A26]/12 bg-[#FAFAF5] p-2 sm:p-3">
            <Label className="mb-4 hidden text-[#8A94A1] sm:block">Workspace</Label>
            {[[BarChart3, "Dashboard"], [ShoppingCart, "Sales & orders"], [Boxes, "Inventory"], [ClipboardList, "Purchasing"], [Wallet, "Finance"], [BookOpen, "Reports"]].map(([Icon, label], i) => {
              const I = Icon as typeof BarChart3
              return (
                <div key={String(label)} className={`mb-0.5 flex items-center justify-center gap-2 rounded-[3px] px-2 py-2 text-[10px] sm:justify-start ${i === 0 ? "bg-[#1746C8] font-medium text-white" : "text-[#59667A]"}`}>
                  <I size={13} /><span className="hidden sm:inline">{String(label)}</span>
                </div>
              )
            })}
          </aside>

          <div className="min-w-0 bg-white p-3 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#101A26]/12 pb-3">
              <div>
                <Label className="text-[#1746C8]">Business overview</Label>
                <div className="mt-1.5 text-[15px] font-semibold tracking-[-.02em] text-[#101A26] sm:text-lg">Good morning, business owner</div>
              </div>
              <span className="rounded-[3px] border border-[#101A26]/20 px-2 py-1 font-mono text-[9px] uppercase tracking-[.1em] text-[#59667A]">This month</span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-px bg-[#101A26]/12 md:grid-cols-4">
              {[["Total sales", "Rp 48.250.000", "+12.8%"], ["Gross profit", "Rp 12.840.000", "+8.2%"], ["Receivables", "Rp 6.450.000", "Open"], ["Inventory", "Rp 32.600.000", "128 SKU"]].map(([l, v, c], i) => (
                <div key={l} className="bg-white p-2.5">
                  <Label className="text-[#8A94A1]">{l}</Label>
                  <div className="mt-1.5 text-[11px] font-semibold tracking-[-.01em] text-[#101A26] sm:text-[13px]">{v}</div>
                  <div className={`mt-0.5 font-mono text-[9px] ${i === 1 ? "text-emerald-700" : i === 2 ? "text-amber-700" : "text-[#1746C8]"}`}>{c}</div>
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-[1.4fr_1fr]">
              <div className="rounded-[3px] border border-[#101A26]/12 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-[#101A26]">Sales performance</span>
                  <Label className="text-[#8A94A1]">6 mo</Label>
                </div>
                <div className="mt-3 flex h-[92px] items-end gap-1.5 border-b border-[#101A26]/12">
                  {[38, 55, 46, 72, 61, 88].map((h, i) => (
                    <div key={i} className="flex-1 bg-[#1746C8]" style={{ height: `${h}%`, opacity: 0.35 + i * 0.11 }} />
                  ))}
                </div>
                <div className="mt-1.5 flex justify-between font-mono text-[8px] uppercase text-[#8A94A1]">
                  <span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span>
                </div>
              </div>
              <div className="rounded-[3px] border border-[#101A26]/12 p-3">
                <Label className="text-[#8A94A1]">Recent activity</Label>
                <div className="mt-3 space-y-2.5">
                  {[["Purchase recorded", "Supplier invoice · 2m", "bg-[#1746C8]"], ["Order delivered", "ORD-2026-0082 · 24m", "bg-emerald-600"], ["Payment received", "BCA · 1h", "bg-violet-600"]].map(([a, b, d]) => (
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
  const [toggles, setToggles] = useState([true, true, true, false, true, false])
  const [method, setMethod] = useState("FIFO")
  const rows = ["Inventory", "Purchasing", "Sales", "Delivery", "Customer Credit", "Supplier Credit"]

  return (
    <div className="overflow-hidden rounded-[3px] border border-[#101A26]/25 bg-white">
      <div className="flex items-center justify-between border-b border-[#101A26]/12 bg-[#FAFAF5] px-4 py-2.5">
        <span className="flex items-center gap-2 text-[11px] font-semibold text-[#101A26]"><Settings2 size={13} /> Business settings</span>
        <Label className="text-[#8A94A1]">Configuration</Label>
      </div>
      <div className="p-4">
        <Label className="text-[#8A94A1]">Features</Label>
        <div className="mt-2">
          {rows.map((f, i) => (
            <div key={f} className="flex items-center justify-between border-b border-[#101A26]/12 py-2 last:border-0">
              <span className="text-[11px] text-[#101A26]">{f}</span>
              <button
                onClick={() => setToggles(t => t.map((v, j) => (j === i ? !v : v)))}
                role="switch"
                aria-checked={toggles[i]}
                aria-label={f}
                className={`m-toggle-track relative h-4 w-7 rounded-[2px] border ${toggles[i] ? "border-[#1746C8] bg-[#1746C8]" : "border-[#101A26]/25 bg-white"}`}
              >
                <span className={`m-toggle-knob absolute top-[1px] h-[12px] w-[12px] rounded-[1px] ${toggles[i] ? "translate-x-[13px] bg-white" : "translate-x-[1px] bg-[#101A26]/25"}`} />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 border border-[#101A26]/15 p-3">
          <Label className="text-[#8A94A1]">Inventory costing method</Label>
          <div className="mt-2 flex gap-1.5">
            {["FIFO", "Weighted Average"].map(m => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                aria-pressed={method === m}
                className={`m-chip rounded-[3px] border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[.08em] ${method === m ? "border-[#1746C8] bg-[#1746C8] text-white" : "border-[#101A26]/20 text-[#3C4A5A]"}`}
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
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
    const SPEED = 26
    let raf = 0
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min(now - last, 64)
      last = now
      const el = trackRef.current
      if (el && !paused.current && !hover.current && now > pauseUntil.current && !reduce.matches && !document.hidden) {
        el.scrollLeft += (SPEED * dt) / 1000
        if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 2) el.scrollLeft = 0
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
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
      {/* ---------- top patterned band ---------- */}
      <div className="relative overflow-hidden bg-[#0D2450] text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[.35]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(255,255,255,.55) 0 1px, transparent 1px 10px)",
            maskImage: "linear-gradient(to bottom, black 0 45%, transparent 100%)",
          }}
        />
        <div className="relative mx-auto flex h-9 max-w-[1360px] items-center justify-between px-4 sm:px-8">
          <Label className="text-white/80">CuanApp — Business operating system</Label>
          <Label className="text-white/80">01 / 2026</Label>
        </div>
      </div>

      {/* ---------- navigation ---------- */}
      <header className="sticky top-0 z-40 border-b border-[#101A26]/15 bg-[#F3F3ED]/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1360px] items-center justify-between px-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark />
            <span className="text-[14px] font-semibold tracking-[-.02em]">CuanApp</span>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {navItems.map(item => (
              <a key={item.label} href={item.href} className="font-mono text-[10px] uppercase tracking-[.16em] text-[#3C4A5A] transition hover:text-[#1746C8]">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <span className="flex items-center gap-1.5 rounded-[3px] border border-[#101A26]/20 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[.12em] text-[#3C4A5A]">
              <Globe2 size={12} /> ID
            </span>
            <Link href="/login" className="px-2 font-mono text-[10px] uppercase tracking-[.12em] text-[#3C4A5A] hover:text-[#101A26]">Masuk</Link>
            <Link href="/register" className="rounded-[3px] bg-[#1746C8] px-3.5 py-2 text-[11px] font-medium text-white transition hover:bg-[#1238A4]">
              Mulai gratis
            </Link>
          </div>

          <button
            className="rounded-[3px] border border-[#101A26]/20 p-2 lg:hidden"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {menuOpen && (
          <div id="mobile-menu" className="border-t border-[#101A26]/15 bg-[#F3F3ED] px-4 py-3 lg:hidden">
            {navItems.map(item => (
              <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)} className="block border-b border-[#101A26]/10 py-2.5 font-mono text-[11px] uppercase tracking-[.14em] text-[#3C4A5A]">
                {item.label}
              </a>
            ))}
            <div className="mt-3 flex gap-2">
              <Link href="/login" className="flex-1 rounded-[3px] border border-[#101A26]/20 py-2 text-center text-[11px]">Masuk</Link>
              <Link href="/register" className="flex-1 rounded-[3px] bg-[#1746C8] py-2 text-center text-[11px] text-white">Mulai gratis</Link>
            </div>
          </div>
        )}
      </header>

      <main id="main" lang="id" className="min-h-screen bg-[#F3F3ED] text-[#101A26]">
      {/* ---------- hero ---------- */}
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
                <Label className="text-[#1746C8]">01 — Platform</Label>
                <span className="h-px w-14 bg-[#101A26]/25" />
              </div>
              <h1 className="m-enter m-enter--1 mt-6 max-w-[15ch] text-[38px] font-semibold leading-[1.02] tracking-[-.045em] sm:text-[52px] lg:text-[64px]">
                Run Your Business.{" "}
                <span className="text-[#1746C8]">Your Way.</span>
              </h1>
              <div className="mt-7 flex flex-wrap items-center gap-2">
                <Link href="/register" className="m-enter m-enter--4 inline-flex items-center gap-2 rounded-[3px] bg-[#1746C8] px-4 py-2.5 text-[12px] font-medium text-white transition hover:bg-[#1238A4]">
                  Get Started <ArrowRight size={13} />
                </Link>
                <a href="#product-tour" className="m-enter m-enter--4 inline-flex items-center gap-2 rounded-[3px] border border-[#101A26]/25 px-4 py-2.5 text-[12px] font-medium text-[#101A26] transition hover:border-[#101A26]/50">
                  <Play size={12} /> Explore CuanApp
                </a>
              </div>
            </div>

            <div className="flex flex-col justify-end">
              <p className="m-enter m-enter--2 max-w-[46ch] text-[15px] leading-[1.7] text-[#3C4A5A] sm:text-[16px]">
                Kelola, pahami, dan kembangkan bisnis Anda melalui satu platform terintegrasi. Fleksibel untuk berbagai jenis usaha, dirancang untuk mengikuti pertumbuhan bisnis Anda.
              </p>
              <div className="mt-6 flex items-center gap-3 border-t border-[#101A26]/15 pt-4">
                <Label className="text-[#8A94A1]">Operational clarity</Label>
                <span className="h-px flex-1 bg-[#101A26]/10" />
                <Label className="text-[#8A94A1]">Financial visibility</Label>
              </div>
            </div>
          </div>

          {/* screenshot, framed like a figure in a document */}
          <div className="m-enter m-enter--5 relative pb-12 pt-8 sm:pb-16">
            <div className="mb-3 flex items-end justify-between">
              <Label className="text-[#8A94A1]">Fig. 01 — Connected business workspace</Label>
              <Label className="hidden text-[#8A94A1] sm:block">Dashboard</Label>
            </div>
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* ---------- module marquee ---------- */}
      <section aria-label="CuanApp modules" className="border-b border-[#101A26]/15 bg-[#EDEDE6] py-3">
        <div className="group flex overflow-hidden">
          <div className="flex shrink-0 animate-marquee items-center gap-6 pr-6 group-hover:[animation-play-state:paused]">
            {[...modules, ...modules].map((m, i) => (
              <span key={`${m}-${i}`} className="flex items-center gap-2 whitespace-nowrap">
                <span className="h-1 w-1 rounded-[1px] bg-[#1746C8]" />
                <Label className="text-[#3C4A5A]">{m}</Label>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 02 industries ---------- */}
      <section id="industries" className="scroll-mt-16 overflow-x-clip border-b border-[#101A26]/15">
        <div className="mx-auto max-w-[1360px] px-4 sm:px-8">
          <div className="grid [&>*]:min-w-0 lg:grid-cols-[260px_1fr]">
            <div className="border-[#101A26]/15 py-10 lg:border-r lg:py-14 lg:pr-8">
              <Label className="text-[#1746C8]">02 — Industries</Label>
              <h2 data-reveal className="mt-4 text-[26px] font-semibold leading-[1.08] tracking-[-.035em] sm:text-[32px]">
                Every business is different.
                <br />
                <span className="text-[#1746C8]">CuanApp is built for all.</span>
              </h2>
              <p className="mt-4 max-w-[34ch] text-[13px] leading-[1.7] text-[#3C4A5A]">
                Setiap bisnis memiliki cara kerja yang unik. Arsitektur CuanApp fleksibel untuk mendukung ekspansi operasional usaha apa pun.
              </p>
              <div className="mt-6 flex items-center gap-2">
                <button onClick={() => scrollCarousel(-1)} aria-label="Previous industries" className="flex h-8 w-8 items-center justify-center rounded-[3px] border border-[#101A26]/20 transition hover:border-[#1746C8] hover:text-[#1746C8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1746C8] focus-visible:ring-offset-2">
                  <ArrowLeft size={13} />
                </button>
                <button onClick={() => scrollCarousel(1)} aria-label="Next industries" className="flex h-8 w-8 items-center justify-center rounded-[3px] border border-[#101A26]/20 transition hover:border-[#1746C8] hover:text-[#1746C8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1746C8] focus-visible:ring-offset-2">
                  <ArrowRight size={13} />
                </button>
                <div className="ml-2 h-0.5 w-24 overflow-hidden bg-[#101A26]/15">
                  <div className="m-progress h-full bg-[#1746C8]" style={{ width: `${progress}%` }} />
                </div>
                <button
                  onClick={() => { paused.current = !paused.current; setPausedUi(paused.current) }}
                  aria-pressed={pausedUi}
                  className="ml-1 flex h-8 items-center gap-1.5 rounded-[3px] border border-[#101A26]/20 px-2 font-mono text-[9px] uppercase tracking-[.12em] text-[#3C4A5A] transition hover:border-[#1746C8] hover:text-[#1746C8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1746C8] focus-visible:ring-offset-2"
                >
                  {pausedUi ? <Play size={10} /> : <Pause size={10} />}
                  {pausedUi ? "Play" : "Pause"}
                </button>
              </div>
            </div>

            <div className="border-t border-[#101A26]/15 py-8 lg:border-t-0 lg:pl-8 lg:py-14">
              <div
                ref={trackRef}
                role="region"
                aria-label="Business types carousel"
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
                className="m-track flex cursor-grab touch-pan-y gap-3 overflow-x-auto pb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1746C8] focus-visible:ring-offset-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {industries.map((group, i) => {
                  const Icon = group.icon
                  return (
                    <div key={i} data-card className="m-card w-[248px] shrink-0 select-none rounded-[3px] border border-[#101A26]/20 bg-white p-4">
                      <div className="flex items-center justify-between">
                        <span className="flex h-8 w-8 items-center justify-center rounded-[3px] border border-[#101A26]/15 text-[#1746C8]">
                          <Icon size={15} strokeWidth={1.7} />
                        </span>
                        <Label className="text-[#8A94A1]">{String(i + 1).padStart(2, "0")}</Label>
                      </div>
                      <ul className="mt-4 space-y-1.5">
                        {group.items.map(item => (
                          <li key={item} className="flex items-start gap-1.5 border-t border-[#101A26]/10 pt-1.5 text-[11px] leading-[1.5] text-[#3C4A5A] first:border-0 first:pt-0">
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
      <section id="solutions" className="scroll-mt-16 border-b border-[#101A26]/15">
        <div className="mx-auto max-w-[1360px] px-4 sm:px-8">
          <div className="grid [&>*]:min-w-0 lg:grid-cols-[260px_1fr]">
            <div className="border-[#101A26]/15 py-10 lg:border-r lg:py-14 lg:pr-8">
              <Label className="text-[#1746C8]">03 — Solutions</Label>
              <h2 data-reveal className="mt-4 text-[26px] font-semibold leading-[1.08] tracking-[-.035em] sm:text-[32px]">
                Everything your business needs.
                <br />
                <span className="text-[#1746C8]">All in one place.</span>
              </h2>
              <p className="mt-4 max-w-[34ch] text-[13px] leading-[1.7] text-[#3C4A5A]">
                CuanApp menghubungkan setiap bagian bisnis ke dalam satu sistem terintegrasi, dari operasional harian hingga laporan keuangan.
              </p>
            </div>

            <div className="py-8 lg:py-14 lg:pl-8">
              <div data-reveal data-reveal-stagger>
                {solutionRows.map((row, i) => (
                  <div key={row.no} className={`m-lift grid gap-3 border-t border-[#101A26]/15 py-6 sm:grid-cols-[54px_1fr] ${i === solutionRows.length - 1 ? "border-b" : ""}`}>
                    <div>
                      <Label className="text-[#1746C8]">{row.no}</Label>
                    </div>
                    <div>
                      <h3 className="text-[17px] font-semibold tracking-[-.02em] sm:text-[19px]">{row.title}</h3>
                      <p className="mt-2 max-w-[62ch] text-[13px] leading-[1.7] text-[#3C4A5A]">{row.body}</p>
                      <Tags items={row.tags} />
                    </div>
                  </div>
                ))}
              </div>
              <a href="#product-tour" className="mt-7 inline-flex items-center gap-2 rounded-[3px] border border-[#101A26]/25 px-4 py-2.5 text-[12px] font-medium transition hover:border-[#1746C8] hover:text-[#1746C8]">
                Discover our solutions <ArrowRight size={13} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 04 flexibility ---------- */}
      <section id="flexibility" className="scroll-mt-16 border-b border-[#101A26]/15">
        <div className="mx-auto max-w-[1360px] px-4 sm:px-8">
          <div className="grid [&>*]:min-w-0 lg:grid-cols-[260px_1fr]">
            <div className="border-[#101A26]/15 py-10 lg:border-r lg:py-14 lg:pr-8">
              <Label className="text-[#1746C8]">04 — Flexibility</Label>
              <h2 data-reveal className="mt-4 text-[26px] font-semibold leading-[1.08] tracking-[-.035em] sm:text-[32px]">
                Your business. Your rules.
                <br />
                <span className="text-[#1746C8]">Your system.</span>
              </h2>
              <p className="mt-4 max-w-[34ch] text-[13px] leading-[1.7] text-[#3C4A5A]">
                Tidak ada dua bisnis yang beroperasi dengan cara yang sama. Aktifkan fitur yang dibutuhkan, nonaktifkan yang tidak relevan.
              </p>
              <div className="mt-6 flex items-center gap-2">
                <SlidersHorizontal size={13} className="text-[#1746C8]" />
                <Label className="text-[#8A94A1]">Settings driven</Label>
              </div>
            </div>

            <div className="grid gap-8 border-t border-[#101A26]/15 py-8 lg:border-t-0 lg:grid-cols-[1fr_.85fr] lg:py-14 lg:pl-8">
              <div data-reveal>
                {flexibility.map((f, i) => (
                  <div key={f.title} className="border-t border-[#101A26]/15 py-4 first:border-t-0 first:pt-0">
                    <div className="flex items-baseline gap-3">
                      <Label className="text-[#8A94A1]">{String(i + 1).padStart(2, "0")}</Label>
                      <h3 className="text-[14px] font-semibold tracking-[-.01em]">{f.title}</h3>
                    </div>
                    <p className="mt-1.5 pl-8 text-[12.5px] leading-[1.65] text-[#3C4A5A]">{f.body}</p>
                  </div>
                ))}
                <a href="#product-tour" className="mt-5 inline-flex items-center gap-2 rounded-[3px] border border-[#101A26]/25 px-4 py-2.5 text-[12px] font-medium transition hover:border-[#1746C8] hover:text-[#1746C8]">
                  Explore customization <ArrowRight size={13} />
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
      <section id="product-tour" className="scroll-mt-16 border-b border-[#101A26]/15">
        <div className="mx-auto max-w-[1360px] px-4 sm:px-8">
          <div className="grid [&>*]:min-w-0 lg:grid-cols-[260px_1fr]">
            <div className="border-[#101A26]/15 py-10 lg:border-r lg:py-14 lg:pr-8">
              <Label className="text-[#1746C8]">05 — Product tour</Label>
              <h2 data-reveal className="mt-4 text-[26px] font-semibold leading-[1.08] tracking-[-.035em] sm:text-[32px]">
                See how CuanApp works.
              </h2>
              <p className="mt-4 max-w-[34ch] text-[13px] leading-[1.7] text-[#3C4A5A]">
                Jelajahi bagaimana CuanApp menghubungkan setiap aktivitas bisnis dalam satu pengalaman yang sederhana.
              </p>
              <div className="mt-6 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-[1px] bg-[#1746C8]" />
                <Label className="text-[#8A94A1]">Interactive demonstration</Label>
              </div>
            </div>

            <div className="grid gap-6 [&>*]:min-w-0 border-t border-[#101A26]/15 py-8 lg:border-t-0 lg:grid-cols-[.6fr_1fr] lg:py-14 lg:pl-8">
              <div className="flex flex-col">
                {tourItems.map((item, index) => {
                  const Icon = item.icon
                  const active = activeTour === index
                  return (
                    <button
                      key={item.label}
                      onClick={() => setActiveTour(index)}
                      aria-pressed={active}
                      className={`flex items-center gap-2.5 border-b border-[#101A26]/15 px-1 py-2.5 text-left transition ${active ? "text-[#101A26]" : "text-[#6B7887] hover:text-[#101A26]"}`}
                    >
                      <Label className="text-[#8A94A1]">{String(index + 1).padStart(2, "0")}</Label>
                      <Icon size={13} className={active ? "text-[#1746C8]" : "text-[#8A94A1]"} />
                      <span className="flex-1 text-[12px] font-medium">{item.label}</span>
                      {active && <span className="h-1.5 w-1.5 rounded-[1px] bg-[#1746C8]" />}
                    </button>
                  )
                })}
              </div>

              <div className="rounded-[3px] border border-[#101A26]/20 bg-white p-5 sm:p-6">
                <div className="flex items-center justify-between border-b border-[#101A26]/12 pb-3">
                  <Label className="text-[#8A94A1]">Screen preview</Label>
                  <Label className="text-[#8A94A1]">{String(activeTour + 1).padStart(2, "0")} / 06</Label>
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[3px] bg-[#1746C8] text-white"><ActiveIcon size={16} /></span>
                  <h3 className="text-[17px] font-semibold tracking-[-.02em]">{tourItems[activeTour].label}</h3>
                </div>
                <p className="mt-3 text-[13px] leading-[1.7] text-[#3C4A5A]">{tourItems[activeTour].detail}</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {tourItems.map((item, index) => (
                      <button
                        key={item.label}
                        onClick={() => setActiveTour(index)}
                        aria-label={`Show ${item.label}`}
                        aria-current={activeTour === index}
                        className="flex h-9 w-9 items-center justify-center rounded-[3px]"
                      >
                        <span className={`h-1 w-full rounded-[1px] ${activeTour === index ? "bg-[#1746C8]" : "bg-[#101A26]/15"}`} />
                      </button>
                    ))}
                  </div>
                  <button ref={tourTriggerRef} onClick={() => setTourOpen(true)} className="ml-auto inline-flex items-center gap-2 rounded-[3px] bg-[#101A26] px-3.5 py-2 text-[11px] font-medium text-white transition hover:bg-[#0E2A63]">
                    Take a tour <Play size={11} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 06 closing block (blue) ---------- */}
      <section className="bg-[#0D2450] text-white">
        <div
          className="pointer-events-none absolute inset-x-0 h-0"
          style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,.3) 0 1px, transparent 1px 12px)" }}
        />
        <div className="relative mx-auto max-w-[1360px] px-4 py-14 sm:px-8 sm:py-20">
          <div className="grid gap-10 border-white/20 [&>*]:min-w-0 lg:grid-cols-[1.05fr_1fr_1fr] lg:gap-12">
            <div>
              <Label className="text-white/60">06 — Get started</Label>
              <h2 data-reveal className="mt-4 text-[30px] font-semibold leading-[1.06] tracking-[-.04em] sm:text-[40px] lg:text-[44px]">
                Ready to take control of <span className="text-[#8FB0FF]">your business?</span>
              </h2>
              <p className="mt-4 max-w-[38ch] text-[13px] leading-[1.7] text-white/70">
                Bisnis Anda memiliki potensi untuk berkembang. Saatnya mengelolanya dengan sistem yang mampu berkembang bersama Anda.
              </p>
            </div>

            <div className="flex flex-col justify-end">
              <div className="border-t border-white/20 pt-4">
                <Label className="text-white/50">Satu sistem</Label>
                <p className="mt-2 text-[12.5px] leading-[1.7] text-white/70">
                  Operasional, persediaan, keuangan, dan laporan bekerja dari data yang sama. Tidak ada angka yang dihitung dua kali.
                </p>
              </div>
              <div className="mt-5 border-t border-white/20 pt-4">
                <Label className="text-white/50">Fleksibel</Label>
                <p className="mt-2 text-[12.5px] leading-[1.7] text-white/70">
                  Mulai dari modul yang dipakai hari ini, tambah konfigurasi saat bisnis bertumbuh.
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between">
              <div className="flex flex-wrap gap-2">
                <Link href="/register" className="inline-flex items-center gap-2 rounded-[3px] bg-white px-4 py-2.5 text-[12px] font-medium text-[#0D2450] transition hover:bg-[#E6EBF7]">
                  Get Started <ArrowRight size={13} />
                </Link>
                <a href="#product-tour" className="inline-flex items-center gap-2 rounded-[3px] border border-white/30 px-4 py-2.5 text-[12px] font-medium text-white transition hover:bg-white/10">
                  <Play size={12} /> Explore CuanApp
                </a>
              </div>
              <div className="mt-8 flex items-end justify-between border-t border-white/20 pt-4">
                <div>
                  <Label className="text-white/50">CuanApp</Label>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-[.14em] text-white/70">Business operating system</div>
                </div>
                <Label className="text-white/40">2026</Label>
              </div>
            </div>
          </div>
        </div>
      </section>
      </main>

      {/* ---------- footer ---------- */}
      <footer className="bg-[#F3F3ED]">
        <div className="mx-auto max-w-[1360px] px-4 sm:px-8">
          <div className="grid gap-8 border-b border-[#101A26]/15 py-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2.5">
                <LogoMark />
                <span className="text-[14px] font-semibold tracking-[-.02em]">CuanApp</span>
              </div>
              <p className="mt-3 max-w-[34ch] text-[12px] leading-[1.7] text-[#59667A]">
                Satu platform terintegrasi untuk mengelola, memahami, dan mengembangkan bisnis Anda.
              </p>
            </div>
            {[
              { head: "Product", links: [["Solutions", "#solutions"], ["Industries", "#industries"], ["Flexibility", "#flexibility"], ["Product Tour", "#product-tour"]] },
              { head: "Akun", links: [["Masuk", "/login"], ["Daftar", "/register"]] },
              { head: "Bantuan", links: [["Cara kerja", "#product-tour"], ["Kustomisasi", "#flexibility"]] },
            ].map(col => (
              <div key={col.head}>
                <Label className="text-[#8A94A1]">{col.head}</Label>
                <ul className="mt-3 space-y-2">
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      {href.startsWith("#")
                        ? <a href={href} className="text-[12px] text-[#3C4A5A] transition hover:text-[#1746C8]">{label}</a>
                        : <Link href={href} className="text-[12px] text-[#3C4A5A] transition hover:text-[#1746C8]">{label}</Link>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-start justify-between gap-3 py-5 sm:flex-row sm:items-center">
            <Label className="text-[#8A94A1]">© 2026 CuanApp. All rights reserved.</Label>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><Globe2 size={11} className="text-[#8A94A1]" /><Label className="text-[#59667A]">Bahasa Indonesia</Label></span>
              <span className="flex items-center gap-1.5"><ShieldCheck size={11} className="text-[#8A94A1]" /><Label className="text-[#59667A]">Data privat</Label></span>
            </div>
          </div>
        </div>
      </footer>

      {/* ---------- bottom patterned band ---------- */}
      <div className="relative h-10 overflow-hidden bg-[#0D2450]">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,.5) 0 1px, transparent 1px 12px)",
            maskImage: "linear-gradient(to top, black 0 45%, transparent 100%)",
          }}
        />
      </div>

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
            className="m-panel relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-[3px] border border-[#101A26]/25 bg-[#F3F3ED] p-4 shadow-xl outline-none sm:p-7"
          >
            <div className="flex items-center justify-between border-b border-[#101A26]/15 pb-3">
              <h2 id="tour-title" className="font-mono text-[10px] uppercase tracking-[.18em] text-[#1746C8]">CuanApp product tour</h2>
              <button onClick={() => setTourOpen(false)} className="rounded-[3px] border border-[#101A26]/20 p-1.5 text-[#3C4A5A] hover:border-[#101A26]/40" aria-label="Close product tour">
                <X size={14} />
              </button>
            </div>
            <div className="mt-4 flex aspect-video flex-col items-center justify-center border border-[#101A26]/20 bg-white text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-[3px] border border-[#101A26]/20"><Play size={18} /></span>
              <div className="mt-4 text-[15px] font-semibold">Walkthrough video</div>
              <p className="mt-2 max-w-md px-6 text-[12px] leading-[1.7] text-[#59667A]">
                Placeholder untuk video walkthrough resmi atau demo aplikasi terpandu.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <Label className="text-[#8A94A1]">Dashboard · Transactions · Inventory · Finance · Reports</Label>
              <button onClick={() => setTourOpen(false)} className="rounded-[3px] bg-[#1746C8] px-3.5 py-2 text-[11px] font-medium text-white">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
