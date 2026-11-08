"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowDown, ArrowLeft, ArrowRight, BarChart3, BookOpen, Boxes, BriefcaseBusiness,
  Building2, Check, ChevronDown, CircleDollarSign, ClipboardList, FileCheck2,
  Globe2, HeartPulse, Landmark, Laptop, Menu, Package, Play, Scale, Settings2,
  ShieldCheck, ShoppingBag, ShoppingCart, Sparkles, Truck, Users, Wallet, Wrench,
  X, Calculator, Camera, Clapperboard, GraduationCap, Plane, Scissors, Shirt,
  Smartphone, SprayCan, Dumbbell, PawPrint, CarFront, Headset, Home, Handshake,
  ReceiptText, Banknote, Workflow, ChartNoAxesCombined, SlidersHorizontal
} from "lucide-react"

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

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="mx-auto max-w-[720px] text-center">
    <div className="text-[10px] font-semibold uppercase tracking-[.22em] text-blue-700">{eyebrow}</div>
    <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-.055em] text-slate-950 sm:text-4xl lg:text-[48px]">{title}</h2>
    <p className="mx-auto mt-5 max-w-[650px] text-sm leading-7 text-slate-500 sm:text-[15px] sm:leading-8">{description}</p>
  </div>
}

function DashboardPreview() {
  return <div className="relative mx-auto w-full max-w-[1040px]">
    <div className="absolute -inset-4 rounded-[28px] bg-slate-400/20 blur-2xl" />
    <div className="relative overflow-hidden rounded-[18px] border border-slate-200/90 bg-white shadow-[0_28px_80px_-38px_rgba(22,44,72,.34)] ring-1 ring-white">
      <div className="flex h-12 items-center justify-between border-b border-slate-100 bg-white px-4 sm:px-6">
        <div className="flex items-center gap-2.5"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-700 text-white"><Wallet size={14}/></span><span className="text-sm font-semibold tracking-tight text-slate-800">CuanApp</span><span className="ml-2 hidden rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-medium text-blue-700 sm:inline-flex">Business workspace</span></div>
        <div className="flex items-center gap-2"><span className="hidden text-[10px] text-slate-400 sm:inline">Illustrative preview</span><span className="h-2 w-2 rounded-full bg-emerald-500"/><div className="h-7 w-7 rounded-full bg-slate-100"/></div>
      </div>
      <div className="grid min-h-[420px] grid-cols-[52px_1fr] sm:min-h-[470px] sm:grid-cols-[176px_1fr]">
        <aside className="border-r border-slate-100 bg-slate-50/90 p-2 sm:p-4">
          <div className="mb-5 hidden text-[9px] font-semibold uppercase tracking-[.18em] text-slate-400 sm:block">Workspace</div>
          {[[BarChart3,"Dashboard"],[ShoppingCart,"Sales & orders"],[Boxes,"Inventory"],[ClipboardList,"Purchasing"],[Wallet,"Finance"],[BookOpen,"Reports"]].map(([Icon,label],i)=>{const I=Icon as typeof BarChart3;return <div key={String(label)} className={`mb-1 flex items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-[10px] sm:justify-start ${i===0?"bg-blue-700 font-medium text-white":"text-slate-500"}`}><I size={14}/><span className="hidden sm:inline">{String(label)}</span></div>})}
        </aside>
        <div className="min-w-0 bg-[#fbfcff] p-3.5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><div className="text-[9px] font-medium uppercase tracking-[.16em] text-blue-700">Business overview</div><div className="mt-1 text-base font-semibold tracking-tight text-slate-900 sm:text-xl">Good morning, business owner</div><div className="mt-1 text-[10px] text-slate-400">A connected view of your business activity.</div></div><div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] text-slate-500">This month⌄</div></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {[["Total sales","Rp 48.250.000","+12.8%"],["Gross profit","Rp 12.840.000","+8.2%"],["Receivables","Rp 6.450.000","Open balance"],["Inventory value","Rp 32.600.000","128 products"]].map(([l,v,c],i)=><div key={l} className="rounded-lg border border-slate-100 bg-white p-2.5 shadow-[0_5px_18px_-15px_rgba(15,23,42,.35)] sm:p-3.5"><div className="text-[9px] text-slate-400">{l}</div><div className="mt-2 text-[12px] font-semibold tracking-tight text-slate-800 sm:text-[15px]">{v}</div><div className={`mt-1 text-[9px] ${i===1?"text-emerald-600":i===2?"text-amber-600":"text-blue-600"}`}>{c}</div></div>)}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1.45fr_1fr]">
            <div className="rounded-lg border border-slate-100 bg-white p-3.5"><div className="flex items-center justify-between"><span className="text-[10px] font-semibold text-slate-700">Sales performance</span><span className="text-[9px] text-slate-400">Last 7 months</span></div><div className="mt-4 flex h-[108px] items-end gap-2 border-b border-slate-100 px-1">{[38,55,46,72,61,88,76,96,70,83,65,91].map((h,i)=><div key={i} className="flex-1 rounded-t-[3px] bg-gradient-to-t from-blue-700 to-blue-400" style={{height:`${h}%`,opacity:i>8?1:.72}}/>)}</div><div className="mt-2 flex justify-between text-[8px] text-slate-400"><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span></div></div>
            <div className="rounded-lg border border-slate-100 bg-white p-3.5"><div className="text-[10px] font-semibold text-slate-700">Recent activity</div><div className="mt-4 space-y-4">{[["Purchase recorded","Supplier invoice · just now","bg-blue-500"],["Order delivered","ORD-2026-0082 · 24 min ago","bg-emerald-500"],["Payment received","BCA · 1 hour ago","bg-violet-500"]].map(([a,b,d])=><div key={a} className="flex gap-2.5"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${d}`}/><div><div className="text-[9px] font-medium text-slate-700">{a}</div><div className="mt-0.5 text-[8px] text-slate-400">{b}</div></div></div>)}</div></div>
          </div>
        </div>
      </div>
    </div>
    <div className="absolute -bottom-5 left-1/2 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-white bg-white/95 px-4 py-2 text-[9px] font-medium text-slate-600 shadow-lg sm:flex"><ShieldCheck size={13} className="text-emerald-600"/> Connected operations & financial records</div>
  </div>
}

function SettingsPreview() {
  return <div className="relative mx-auto w-full max-w-[520px] overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-40px_rgba(15,35,70,.4)] sm:p-6">
    <div className="flex items-center justify-between border-b border-slate-100 pb-4"><div><div className="text-sm font-semibold text-slate-900">Business settings</div><div className="mt-1 text-[10px] text-slate-400">Configure your workspace</div></div><Settings2 size={18} className="text-slate-400"/></div>
    <div className="mt-5 space-y-4">
      {[["Inventory management","Track stock and product movements",true],["Purchasing","Manage supplier purchases",true],["Delivery","Track outgoing deliveries",true],["Customer credit","Allow customer outstanding balances",false],["Accounting","Enable financial statements",true]].map(([a,b,on])=><div key={String(a)} className="flex items-center justify-between gap-3"><div><div className="text-[11px] font-medium text-slate-800">{String(a)}</div><div className="mt-0.5 text-[9px] text-slate-400">{String(b)}</div></div><span className={`relative h-5 w-9 rounded-full ${on?"bg-blue-700":"bg-slate-200"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${on?"left-[18px]":"left-0.5"}`}/></span></div>)}
    </div>
    <div className="mt-5 rounded-lg bg-slate-50 p-3.5"><div className="text-[10px] font-semibold text-slate-700">Inventory costing method</div><div className="mt-2 grid grid-cols-2 gap-2"><div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-semibold text-blue-800">Weighted Average <Check size={12} className="inline ml-1"/></div><div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[10px] text-slate-500">FIFO</div></div><div className="mt-2 text-[8px] text-slate-400">Illustrative configuration preview</div></div>
  </div>
}

export default function Home() {
  const [language, setLanguage] = useState<"ID" | "EN">("ID")
  const [languageOpen, setLanguageOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeTour, setActiveTour] = useState(0)
  const [tourOpen, setTourOpen] = useState(false)
  const industryTrack = useRef<HTMLDivElement>(null)
  const ActiveTourIcon = tourItems[activeTour].icon

  useEffect(() => {
    const node = industryTrack.current
    if (!node) return
    let frame = 0
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
        node.scrollLeft += event.deltaY
      }
    }
    node.addEventListener("wheel", onWheel, { passive: true })
    return () => { node.removeEventListener("wheel", onWheel); cancelAnimationFrame(frame) }
  }, [])

  return <main className="min-h-screen overflow-hidden bg-white text-slate-950">
    <section className="relative isolate overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[690px] bg-[url('/hero-clouds.svg')] bg-bottom bg-no-repeat [background-size:100%_100%]"/>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[760px] bg-gradient-to-t from-[#82999a]/20 via-[#e5ebea]/20 to-transparent"/>
      <header className="relative z-40 mx-auto flex h-[76px] max-w-[1240px] items-center justify-between border-b border-slate-100/90 px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="CuanApp home"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#173f68]"><Image src="/cuanapp-logo.svg" alt="" width={23} height={23} priority className="h-6 w-6"/></span><span className="text-[19px] font-semibold tracking-[-.045em] text-slate-900">Cuan<span className="text-blue-700">App</span></span></Link>
        <nav className="hidden items-center gap-8 lg:flex">{navItems.map(item=><a key={item.href} href={item.href} className="text-[12px] font-medium text-slate-500 transition hover:text-blue-700">{item.label}</a>)}</nav>
        <div className="hidden items-center gap-2.5 md:flex">
          <div className="relative"><button onClick={()=>setLanguageOpen(!languageOpen)} className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-slate-600 transition hover:bg-slate-50" aria-expanded={languageOpen}><Globe2 size={15}/>{language}<ChevronDown size={12}/></button>{languageOpen&&<div className="absolute right-0 top-11 z-50 w-32 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-xl">{(["ID","EN"] as const).map(lang=><button key={lang} onClick={()=>{setLanguage(lang);setLanguageOpen(false)}} className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50">{lang==="ID"?"Indonesia":"English"}{language===lang&&<Check size={13}/>}</button>)}</div>}</div>
          <Link href="/login" className="rounded-lg px-3.5 py-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50">Masuk</Link>
          <Link href="/register" className="rounded-lg bg-[#326da4] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#245b91]">Daftar <ArrowRight size={13} className="ml-1 inline"/></Link>
        </div>
        <button className="rounded-lg border border-slate-200 p-2 text-slate-700 md:hidden" onClick={()=>setMobileOpen(!mobileOpen)} aria-label="Toggle navigation">{mobileOpen?<X size={18}/>:<Menu size={18}/>}</button>
        {mobileOpen&&<div className="absolute left-4 right-4 top-[66px] z-50 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl md:hidden"><div className="flex flex-col gap-1">{navItems.map(item=><a key={item.href} href={item.href} onClick={()=>setMobileOpen(false)} className="rounded-lg px-3 py-3 text-sm text-slate-600 hover:bg-slate-50">{item.label}</a>)}<div className="my-2 h-px bg-slate-100"/><div className="flex gap-2"><Link href="/login" className="flex-1 rounded-lg border border-slate-200 py-2.5 text-center text-sm">Masuk</Link><Link href="/register" className="flex-1 rounded-lg bg-blue-700 py-2.5 text-center text-sm font-semibold text-white">Daftar</Link></div></div></div>}
      </header>

      <div className="mx-auto grid max-w-[1120px] items-center gap-8 px-5 pb-10 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.05fr_.95fr] lg:gap-16 lg:pb-14 lg:pt-20">
        <div className="max-w-[620px]">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/80 px-3.5 py-2 text-[9px] font-semibold uppercase tracking-[.18em] text-blue-800"><Sparkles size={12}/> One platform. Every business.</div>
          <h1 className="text-[clamp(3rem,6.3vw,5.6rem)] font-semibold leading-[.99] tracking-[-.075em] text-slate-950">Run Your<br/><span className="text-[#3976aa]">Business. Your Way.</span></h1>
          <div className="mt-7 flex flex-wrap items-center gap-3"><Link href="/register" className="group inline-flex items-center gap-3 rounded-lg bg-[#326da4] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_-16px_rgba(25,73,120,.55)] transition hover:-translate-y-0.5 hover:bg-[#245b91]">Get Started <ArrowRight size={15} className="transition group-hover:translate-x-1"/></Link><a href="#product-tour" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white/80 px-5 py-3.5 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:text-blue-700"><Play size={13}/> See More</a></div>
        </div>
        <div className="max-w-[460px] lg:justify-self-end"><p className="text-[15px] leading-8 text-slate-600 sm:text-base">Kelola, pahami, dan kembangkan bisnis Anda melalui satu platform terintegrasi. Fleksibel untuk berbagai jenis usaha, dirancang untuk mengikuti pertumbuhan bisnis Anda.</p><div className="mt-6 flex items-center gap-3 text-[10px] font-medium text-slate-400"><span className="h-px w-8 bg-blue-300"/><span>Operational clarity. Financial visibility.</span></div></div>
      </div>

      <div className="mx-auto max-w-[1240px] px-5 pb-8 sm:px-8">
        <div className="mb-5 flex items-center justify-center gap-3 text-[9px] font-semibold uppercase tracking-[.2em] text-slate-500"><span className="h-px w-8 bg-slate-300"/> A connected view of your business <span className="h-px w-8 bg-slate-300"/></div>
        <DashboardPreview/>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-[9px] font-medium text-slate-500"><span className="inline-flex items-center gap-1.5"><ShieldCheck size={12} className="text-emerald-600"/> Business dashboard</span><span className="inline-flex items-center gap-1.5"><Workflow size={12} className="text-blue-600"/> Connected transaction flows</span><span className="inline-flex items-center gap-1.5"><BookOpen size={12} className="text-blue-600"/> Financial records</span></div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-b from-transparent to-white/80"/>
    </section>

    <section id="industries" className="relative border-t border-slate-100 bg-white px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-[1240px]">
        <SectionHeading eyebrow="One platform, every business" title="Every Business Is Different. CuanApp Is Built for All." description="Setiap bisnis memiliki cara kerja yang unik. CuanApp dibangun dengan arsitektur fleksibel yang siap mendukung ekspansi operasional usaha apa pun di masa depan."/>
        <p className="mx-auto mt-5 max-w-[760px] text-center text-xs leading-7 text-slate-500 sm:text-sm">Dari perdagangan, jasa profesional, hingga bisnis berbasis penyewaan dan layanan, CuanApp dirancang untuk beradaptasi dengan kebutuhan operasional yang beragam.</p>
        <div className="mt-14 flex items-center justify-between"><div className="text-[10px] font-semibold uppercase tracking-[.18em] text-slate-400">Business ecosystem · 12 business groups</div><div className="flex gap-2"><button onClick={()=>industryTrack.current?.scrollBy({left:-360,behavior:"smooth"})} aria-label="Scroll industries left" className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-blue-300 hover:text-blue-700"><ArrowLeft size={15}/></button><button onClick={()=>industryTrack.current?.scrollBy({left:360,behavior:"smooth"})} aria-label="Scroll industries right" className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-blue-300 hover:text-blue-700"><ArrowRight size={15}/></button></div></div>
        <div ref={industryTrack} className="mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-5 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">{industries.map((group,index)=>{const Icon=group.icon;return <article key={index} className="group min-w-[230px] max-w-[230px] snap-start border border-slate-100 bg-[#fbfcfe] p-5 transition duration-300 hover:-translate-y-1 hover:border-blue-100 hover:bg-white hover:shadow-[0_18px_45px_-30px_rgba(20,55,95,.3)] sm:min-w-[250px] sm:max-w-[250px]"><div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition group-hover:bg-blue-700 group-hover:text-white"><Icon size={20}/></div><ul className="space-y-2.5">{group.items.map(item=><li key={item} className="border-b border-slate-100 pb-2.5 text-[11px] leading-5 text-slate-600 last:border-0 last:pb-0">{item}</li>)}</ul></article>})}</div>
        <div className="mt-5 flex justify-center"><a href="#solutions" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700">Explore All Industries <ArrowRight size={14}/></a></div>
      </div>
    </section>

    <section id="solutions" className="bg-[#f7f9fc] px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-[1240px]"><SectionHeading eyebrow="A complete business ecosystem" title="Everything Your Business Needs. All in One Place." description="CuanApp menghubungkan setiap bagian bisnis ke dalam satu sistem terintegrasi. Dari aktivitas operasional sehari-hari hingga laporan keuangan, semuanya bekerja bersama untuk memberikan kendali dan visibilitas yang lebih baik."/>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {[
            [Workflow,"01","Unified Business Operations","Kelola pembelian, penjualan, persediaan, dan pengiriman melalui satu sistem yang saling terhubung. Sederhanakan operasional tanpa kehilangan kendali atas setiap transaksi."],
            [Landmark,"02","Complete Financial Visibility","Pantau arus kas, utang, piutang, biaya, dan profitabilitas melalui pencatatan serta laporan keuangan yang terintegrasi."],
            [ChartNoAxesCombined,"03","Smarter Business Decisions","Ubah data transaksi menjadi informasi yang bermakna. Pahami performa bisnis dan gunakan informasi tersebut untuk menentukan langkah selanjutnya."]
          ].map(([Icon,no,title,desc])=>{const I=Icon as typeof Workflow;return <article key={String(no)} className="relative overflow-hidden border border-slate-200/80 bg-white p-7 shadow-[0_16px_45px_-35px_rgba(15,35,70,.35)] transition hover:-translate-y-1 hover:shadow-[0_24px_55px_-34px_rgba(15,35,70,.3)] sm:p-8"><div className="flex items-center justify-between"><span className="text-[10px] font-semibold tracking-[.18em] text-blue-700">{String(no)}</span><I size={21} className="text-blue-700"/></div><h3 className="mt-10 text-xl font-semibold tracking-[-.04em] text-slate-900">{String(title)}</h3><p className="mt-4 text-xs leading-7 text-slate-500 sm:text-[13px]">{String(desc)}</p><div className="mt-8 h-px w-full bg-gradient-to-r from-blue-200 to-transparent"/></article>})}
        </div>
        <div className="mt-9 text-center"><a href="#flexibility" className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 hover:text-blue-900">Discover Our Solutions <ArrowRight size={14}/></a></div>
      </div>
    </section>

    <section id="flexibility" className="bg-white px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto grid max-w-[1240px] items-center gap-14 lg:grid-cols-[1fr_.95fr]">
        <div><div className="text-[10px] font-semibold uppercase tracking-[.2em] text-blue-700">Flexibility is our foundation</div><h2 className="mt-4 max-w-[600px] text-3xl font-semibold leading-tight tracking-[-.055em] text-slate-950 sm:text-4xl lg:text-[48px]">Your Business. Your Rules. Your System.</h2><p className="mt-5 max-w-[590px] text-sm leading-8 text-slate-500">Tidak ada dua bisnis yang beroperasi dengan cara yang benar-benar sama. Karena itu, CuanApp memberikan fleksibilitas untuk menyesuaikan sistem berdasarkan kebutuhan operasional masing-masing usaha.</p><p className="mt-3 max-w-[590px] text-sm leading-8 text-slate-500">Aktifkan fitur yang dibutuhkan, nonaktifkan yang tidak relevan, dan sesuaikan konfigurasi bisnis melalui Settings.</p>
          <div className="mt-9 grid gap-x-8 gap-y-7 sm:grid-cols-2">
            {[
              [SlidersHorizontal,"Flexible Feature Management","Aktifkan dan nonaktifkan modul Inventory, Purchasing, Sales, Delivery, Customer Credit, Supplier Credit, dan Accounting."],
              [Calculator,"Customizable Business Logic","Sesuaikan aturan bisnis dan metode penilaian persediaan seperti FIFO dan Weighted Average."],
              [Workflow,"Configurable Workflows","Atur bagaimana proses pembelian, penjualan, pembayaran, persediaan, dan aktivitas operasional berjalan."],
              [ChartNoAxesCombined,"Designed to Expand","Mulai dengan fitur yang diperlukan hari ini dan kembangkan konfigurasi seiring kebutuhan bisnis."]
            ].map(([Icon,title,desc])=>{const I=Icon as typeof SlidersHorizontal;return <div key={String(title)} className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><I size={17}/></span><div><h3 className="text-xs font-semibold text-slate-900">{String(title)}</h3><p className="mt-2 text-[11px] leading-6 text-slate-500">{String(desc)}</p></div></div>})}
          </div>
          <a href="#product-tour" className="mt-9 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-3 text-xs font-semibold text-white transition hover:bg-blue-800">Explore Customization <ArrowRight size={14}/></a>
        </div>
        <SettingsPreview/>
      </div>
    </section>

    <section id="product-tour" className="bg-[#f7f9fc] px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-[1240px]"><SectionHeading eyebrow="Take a closer look" title="See How CuanApp Works." description="Jelajahi bagaimana CuanApp membantu menghubungkan setiap aktivitas bisnis dalam satu pengalaman yang sederhana dan intuitif. Lihat area aplikasi, pahami alur kerja, dan temukan bagaimana sistem dapat beradaptasi dengan kebutuhan usaha Anda."/>
        <div className="mt-14 grid gap-8 lg:grid-cols-[.72fr_1.28fr] lg:items-center">
          <div className="space-y-1.5">{tourItems.map((item,index)=>{const Icon=item.icon;return <button key={item.label} onClick={()=>setActiveTour(index)} className={`flex w-full items-center gap-3 border px-4 py-3.5 text-left transition ${activeTour===index?"border-blue-100 bg-white text-blue-800 shadow-[0_12px_35px_-24px_rgba(15,42,90,.3)]":"border-transparent text-slate-500 hover:bg-white hover:text-slate-800"}`}><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${activeTour===index?"bg-blue-700 text-white":"bg-slate-100 text-slate-500"}`}><Icon size={16}/></span><span className="flex-1 text-xs font-semibold sm:text-sm">{item.label}</span><ArrowRight size={14} className={activeTour===index?"opacity-100":"opacity-0"}/></button>})}</div>
          <div className="relative overflow-hidden border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-45px_rgba(15,38,80,.35)] sm:p-8">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-100/70 blur-3xl"/>
            <div className="relative"><div className="flex items-center justify-between"><span className="rounded-full bg-blue-50 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[.15em] text-blue-700">Interactive product demonstration</span><span className="text-[10px] text-slate-400">0{activeTour+1} / 06</span></div><div className="mt-8 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-700 text-white shadow-lg shadow-blue-700/20"><ActiveTourIcon size={24}/></div><h3 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">{tourItems[activeTour].label}</h3><p className="mt-3 max-w-lg text-sm leading-7 text-slate-500">{tourItems[activeTour].detail}</p><div className="mt-8 flex items-center gap-2">{tourItems.map((item,index)=><button key={item.label} onClick={()=>setActiveTour(index)} aria-label={`Show ${item.label}`} className={`h-1.5 rounded-full transition-all ${activeTour===index?"w-9 bg-blue-700":"w-3 bg-slate-200 hover:bg-blue-300"}`}/>)}</div><button onClick={()=>setTourOpen(true)} className="mt-8 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-xs font-semibold text-white transition hover:bg-blue-800">Take a Product Tour <Play size={13}/></button></div>
          </div>
        </div>
      </div>
    </section>

    <section className="bg-[#0b2344] px-5 py-20 text-white sm:px-8 sm:py-28"><div className="mx-auto flex max-w-[1040px] flex-col items-center text-center"><div className="text-[10px] font-semibold uppercase tracking-[.22em] text-blue-200">Ready to grow with clarity?</div><h2 className="mt-4 max-w-[760px] text-3xl font-semibold leading-tight tracking-[-.055em] sm:text-5xl">Ready to Take Control of Your Business?</h2><p className="mt-5 max-w-[600px] text-sm leading-7 text-blue-100/70">Bisnis Anda memiliki potensi untuk berkembang. Saatnya mengelolanya dengan sistem yang mampu berkembang bersama Anda.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/register" className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3.5 text-xs font-semibold text-[#0b2344] transition hover:-translate-y-0.5">Get Started <ArrowRight size={14}/></Link><a href="#product-tour" className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-5 py-3.5 text-xs font-semibold text-white transition hover:bg-white/10">Explore CuanApp <Play size={13}/></a></div></div></section>

    <footer className="border-t border-slate-200 bg-white px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-4 sm:flex-row"><Link href="/" className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#173f68]"><Image src="/cuanapp-logo.svg" alt="" width={18} height={18}/></span><span className="text-sm font-semibold text-slate-800">CuanApp</span></Link><span className="text-[10px] text-slate-400">© {new Date().getFullYear()} CuanApp. Built to grow with your business.</span><div className="flex gap-5 text-[10px] text-slate-500"><Link href="/login" className="hover:text-blue-700">Masuk</Link><Link href="/register" className="hover:text-blue-700">Daftar</Link></div></div></footer>

    {tourOpen&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="CuanApp product tour"><div className="relative w-full max-w-3xl overflow-hidden bg-[#0b2344] p-5 text-white shadow-2xl sm:p-9"><button onClick={()=>setTourOpen(false)} className="absolute right-4 top-4 rounded-full border border-white/15 p-2 text-white/70 hover:bg-white/10" aria-label="Close product tour"><X size={17}/></button><div className="flex aspect-video flex-col items-center justify-center border border-white/10 bg-gradient-to-br from-blue-500/20 via-[#12345e] to-[#06152d] text-center"><span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-white/10"><Play size={22} fill="currentColor"/></span><div className="mt-5 text-lg font-semibold">CuanApp Product Tour</div><p className="mt-2 max-w-md px-4 text-xs leading-6 text-blue-100/65">Interactive preview placeholder. This space is ready for the official product walkthrough video or guided application demo.</p></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><span className="text-[10px] text-blue-100/60">Dashboard · Transactions · Inventory · Finance · Reports</span><button onClick={()=>setTourOpen(false)} className="rounded-lg bg-white px-4 py-2.5 text-xs font-semibold text-blue-950">Close preview</button></div></div></div>}
  </main>
}
