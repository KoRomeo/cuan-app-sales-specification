import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        aria-hidden="true"
        className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-sidebar-primary to-[oklch(0.45_0.2_268)] shadow-[0_0_0_1px_oklch(1_0_0/0.12)_inset]"
      >
        <svg viewBox="0 0 24 24" className="size-4.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 16l5-5 4 4 7-8" />
          <path d="M15 7h5v5" />
        </svg>
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-sm font-semibold tracking-[0.18em] text-sidebar-foreground">CUANAPP</span>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-sidebar-muted">Sales</span>
      </div>
    </div>
  )
}
