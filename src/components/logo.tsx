import { cn } from "@/lib/utils";

export function RiiMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("h-8 w-8", className)} aria-hidden>
      <rect width="48" height="48" rx="12" fill="#1f1f23" />
      <path d="M14 36V12h11a7 7 0 0 1 0 14H14m11 0 9 10" stroke="#e6cf9f" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RiiLogo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <RiiMark />
      <span className="leading-tight">
        <span className={cn("block text-[15px] font-semibold tracking-tight", light ? "text-white" : "text-ink")}>RII Furniture Hub</span>
        <span className={cn("block text-[11px]", light ? "text-white/60" : "text-ink-400")}>Collection & Reservation</span>
      </span>
    </span>
  );
}
