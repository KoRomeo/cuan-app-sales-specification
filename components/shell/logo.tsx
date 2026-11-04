import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        aria-hidden="true"
        className="flex size-8 items-center justify-center rounded-lg bg-transparent shadow-none"
      >
        <img src="/cuanapp-logo.svg" alt="CuanApp" className="size-full object-contain" />
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-sm font-semibold tracking-[0.18em] text-sidebar-foreground">CUANAPP</span>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-sidebar-muted">Sales</span>
      </div>
    </div>
  )
}
