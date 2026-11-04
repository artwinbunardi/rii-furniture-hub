import type { SectionProps, SiteData } from "../types";
import type { ProductCard as P } from "@/lib/services/catalog";
import { Editable } from "../editable";
import { SLink } from "../link";
import { ProductCard, AvailabilityPill } from "../product-card";
import { Scroller } from "./client-bits";
import { DateRangeBar } from "../interactive";
import { tr } from "@/lib/i18n/dict";

/** Picks products for a section from the LIVE catalog data (never stored in the template). */
export function pickProducts(data: SiteData, p: Record<string, any>): P[] {
  let list = data.products;
  const src = p.source ?? "newest";
  if (src === "collection" && p.collection) {
    const ids = (data.collections.find((c) => c.slug === p.collection) as any)?.product_ids as string[] | undefined;
    list = ids ? ids.map((id) => list.find((x) => x.id === id)).filter(Boolean) as P[] : list.filter(() => false);
  } else if (src === "category" && p.category) {
    list = list.filter((x) => x.category_slug === p.category);
  } else if (src === "popular") {
    list = [...list].sort((a, b) => (b.times_reserved ?? 0) - (a.times_reserved ?? 0));
  } else if (src === "available") {
    list = [...list].sort((a, b) => b.available - a.available);
  } else if (src === "manual" && Array.isArray(p.skus) && p.skus.length) {
    list = (p.skus as string[]).map((s) => list.find((x) => x.sku === s)).filter(Boolean) as P[];
  } else {
    list = [...list].reverse();
  }
  return list.slice(0, Number(p.limit) || 8);
}

function Heading({ s, center }: { s: SectionProps["section"]; center?: boolean }) {
  const p = s.props;
  return (
    <div className={`mb-10 flex flex-col gap-3 ${center ? "items-center text-center" : "md:flex-row md:items-end md:justify-between"}`}>
      <div>
        {p.eyebrow && <Editable as="p" sectionId={s.id} field="eyebrow" value={p.eyebrow} className="s-eyebrow mb-2" />}
        <Editable as="h2" sectionId={s.id} field="heading" value={p.heading} className="s-heading text-[30px] md:text-[42px]" style={s.style.fontSize ? { fontSize: s.style.fontSize } : undefined} />
        {p.subheading && <Editable as="p" sectionId={s.id} field="subheading" value={p.subheading} className="s-muted mt-2 max-w-xl" />}
      </div>
      {p.linkLabel && <SLink href={p.linkHref || "/products"} className="s-link text-[14px] font-medium">{p.linkLabel} →</SLink>}
    </div>
  );
}

const canReserve = (d: SiteData) => !!d.user?.canReserve;

export function FeaturedProducts({ section: s, data }: SectionProps) {
  const items = pickProducts(data, s.props);
  const cols = Number(s.props.columns) || 4;
  const grid = cols === 3 ? "md:grid-cols-3" : cols === 2 ? "md:grid-cols-2" : "md:grid-cols-3 lg:grid-cols-4";
  if (s.variant === "editorial") {
    return (
      <div className="s-section s-container">
        <Heading s={s} />
        <div className="divide-y border-y" style={{ borderColor: "var(--c-border)" }}>
          {items.map((p, i) => (
            <SLink key={p.id} href={`/products/${p.slug}`} className="group grid grid-cols-[48px_1fr_auto] items-center gap-6 py-5 md:grid-cols-[64px_120px_1fr_auto_auto]">
              <span className="s-muted font-mono text-[13px]">{String(i + 1).padStart(2, "0")}</span>
              <img src={p.image ?? ""} alt="" className="hidden aspect-[4/3] w-[120px] object-cover md:block s-rounded" />
              <span className="s-heading text-[20px] md:text-[26px]" style={{ textTransform: "none" }}>{p.name}</span>
              <span className="s-muted hidden text-[13px] md:block">{data.lang === "en" ? p.category_name_en : p.category_name_id}</span>
              <AvailabilityPill p={p} lang={data.lang} />
            </SLink>
          ))}
        </div>
      </div>
    );
  }
  if (s.variant === "spotlight") {
    const [first, ...rest] = items;
    return (
      <div className="s-section s-container">
        <Heading s={s} />
        <div className="grid gap-6 md:grid-cols-2">
          {first && <ProductCard p={first} lang={data.lang} canReserve={canReserve(data)} editor={data.editor} />}
          <div className="grid grid-cols-2 gap-6">{rest.slice(0, 4).map((p) => <ProductCard key={p.id} p={p} lang={data.lang} canReserve={canReserve(data)} editor={data.editor} compact />)}</div>
        </div>
      </div>
    );
  }
  if (s.variant === "masonry") {
    return (
      <div className="s-section s-container">
        <Heading s={s} center />
        <div className="columns-2 gap-6 md:columns-3 [&>*]:mb-6 [&>*]:break-inside-avoid">
          {items.map((p) => <ProductCard key={p.id} p={p} lang={data.lang} canReserve={canReserve(data)} editor={data.editor} compact />)}
        </div>
      </div>
    );
  }
  if (s.variant === "index") {
    return (
      <div className="s-section s-container grid gap-10 md:grid-cols-[1fr_1.4fr]">
        <div className="md:sticky md:top-24 md:self-start"><Heading s={s} /></div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-10">{items.map((p) => <ProductCard key={p.id} p={p} lang={data.lang} canReserve={canReserve(data)} editor={data.editor} compact />)}</div>
      </div>
    );
  }
  return (
    <div className="s-section s-container">
      <Heading s={s} center={s.props.center} />
      <div className={`grid grid-cols-2 gap-x-5 gap-y-8 ${grid}`}>
        {items.map((p) => <ProductCard key={p.id} p={p} lang={data.lang} canReserve={canReserve(data)} editor={data.editor} />)}
      </div>
    </div>
  );
}

export function ProductCarousel({ section: s, data }: SectionProps) {
  const items = pickProducts(data, s.props);
  return (
    <div className="s-section s-container">
      <Heading s={s} />
      <Scroller>
        {items.map((p) => (
          <div key={p.id} className={`shrink-0 snap-start ${s.variant === "wide" ? "w-[78%] md:w-[42%]" : "w-[64%] md:w-[24%]"}`}>
            <ProductCard p={p} lang={data.lang} canReserve={canReserve(data)} editor={data.editor} compact={s.variant === "wide"} />
          </div>
        ))}
      </Scroller>
    </div>
  );
}

export function CategoryGrid({ section: s, data }: SectionProps) {
  const cats = data.categories.filter((c) => !c.parent_id && (c.count > 0 || s.props.showEmpty));
  const limit = Number(s.props.limit) || 12;
  const list = cats.slice(0, limit);
  const name = (c: (typeof cats)[number]) => (data.lang === "en" ? c.name_en : c.name_id);
  if (s.variant === "pills")
    return (
      <div className="s-section s-container text-center">
        <Heading s={s} center />
        <div className="flex flex-wrap justify-center gap-2.5">{list.map((c) => <SLink key={c.id} href={`/products?category=${c.slug}`} className="rounded-full border px-5 py-2.5 text-[14px] transition hover:bg-[var(--c-text)] hover:text-[var(--c-bg)]" style={{ borderColor: "var(--c-border)" }}>{name(c)} <span className="s-muted ml-1">{c.count}</span></SLink>)}</div>
      </div>
    );
  if (s.variant === "index")
    return (
      <div className="s-section s-container">
        <Heading s={s} />
        <div className="grid border-t md:grid-cols-2" style={{ borderColor: "var(--c-border)" }}>
          {list.map((c, i) => (
            <SLink key={c.id} href={`/products?category=${c.slug}`} className="group flex items-center justify-between border-b py-5 md:px-4" style={{ borderColor: "var(--c-border)" }}>
              <span className="flex items-baseline gap-4"><span className="s-muted font-mono text-[12px]">{String(i + 1).padStart(2, "0")}</span><span className="s-heading text-[22px]" style={{ textTransform: "none" }}>{name(c)}</span></span>
              <span className="s-muted text-[13px] transition group-hover:translate-x-1">{c.count} →</span>
            </SLink>
          ))}
        </div>
      </div>
    );
  if (s.variant === "circles")
    return (
      <div className="s-section s-container">
        <Heading s={s} center />
        <div className="grid grid-cols-3 gap-6 md:grid-cols-6">{list.map((c) => (
          <SLink key={c.id} href={`/products?category=${c.slug}`} className="group text-center">
            <img src={c.image ?? ""} alt="" className="mx-auto aspect-square w-full rounded-full object-cover transition group-hover:scale-105" style={{ background: "var(--c-surface)" }} />
            <p className="mt-3 text-[14px] font-medium">{name(c)}</p>
          </SLink>
        ))}</div>
      </div>
    );
  if (s.variant === "large")
    return (
      <div className="s-section s-container">
        <Heading s={s} />
        <div className="grid gap-5 md:grid-cols-3">{list.slice(0, 6).map((c, i) => (
          <SLink key={c.id} href={`/products?category=${c.slug}`} className={`group relative overflow-hidden s-rounded ${i === 0 ? "md:col-span-2 md:row-span-2" : ""}`}>
            <img src={c.image ?? ""} alt="" className={`w-full object-cover transition duration-500 group-hover:scale-105 ${i === 0 ? "aspect-[4/3] md:h-full" : "aspect-[4/3]"}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 p-5 text-white"><p className="s-heading text-[24px]" style={{ textTransform: "none" }}>{name(c)}</p><p className="text-[13px] opacity-80">{c.count} {tr(data.lang, "nav_products").toLowerCase()}</p></div>
          </SLink>
        ))}</div>
      </div>
    );
  return (
    <div className="s-section s-container">
      <Heading s={s} />
      <div className="grid grid-cols-2 gap-5 md:grid-cols-4">{list.map((c) => (
        <SLink key={c.id} href={`/products?category=${c.slug}`} className="group">
          <div className="overflow-hidden s-rounded"><img src={c.image ?? ""} alt="" className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105" style={{ background: "var(--c-surface)" }} /></div>
          <p className="mt-3 flex items-center justify-between text-[15px] font-medium">{name(c)}<span className="s-muted text-[13px] font-normal">{c.count}</span></p>
        </SLink>
      ))}</div>
    </div>
  );
}

export function CollectionShowcase({ section: s, data }: SectionProps) {
  const cols = data.collections.slice(0, Number(s.props.limit) || 4);
  if (s.variant === "stack")
    return (
      <div className="s-section s-container space-y-6">
        <Heading s={s} />
        {cols.map((c, i) => (
          <SLink key={c.id} href={`/collections/${c.slug}`} className="group grid items-center gap-8 md:grid-cols-2">
            <img src={c.cover ?? c.previews[0] ?? ""} alt="" className={`aspect-[16/10] w-full object-cover s-rounded ${i % 2 ? "md:order-2" : ""}`} />
            <div><p className="s-eyebrow">{c.count} items</p><p className="s-heading mt-2 text-[30px] md:text-[40px]">{c.name}</p><p className="s-muted mt-3 max-w-md">{c.description}</p><span className="s-btn s-btn-ghost mt-6">{tr(data.lang, "view")} →</span></div>
          </SLink>
        ))}
      </div>
    );
  if (s.variant === "mosaic")
    return (
      <div className="s-section s-container">
        <Heading s={s} center />
        <div className="grid gap-5 md:grid-cols-2">{cols.map((c) => (
          <SLink key={c.id} href={`/collections/${c.slug}`} className="group block p-5 s-rounded" style={{ background: "var(--c-surface)" }}>
            <div className="grid grid-cols-4 gap-2">{c.previews.slice(0, 4).map((src: string, i: number) => <img key={i} src={src} alt="" className="aspect-square w-full object-cover s-rounded" />)}</div>
            <div className="mt-4 flex items-end justify-between"><div><p className="s-heading text-[22px]">{c.name}</p><p className="s-muted text-[13px]">{c.count} items</p></div><span className="text-[14px] transition group-hover:translate-x-1">→</span></div>
          </SLink>
        ))}</div>
      </div>
    );
  return (
    <div className="s-section s-container">
      <Heading s={s} />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">{cols.map((c) => (
        <SLink key={c.id} href={`/collections/${c.slug}`} className="group relative block overflow-hidden s-rounded">
          <img src={c.cover ?? c.previews[0] ?? ""} alt="" className="aspect-[3/4] w-full object-cover transition duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute bottom-0 p-5 text-white"><p className="s-heading text-[22px]">{c.name}</p><p className="text-[13px] opacity-80">{c.count} items</p></div>
        </SLink>
      ))}</div>
    </div>
  );
}

export function SearchAvailability({ section: s, data }: SectionProps) {
  const p = s.props;
  const labels = { loading: tr(data.lang, "loading_date"), ret: tr(data.lang, "return_date"), apply: tr(data.lang, "apply"), hint: tr(data.lang, "select_dates_hint") };
  const search = (
    <form action="/products" className="flex gap-2">
      <input name="q" placeholder={tr(data.lang, "search_placeholder")} className="s-input" />
      <button className="s-btn" type="submit">{tr(data.lang, "search")}</button>
    </form>
  );
  if (s.variant === "hero-card")
    return (
      <div className="s-container -mt-2 py-10">
        <div className="mx-auto max-w-4xl p-6 shadow-xl md:p-8 s-rounded" style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)" }}>
          <Editable as="h2" sectionId={s.id} field="heading" value={p.heading} className="s-heading mb-5 text-[24px] md:text-[30px]" />
          <div className="space-y-4">{search}<DateRangeBar from={data.dates.from} to={data.dates.to} explicit={data.dates.explicit} labels={labels} compact /></div>
        </div>
      </div>
    );
  return (
    <div className="s-section s-container grid items-center gap-8 md:grid-cols-[1fr_1.6fr]">
      <div><Editable as="h2" sectionId={s.id} field="heading" value={p.heading} className="s-heading text-[28px] md:text-[36px]" /><Editable as="p" sectionId={s.id} field="text" value={p.text} className="s-muted mt-3" /></div>
      <div className="space-y-3">{search}<DateRangeBar from={data.dates.from} to={data.dates.to} explicit={data.dates.explicit} labels={labels} /></div>
    </div>
  );
}
