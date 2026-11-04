import type { ProductCard as P } from "@/lib/services/catalog";
import { tr, type Lang } from "@/lib/i18n/dict";
import { SLink } from "./link";
import { AddToCartButton, FavoriteButton } from "./interactive";

export function AvailabilityPill({ p, lang }: { p: Pick<P, "available" | "usable">; lang: Lang }) {
  const low = p.usable > 0 && p.available / p.usable <= 0.2;
  const cls = p.available === 0 ? "s-avail-none" : low ? "s-avail-low" : "s-avail-ok";
  const label = p.available === 0 ? tr(lang, "sold_out") : `${p.available} ${tr(lang, "available").toLowerCase()}`;
  return <span className={`s-pill ${cls}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{label}</span>;
}

export function ProductCard({ p, lang, canReserve, editor, compact }: { p: P; lang: Lang; canReserve: boolean; editor?: boolean; compact?: boolean }) {
  const cat = lang === "en" ? p.category_name_en : p.category_name_id;
  return (
    <div className="s-card group" data-testid="product-card">
      <SLink href={`/products/${p.slug}`} className="block overflow-hidden">
        {p.image ? <img src={p.image} alt={p.image_alt ?? p.name} loading="lazy" className="s-card-img transition duration-500 group-hover:scale-[1.03]" /> : <div className="s-card-img" />}
      </SLink>
      <div className="s-card-body">
        <div className="flex items-center justify-between gap-2">
          <span className="s-muted text-[11.5px] uppercase tracking-[.12em]">{cat}</span>
          <span className="s-muted font-mono text-[11px]">{p.sku}</span>
        </div>
        <SLink href={`/products/${p.slug}`} className="s-heading text-[16px] leading-snug" style={{ letterSpacing: 0, textTransform: "none" }}>{p.name}</SLink>
        <div className="flex items-center justify-between gap-2"><AvailabilityPill p={p} lang={lang} /><FavoriteButton productId={p.id} initial={!!p.is_favorite} disabled={editor || !canReserve} /></div>
        {!compact && (
          <div className="s-card-actions mt-auto flex flex-col gap-2 pt-2">
            <SLink href={`/products/${p.slug}`} className="s-btn s-btn-ghost s-btn-sm w-full">{tr(lang, "view_details")}</SLink>
            {canReserve && <AddToCartButton productId={p.id} disabled={editor || p.available === 0} label={tr(lang, "add_to_reservation")} compact />}
          </div>
        )}
      </div>
    </div>
  );
}
