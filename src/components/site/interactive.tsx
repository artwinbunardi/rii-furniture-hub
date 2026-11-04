"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, Plus, Check, Loader2, Minus, CalendarDays } from "lucide-react";
import { addToCartAction, toggleFavoriteAction, setDatesAction } from "@/app/(site)/actions";
import { useEditor } from "./editable";

export function AddToCartButton({ productId, disabled, label, compact, qty = 1, max }: { productId: string; disabled?: boolean; label: string; compact?: boolean; qty?: number; max?: number }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const ed = useEditor();
  return (
    <div className={compact ? "flex-1" : ""}>
      <button
        type="button"
        data-testid="add-to-cart"
        disabled={disabled || pending || (max !== undefined && qty > max)}
        className={`s-btn ${compact ? "s-btn-sm w-full" : "w-full"}`}
        onClick={() => {
          if (ed) return;
          setErr(null);
          start(async () => {
            const r = await addToCartAction(productId, qty);
            if (r?.error) setErr(r.error);
            else { setDone(true); router.refresh(); setTimeout(() => setDone(false), 1800); }
          });
        }}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {label}
      </button>
      {err && <p className="mt-1 text-[12px] text-red-600">{err}</p>}
    </div>
  );
}

export function QtyAddToCart({ productId, label, max, disabled }: { productId: string; label: string; max: number; disabled?: boolean }) {
  const [qty, setQty] = useState(1);
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="inline-flex h-[44px] items-center rounded-[var(--btn-radius)] border" style={{ borderColor: "var(--c-border)" }}>
        <button type="button" aria-label="-" className="px-3" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="h-4 w-4" /></button>
        <input aria-label="Quantity" data-testid="qty-input" type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} className="w-14 bg-transparent text-center outline-none" />
        <button type="button" aria-label="+" className="px-3" onClick={() => setQty(qty + 1)}><Plus className="h-4 w-4" /></button>
      </div>
      <div className="flex-1"><AddToCartButton productId={productId} qty={qty} label={label} disabled={disabled} max={max} /></div>
      {qty > max && <p className="text-[12px] text-red-600 sm:self-center">Max {max}</p>}
    </div>
  );
}

export function FavoriteButton({ productId, initial, disabled }: { productId: string; initial: boolean; disabled?: boolean }) {
  const [fav, setFav] = useState(initial);
  const [pending, start] = useTransition();
  if (disabled) return null;
  return (
    <button
      type="button"
      aria-pressed={fav}
      aria-label="Favorite"
      className="rounded-full p-1.5 transition hover:scale-110"
      onClick={() => start(async () => { setFav(!fav); const r = await toggleFavoriteAction(productId); if (r?.error) setFav(fav); })}
      disabled={pending}
    >
      <Heart className="h-[18px] w-[18px]" fill={fav ? "#e11d48" : "none"} color={fav ? "#e11d48" : "currentColor"} />
    </button>
  );
}

export function DateRangeBar({ from, to, explicit, labels, compact, stacked }: { from: string; to: string; explicit: boolean; labels: { loading: string; ret: string; apply: string; hint: string }; compact?: boolean; stacked?: boolean }) {
  const [f, setF] = useState(explicit ? from : "");
  const [t, setT] = useState(explicit ? to : "");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const ed = useEditor();
  return (
    <div className={`flex flex-col gap-2 ${compact ? "" : "rounded-[var(--radius)] border p-3 sm:p-4"}`} style={{ borderColor: "var(--c-border)", background: compact ? undefined : "var(--c-bg)" }}>
      <div className={`flex flex-col gap-2 ${stacked ? "" : "sm:flex-row sm:items-end"}`}>
        <label className="min-w-0 flex-1 text-[12px]"><span className="s-muted mb-1 flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{labels.loading}</span>
          <input type="date" data-testid="date-from" className="s-input" value={f} onChange={(e) => { setF(e.target.value); if (!t || t < e.target.value) setT(e.target.value); }} /></label>
        <label className="min-w-0 flex-1 text-[12px]"><span className="s-muted mb-1 flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{labels.ret}</span>
          <input type="date" data-testid="date-to" className="s-input" value={t} min={f || undefined} onChange={(e) => setT(e.target.value)} /></label>
        <button type="button" className="s-btn" data-testid="apply-dates" disabled={pending || !f || !t}
          onClick={() => { if (ed) return; setErr(null); start(async () => { const r = await setDatesAction(f, t); if (r?.error) setErr(r.error); else router.refresh(); }); }}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}{labels.apply}
        </button>
      </div>
      {err ? <p className="text-[12px] text-red-600">{err}</p> : !explicit && <p className="s-muted text-[12px]">{labels.hint}</p>}
    </div>
  );
}
