"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowDown, ArrowRight, BarChart3, BookOpen, Check, ChevronDown,
  CircleDollarSign, FileText, Globe2, Landmark, Menu, Play, ShieldCheck,
  ShoppingCart, Sparkles, Users, Wallet, X, Package, TrendingUp,
} from "lucide-react"

const demoItems = [
  { label: "Dashboard", icon: BarChart3, detail: "A clear overview of business performance, cash position, and operational activity." },
  { label: "Roles & permissions", icon: Users, detail: "Give each team member access that matches their responsibilities." },
  { label: "Transaction flow", icon: ShoppingCart, detail: "Follow purchases, orders, deliveries, and payments in connected workflows." },
  { label: "Invoices", icon: FileText, detail: "Keep purchase and sales documents connected to their transactions." },
  { label: "COGS & profit", icon: TrendingUp, detail: "Understand product costs and business profitability from recorded activity." },
  { label: "General Ledger", icon: BookOpen, detail: "Trace financial activity through structured accounting records." },
  { label: "Reconciliation", icon: Landmark, detail: "Review recorded balances against your bank statement." },
]

const navItems = [
  { label: "Solutions", href: "#solutions" },
  { label: "Industries", href: "#industries" },
  { label: "Flexibility", href: "#flexibility" },
  { label: "Product Tour", href: "#product-tour" },
]

function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[1040px]">
      <div className="absolute -inset-5 rounded-[2rem] bg-blue-400/20 blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-white text-slate-800 shadow-[0_35px_100px_-35px_rgba(5,24,66,.55)] ring-1 ring-slate-900/5">
        <div className="flex h-12 items-center justify-between border-b border-slate-100 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-700 text-white"><Wallet size={15} /></span>
            <span className="text-sm font-semibold tracking-tight">CuanApp</span>
            <span className="ml-2 hidden rounded-full bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 sm:inline-flex">Business workspace</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-[11px] text-slate-400 sm:inline">Demo preview</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <div className="h-7 w-7 rounded-full bg-slate-100" />
          </div>
        </div>
        <div className="grid min-h-[330px] grid-cols-[58px_1fr] sm:grid-cols-[174px_1fr]">
          <aside className="border-r border-slate-100 bg-slate-50/80 p-2 sm:p-4">
            <div className="mb-5 hidden text-[10px] font-semibold uppercase tracking-[.16em] text-slate-400 sm:block">Workspace</div>
            {[
              [BarChart3, "Dashboard"],
              [ShoppingCart, "Sales & orders"],
              [Package, "Inventory"],
              [FileText, "Purchasing"],
              [Wallet, "Finance"],
              [BookOpen, "Reports"],
            ].map(([Icon, label], index) => {
              const ItemIcon = Icon as typeof BarChart3
              return <div key={String(label)} className={`mb-1 flex items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-[11px] sm:justify-start ${index === 0 ? "bg-blue-700 font-medium text-white shadow-md shadow-blue-900/15" : "text-slate-500"}`}><ItemIcon size={15} /><span className="hidden sm:inline">{String(label)}</span></div>
            })}
          </aside>
          <main className="min-w-0 bg-[#fbfcff] p-4 sm:p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div><div className="text-[10px] font-medium uppercase tracking-[.15em] text-blue-600">Business overview</div><div className="mt-1 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">Good morning, business owner</div><div className="mt-1 text-[11px] text-slate-400">Here’s what’s happening in your business.</div></div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] text-slate-500">This month⌄</div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              {[
                ["Total sales", "Rp 48.250.000", "+12.8%", "blue"],
                ["Gross profit", "Rp 12.840.000", "+8.2%", "emerald"],
                ["Receivables", "Rp 6.450.000", "Open balance", "amber"],
                ["Inventory value", "Rp 32.600.000", "128 products", "violet"],
              ].map(([label, value, change, tone]) => <div key={label} className="rounded-xl border border-slate-100 bg-white p-3 shadow-[0_4px_14px_-10px_rgba(15,23,42,.25)] sm:p-3.5"><div className="text-[9px] text-slate-400 sm:text-[10px]">{label}</div><div className="mt-2 text-[13px] font-semibold tracking-tight text-slate-800 sm:text-base">{value}</div><div className={`mt-1 text-[9px] ${tone === "emerald" ? "text-emerald-600" : tone === "amber" ? "text-amber-600" : tone === "violet" ? "text-violet-600" : "text-blue-600"}`}>{change}</div></div>)}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1.5fr_1fr]">
              <div className="rounded-xl border border-slate-100 bg-white p-3.5 sm:p-4">
                <div className="flex items-center justify-between"><span className="text-[11px] font-semibold text-slate-700">Sales performance</span><span className="text-[9px] text-slate-400">Last 7 months</span></div>
                <div className="mt-4 flex h-[104px] items-end gap-2 border-b border-slate-100 px-1">
                  {[38, 55, 46, 72, 61, 88, 76, 96, 70, 83, 65, 91].map((h, i) => <div key={i} className="flex-1 rounded-t-[4px] bg-gradient-to-t from-blue-700 to-blue-400" style={{ height: `${h}%`, opacity: i > 8 ? 1 : .72 }} />)}
                </div>
                <div className="mt-2 flex justify-between text-[8px] text-slate-400"><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span></div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-3.5 sm:p-4">
                <div className="text-[11px] font-semibold text-slate-700">Recent activity</div>
                <div className="mt-4 space-y-4">
                  {[
                    ["Purchase recorded", "Supplier invoice · just now", "bg-blue-500"],
                    ["Order delivered", "ORD-2026-0082 · 24 min ago", "bg-emerald-500"],
                    ["Payment received", "BCA · 1 hour ago", "bg-violet-500"],
                  ].map(([title, desc, dot]) => <div key={title} className="flex gap-2.5"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${dot}`} /><div><div className="text-[10px] font-medium text-slate-700">{title}</div><div className="mt-0.5 text-[9px] text-slate-400">{desc}</div></div></div>)}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      <div className="absolute -bottom-5 left-1/2 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-white/70 bg-white/90 px-4 py-2 text-[10px] font-medium text-slate-600 shadow-xl backdrop-blur sm:flex"><ShieldCheck size={13} className="text-emerald-600" /> Connected business operations & financial records</div>
    </div>
  )
}

export default function Home() {
  const [language, setLanguage] = useState<"ID" | "EN">("ID")
  const [languageOpen, setLanguageOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeDemo, setActiveDemo] = useState(0)
  const [tourOpen, setTourOpen] = useState(false)
  const ActiveIcon = demoItems[activeDemo].icon

  return (
    <main className="min-h-screen overflow-hidden bg-[#f8faff] text-slate-950">
      <section className="relative isolate min-h-[760px] overflow-hidden bg-[#071a3d] text-white">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_15%_5%,rgba(60,119,229,.38),transparent_42%),radial-gradient(ellipse_at_90%_18%,rgba(25,92,190,.34),transparent_38%),linear-gradient(135deg,#07152f_0%,#0b2450_48%,#081a39_100%)]" />
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-[.13]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.8) .7px, transparent .7px)", backgroundSize: "22px 22px" }} />
        <div className="pointer-events-none absolute -left-40 top-44 -z-10 h-[420px] w-[420px] rounded-full bg-blue-500/20 blur-[110px]" />
        <div className="pointer-events-none absolute -right-32 top-64 -z-10 h-[460px] w-[460px] rounded-full bg-cyan-400/10 blur-[120px]" />

        <header className="relative z-30 mx-auto flex h-[78px] max-w-[1240px] items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="CuanApp home">
            <Image src="/cuanapp-logo.svg" alt="CuanApp" width={34} height={34} priority className="h-8 w-8 brightness-0 invert" />
            <span className="text-[19px] font-semibold tracking-[-.04em]">Cuan<span className="text-blue-300">App</span></span>
          </Link>
          <nav className="hidden items-center gap-8 lg:flex">
            {navItems.map(item => <a key={item.href} href={item.href} className="text-[12px] font-medium text-blue-100/75 transition hover:text-white">{item.label}</a>)}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <div className="relative">
              <button onClick={() => setLanguageOpen(!languageOpen)} className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-blue-100/85 transition hover:bg-white/10" aria-expanded={languageOpen}><Globe2 size={15} />{language}<ChevronDown size={13} /></button>
              {languageOpen && <div className="absolute right-0 top-11 z-50 w-32 overflow-hidden rounded-xl border border-white/10 bg-[#102b56] p-1 shadow-xl">{(["ID", "EN"] as const).map(lang => <button key={lang} onClick={() => { setLanguage(lang); setLanguageOpen(false) }} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-white/10">{lang === "ID" ? "Indonesia" : "English"}{language === lang && <Check size={13} />}</button>)}</div>}
            </div>
            <Link href="/login" className="rounded-lg px-3.5 py-2.5 text-xs font-medium text-white/85 transition hover:bg-white/10">Masuk</Link>
            <Link href="/register" className="rounded-lg bg-white px-4 py-2.5 text-xs font-semibold text-[#102b56] shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-blue-50">Daftar <ArrowRight size={13} className="ml-1 inline" /></Link>
          </div>
          <button className="rounded-lg border border-white/15 p-2 text-white md:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle navigation">{mobileOpen ? <X size={19} /> : <Menu size={19} />}</button>
          {mobileOpen && <div className="absolute left-4 right-4 top-[68px] z-50 rounded-2xl border border-white/10 bg-[#10264b]/95 p-4 shadow-2xl backdrop-blur-xl md:hidden"><div className="flex flex-col gap-1">{navItems.map(item => <a key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-3 text-sm text-blue-50 hover:bg-white/10">{item.label}</a>)}<div className="my-2 h-px bg-white/10" /><div className="flex gap-2"><Link href="/login" className="flex-1 rounded-lg border border-white/15 py-2.5 text-center text-sm">Masuk</Link><Link href="/register" className="flex-1 rounded-lg bg-white py-2.5 text-center text-sm font-semibold text-blue-950">Daftar</Link></div></div></div>}
        </header>

        <div className="mx-auto grid max-w-[1180px] items-center gap-8 px-5 pb-12 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.08fr_.92fr] lg:gap-16 lg:pb-20 lg:pt-24">
          <div className="max-w-[650px]">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-200/20 bg-blue-200/[.08] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[.17em] text-blue-100/90 shadow-inner shadow-white/5"><Sparkles size={13} className="text-cyan-300" /> One platform. Every business.</div>
            <h1 className="text-[clamp(3.1rem,7vw,6.2rem)] font-semibold leading-[.98] tracking-[-.075em] text-white">Run Your<br /><span className="bg-gradient-to-r from-blue-200 via-cyan-100 to-white bg-clip-text text-transparent">Business. Your Way.</span></h1>
            <div className="mt-8 max-w-[490px] border-l border-blue-300/40 pl-5 text-[15px] leading-7 text-blue-100/75 sm:text-base sm:leading-8">Kelola, pahami, dan kembangkan bisnis Anda melalui satu platform terintegrasi. Fleksibel untuk berbagai jenis usaha, dirancang untuk mengikuti pertumbuhan bisnis Anda.</div>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/register" className="group inline-flex items-center gap-3 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-[#102b56] shadow-[0_12px_35px_-12px_rgba(0,0,0,.55)] transition hover:-translate-y-1 hover:shadow-xl">Get Started <ArrowRight size={16} className="transition group-hover:translate-x-1" /></Link>
              <a href="#product-tour" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[.06] px-5 py-3.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/12"><Play size={14} /> See More</a>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-[10px] font-medium tracking-wide text-blue-100/55"><span className="inline-flex items-center gap-2"><Check size={13} className="text-cyan-300" /> Connected operations</span><span className="inline-flex items-center gap-2"><Check size={13} className="text-cyan-300" /> Financial visibility</span><span className="inline-flex items-center gap-2"><Check size={13} className="text-cyan-300" /> Flexible by design</span></div>
          </div>
          <div className="relative mx-auto flex w-full max-w-[470px] items-center justify-center lg:max-w-none">
            <div className="absolute h-[330px] w-[330px] rounded-full border border-blue-200/10 sm:h-[420px] sm:w-[420px]" />
            <div className="absolute h-[260px] w-[260px] rounded-full border border-blue-200/[.08] sm:h-[340px] sm:w-[340px]" />
            <div className="relative w-full max-w-[430px] rounded-[28px] border border-white/15 bg-gradient-to-br from-white/[.16] to-white/[.035] p-3 shadow-[0_30px_90px_-35px_rgba(0,0,0,.7)] backdrop-blur-xl sm:p-4">
              <div className="rounded-[19px] border border-white/10 bg-[#0b1d3b]/90 p-4 sm:p-5">
                <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/20 text-blue-200"><BarChart3 size={16} /></span><div><div className="text-xs font-semibold">Business snapshot</div><div className="text-[9px] text-blue-100/45">Your connected workspace</div></div></div><span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-[9px] text-emerald-200">Overview</span></div>
                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-white/[.08] bg-white/[.055] p-3"><div className="text-[9px] text-blue-100/50">Sales overview</div><div className="mt-2 text-xl font-semibold tracking-tight">Rp 48,2M</div><div className="mt-1 text-[9px] text-emerald-300">↗ Business activity</div></div>
                  <div className="rounded-xl border border-white/[.08] bg-white/[.055] p-3"><div className="text-[9px] text-blue-100/50">Gross profit</div><div className="mt-2 text-xl font-semibold tracking-tight">Rp 12,8M</div><div className="mt-1 text-[9px] text-cyan-200">Financial insight</div></div>
                </div>
                <div className="mt-3 rounded-xl border border-white/[.08] bg-white/[.045] p-3.5">
                  <div className="flex items-center justify-between"><span className="text-[10px] font-medium text-blue-50/80">Business performance</span><span className="text-[9px] text-blue-100/40">Overview</span></div>
                  <div className="mt-4 flex h-[100px] items-end gap-2">{[35,52,44,68,58,82,70,94,75,88,67,96].map((h,i)=><div key={i} className="flex-1 rounded-t-sm bg-gradient-to-t from-blue-600 to-cyan-300/90" style={{height:`${h}%`,opacity:.45+i*.045}} />)}</div>
                  <div className="mt-2 flex justify-between text-[8px] text-blue-100/35"><span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Nov</span></div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">{[[ShoppingCart,"Orders","Connected"],[Package,"Inventory","Tracked"],[CircleDollarSign,"Finance","Recorded"]].map(([Icon,label,sub])=>{const SmallIcon=Icon as typeof ShoppingCart;return <div key={String(label)} className="rounded-xl border border-white/[.08] bg-white/[.045] p-2.5"><SmallIcon size={14} className="text-cyan-200"/><div className="mt-2 text-[9px] font-medium">{String(label)}</div><div className="mt-0.5 text-[8px] text-blue-100/40">{String(sub)}</div></div>})}</div>
              </div>
            </div>
            <div className="absolute -right-1 top-8 hidden rounded-xl border border-white/15 bg-[#122e58]/90 px-3 py-2.5 shadow-xl backdrop-blur sm:block"><div className="flex items-center gap-2 text-[10px] text-blue-50"><ShieldCheck size={14} className="text-emerald-300"/> One connected system</div></div>
            <div className="absolute -bottom-5 -left-3 hidden rounded-xl border border-white/15 bg-[#122e58]/90 px-3 py-2.5 shadow-xl backdrop-blur sm:block"><div className="flex items-center gap-2 text-[10px] text-blue-50"><Sparkles size={14} className="text-cyan-200"/> Flexible business setup</div></div>
          </div>
        </div>

        <div className="mx-auto max-w-[1180px] px-5 pb-0 sm:px-8">
          <div className="flex items-center justify-center gap-2 pb-7 text-[10px] font-medium uppercase tracking-[.2em] text-blue-100/45"><span className="h-px w-8 bg-blue-200/25" /> A clearer way to run your business <span className="h-px w-8 bg-blue-200/25" /></div>
          <div className="relative translate-y-7 sm:translate-y-10"><DashboardPreview /></div>
        </div>
      </section>

      <section id="product-tour" className="relative bg-[#f8faff] px-5 pb-24 pt-28 sm:px-8 sm:pb-32 sm:pt-36">
        <div className="mx-auto max-w-[1180px]">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-[10px] font-semibold uppercase tracking-[.2em] text-blue-700">Take a closer look</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-.05em] text-slate-950 sm:text-5xl">See how CuanApp works.</h2>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">Dari dashboard hingga pencatatan keuangan, lihat bagaimana aktivitas bisnis dapat terhubung dalam satu alur kerja.</p>
          </div>
          <div className="mt-12 grid gap-8 lg:grid-cols-[.72fr_1.28fr] lg:items-center">
            <div className="space-y-2">
              {demoItems.map((item,index)=>{const Icon=item.icon;return <button key={item.label} onClick={()=>setActiveDemo(index)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left transition ${activeDemo===index?"bg-white text-blue-800 shadow-[0_12px_35px_-22px_rgba(15,42,90,.35)] ring-1 ring-blue-100":"text-slate-500 hover:bg-white/75 hover:text-slate-800"}`}><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${activeDemo===index?"bg-blue-700 text-white":"bg-slate-100 text-slate-500"}`}><Icon size={17}/></span><span className="flex-1 text-xs font-semibold sm:text-sm">{item.label}</span><ArrowRight size={15} className={activeDemo===index?"opacity-100":"opacity-0"}/></button>})}
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_30px_80px_-45px_rgba(15,38,80,.3)] sm:p-8">
              <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-100/70 blur-3xl"/>
              <div className="relative">
                <div className="flex items-center justify-between"><span className="rounded-full bg-blue-50 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[.15em] text-blue-700">Product capability</span><span className="text-[10px] text-slate-400">0{activeDemo+1} / 07</span></div>
                <div className="mt-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-lg shadow-blue-700/20"><ActiveIcon size={25}/></div>
                <h3 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">{demoItems[activeDemo].label}</h3>
                <p className="mt-3 max-w-lg text-sm leading-7 text-slate-500">{demoItems[activeDemo].detail}</p>
                <div className="mt-8 flex items-center gap-2">{demoItems.map((item,index)=><button key={item.label} onClick={()=>setActiveDemo(index)} aria-label={`Show ${item.label}`} className={`h-1.5 rounded-full transition-all ${activeDemo===index?"w-9 bg-blue-700":"w-3 bg-slate-200 hover:bg-blue-300"}`}/>)}</div>
                <button onClick={()=>setTourOpen(true)} className="mt-8 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-xs font-semibold text-white transition hover:bg-blue-800">Play product overview <Play size={13}/></button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {tourOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Product overview"><div className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-[#081a39] p-6 text-white shadow-2xl sm:p-10"><button onClick={()=>setTourOpen(false)} className="absolute right-4 top-4 rounded-full border border-white/15 p-2 text-white/70 hover:bg-white/10" aria-label="Close overview"><X size={18}/></button><div className="flex aspect-video flex-col items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-blue-500/20 via-[#0d2b58] to-[#06132b] text-center"><span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-white/10"><Play size={24} fill="currentColor"/></span><div className="mt-5 text-lg font-semibold">CuanApp product overview</div><p className="mt-2 max-w-md text-xs leading-6 text-blue-100/65">Video demonstration placeholder. Connect your official product walkthrough video here when it is ready.</p></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-blue-100/60">Dashboard · Transactions · Inventory · Finance</span><button onClick={()=>setTourOpen(false)} className="rounded-lg bg-white px-4 py-2.5 text-xs font-semibold text-blue-950">Close preview</button></div></div></div>}
    </main>
  )
}
