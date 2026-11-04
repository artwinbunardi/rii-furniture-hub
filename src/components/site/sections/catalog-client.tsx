"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, X, ZoomIn, ListPlus, Loader2 } from "lucide-react";
import { addToWishlistAction } from "@/app/(site)/actions";
import { tr, type Lang } from "@/lib/i18n/dict";

export function AutoSubmitSelect({ name, defaultValue, options }: { name: string; defaultValue: string; options: [string, string][] }) {
  return (
    <select name={name} defaultValue={defaultValue} className="s-input w-auto py-1.5" onChange={(e) => e.currentTarget.form?.requestSubmit()}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

export function Gallery({ images, name, layout }: { images: { id: string; url: string; alt: string | null }[]; name: string; layout: "thumbs" | "grid" | "row" }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const [scaled, setScaled] = useState(false);
  if (!images.length) return <div className="aspect-[4/3] s-rounded" style={{ background: "var(--c-surface)" }} />;
  const open = (k: number) => { setI(k); setZoom(true); setScaled(false); };
  const lightbox = zoom && (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4" role="dialog" aria-label={name} onClick={() => setZoom(false)}>
      <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white" aria-label="Close"><X className="h-6 w-6" /></button>
      {images.length > 1 && <button className="absolute left-4 rounded-full bg-white/10 p-2 text-white" aria-label="Previous" onClick={(e) => { e.stopPropagation(); setI((i - 1 + images.length) % images.length); setScaled(false); }}><ChevronLeft className="h-6 w-6" /></button>}
      <div className="max-h-[88vh] max-w-[92vw] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <img src={images[i].url} alt={images[i].alt ?? name}
          onClick={() => setScaled(!scaled)}
          onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`); }}
          className="max-h-[88vh] w-auto transition-transform duration-200"
          style={{ transform: scaled ? "scale(2.2)" : "scale(1)", transformOrigin: origin, cursor: scaled ? "zoom-out" : "zoom-in" }} />
      </div>
      {images.length > 1 && <button className="absolute right-4 rounded-full bg-white/10 p-2 text-white" aria-label="Next" onClick={(e) => { e.stopPropagation(); setI((i + 1) % images.length); setScaled(false); }}><ChevronRight className="h-6 w-6" /></button>}
    </div>
  );
  if (layout === "grid")
    return (
      <div className="grid grid-cols-2 gap-3">
        {images.map((im, k) => <button key={im.id} onClick={() => open(k)} className={`overflow-hidden s-rounded ${k === 0 ? "col-span-2" : ""}`}><img src={im.url} alt={im.alt ?? name} className="aspect-[4/3] w-full object-cover transition hover:scale-[1.02]" /></button>)}
        {lightbox}
      </div>
    );
  if (layout === "row")
    return (
      <div className="flex snap-x gap-3 overflow-x-auto">
        {images.map((im, k) => <button key={im.id} onClick={() => open(k)} className="w-[85%] shrink-0 snap-start overflow-hidden s-rounded md:w-[48%]"><img src={im.url} alt={im.alt ?? name} className="aspect-[4/3] w-full object-cover" /></button>)}
        {lightbox}
      </div>
    );
  return (
    <div>
      <button className="group relative block w-full overflow-hidden s-rounded" onClick={() => open(i)} aria-label="Zoom">
        <img src={images[i].url} alt={images[i].alt ?? name} className="aspect-[4/3] w-full object-cover" data-testid="gallery-main" />
        <span className="absolute bottom-3 right-3 rounded-full bg-white/90 p-2 text-zinc-800 opacity-0 shadow transition group-hover:opacity-100"><ZoomIn className="h-4 w-4" /></span>
      </button>
      <div className="mt-3 grid grid-cols-5 gap-3">
        {images.map((im, k) => (
          <button key={im.id} onClick={() => setI(k)} className="overflow-hidden s-rounded" style={{ outline: k === i ? "2px solid var(--c-text)" : "none", outlineOffset: 2 }}>
            <img src={im.url} alt="" className="aspect-square w-full object-cover" />
          </button>
        ))}
      </div>
      {lightbox}
    </div>
  );
}

export function AvailabilityCalendar({ days, lang, selected }: { days: { day: string; usable: number; reserved: number; pending: number; available: number }[]; lang: Lang; selected: [string, string] | null }) {
  const months = new Map<string, typeof days>();
  for (const d of days) {
    const k = d.day.slice(0, 7);
    if (!months.has(k)) months.set(k, []);
    months.get(k)!.push(d);
  }
  const wd = lang === "en" ? ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] : ["Sn", "Sl", "Rb", "Km", "Jm", "Sb", "Mg"];
  return (
    <div>
      <div className="grid gap-6 md:grid-cols-2">
        {[...months.entries()].slice(0, 2).map(([m, list]) => {
          const first = new Date(list[0].day + "T00:00:00Z");
          const offset = (first.getUTCDay() + 6) % 7;
          const label = new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);
          return (
            <div key={m} className="border p-4 s-rounded" style={{ borderColor: "var(--c-border)" }}>
              <p className="mb-3 font-medium capitalize">{label}</p>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
                {wd.map((w) => <span key={w} className="s-muted py-1">{w}</span>)}
                {Array.from({ length: offset }).map((_, i) => <span key={"e" + i} />)}
                {list.map((d) => {
                  const ratio = d.usable ? d.available / d.usable : 0;
                  const bg = d.available === 0 ? "#fde2e2" : ratio <= 0.2 ? "#fdf0d5" : "#e3f4e9";
                  const fg = d.available === 0 ? "#a12a2a" : ratio <= 0.2 ? "#8a5a00" : "#17663a";
                  const sel = selected && d.day >= selected[0] && d.day <= selected[1];
                  return (
                    <div key={d.day} title={`${d.day}: ${d.available}/${d.usable}${d.pending ? ` (+${d.pending} pending)` : ""}`}
                      className="rounded-md py-1.5" style={{ background: bg, color: fg, outline: sel ? "2px solid var(--c-text)" : "none" }}>
                      <div className="font-medium">{Number(d.day.slice(8))}</div>
                      <div className="text-[10px] opacity-80">{d.available}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="s-muted mt-3 flex flex-wrap gap-4 text-[12px]">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded" style={{ background: "#e3f4e9" }} />{lang === "en" ? "Available" : "Tersedia"}</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded" style={{ background: "#fdf0d5" }} />{lang === "en" ? "Limited (≤20%)" : "Terbatas (≤20%)"}</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded" style={{ background: "#fde2e2" }} />{lang === "en" ? "Fully booked" : "Penuh"}</span>
        <span>{lang === "en" ? "Number = units bookable that day (incl. turnaround buffer)." : "Angka = unit yang dapat dipesan hari itu (termasuk buffer perawatan)."}</span>
      </div>
    </div>
  );
}

export function WishlistPicker({ productId, lists, lang }: { productId: string; lists: { id: string; name: string; product_ids: string[] }[]; lang: Lang }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const t = (k: string) => tr(lang, k);
  const add = (id: string | null) => start(async () => {
    const r = await addToWishlistAction(productId, id, name);
    setMsg(r?.error ?? r?.message ?? null);
    if (!r?.error) { setName(""); router.refresh(); }
  });
  return (
    <div>
      <button type="button" onClick={() => setOpen(!open)} className="s-muted inline-flex items-center gap-1.5 text-[13px] hover:underline"><ListPlus className="h-4 w-4" />{t("add_to_wishlist")}</button>
      {open && (
        <div className="mt-2 space-y-2 border p-3 s-rounded" style={{ borderColor: "var(--c-border)" }}>
          {lists.map((l) => (
            <button key={l.id} type="button" disabled={pending || l.product_ids.includes(productId)} onClick={() => add(l.id)} className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[13px] hover:bg-black/5 disabled:opacity-50">
              {l.name}<span className="s-muted">{l.product_ids.includes(productId) ? "✓" : "+"}</span>
            </button>
          ))}
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("new_wishlist")} className="s-input py-1.5" />
            <button type="button" disabled={pending || !name.trim()} onClick={() => add(null)} className="s-btn s-btn-sm">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("add")}</button>
          </div>
          {msg && <p className="text-[12px]">{msg}</p>}
        </div>
      )}
    </div>
  );
}
