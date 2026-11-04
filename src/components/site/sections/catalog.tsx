import type { SectionProps, SiteData } from "../types";
import { ProductCard, AvailabilityPill } from "../product-card";
import { SLink } from "../link";
import { DateRangeBar, QtyAddToCart, FavoriteButton } from "../interactive";
import { Gallery, AvailabilityCalendar, WishlistPicker, AutoSubmitSelect } from "./catalog-client";
import { Editable } from "../editable";
import { tr } from "@/lib/i18n/dict";
import { fmtDate } from "@/lib/utils";

function dateLabels(data: SiteData) {
  return { loading: tr(data.lang, "loading_date"), ret: tr(data.lang, "return_date"), apply: tr(data.lang, "apply"), hint: tr(data.lang, "select_dates_hint") };
}

export function CatalogSection({ section: s, data }: SectionProps) {
  const t = (k: string) => tr(data.lang, k);
  const page = data.page.kind === "catalog" ? data.page : null;
  const products = page?.products ?? data.products.slice(0, 12);
  const facets = page?.facets ?? { categories: data.categories, colors: [], materials: [] };
  const f = page?.filters ?? {};
  const catName = (c: { name_en: string; name_id: string }) => (data.lang === "en" ? c.name_en : c.name_id);
  const activeCat = facets.categories.find((c) => c.slug === f.category);
  const hidden = (keep: string[]) => Object.entries(f).filter(([k, v]) => v && !keep.includes(k)).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />);
  const qs = (patch: Record<string, string | undefined>) => {
    const u = new URLSearchParams(Object.entries({ ...f, ...patch }).filter(([, v]) => v) as [string, string][]);
    const str = u.toString();
    return `/products${str ? `?${str}` : ""}`;
  };

  const filterForm = (vertical: boolean) => (
    <form action="/products" className={vertical ? "space-y-5" : "flex flex-wrap items-end gap-3"}>
      {hidden(["q", "category", "color", "material", "available", "sort"])}
      <label className={vertical ? "block" : "min-w-[220px] flex-1"}><span className="s-muted mb-1 block text-[12px]">{t("search")}</span><input name="q" defaultValue={f.q} placeholder={t("search_placeholder")} className="s-input" /></label>
      <label className={vertical ? "block" : "w-[170px]"}><span className="s-muted mb-1 block text-[12px]">{t("category")}</span>
        <select name="category" defaultValue={f.category ?? ""} className="s-input"><option value="">{t("all")}</option>{facets.categories.map((c) => <option key={c.id} value={c.slug}>{c.parent_id ? "— " : ""}{catName(c)} ({c.count})</option>)}</select></label>
      <label className={vertical ? "block" : "w-[150px]"}><span className="s-muted mb-1 block text-[12px]">{t("color")}</span>
        <select name="color" defaultValue={f.color ?? ""} className="s-input"><option value="">{t("all")}</option>{facets.colors.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
      <label className={vertical ? "block" : "w-[170px]"}><span className="s-muted mb-1 block text-[12px]">{t("material")}</span>
        <select name="material" defaultValue={f.material ?? ""} className="s-input"><option value="">{t("all")}</option>{facets.materials.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
      <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" name="available" value="1" defaultChecked={f.available === "1"} className="h-4 w-4" />{t("only_available")}</label>
      <div className="flex gap-2"><button className="s-btn s-btn-sm" type="submit">{t("apply")}</button><SLink href="/products" className="s-btn s-btn-ghost s-btn-sm">{t("reset")}</SLink></div>
    </form>
  );

  const toolbar = (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <p className="s-muted text-[14px]" data-testid="result-count">{products.length} {t("results")}{activeCat ? ` · ${catName(activeCat)}` : ""}{data.dates.explicit ? ` · ${fmtDate(data.dates.from, data.lang)} – ${fmtDate(data.dates.to, data.lang)}` : ""}</p>
      <form action="/products" className="flex items-center gap-2 text-[14px]">
        {hidden(["sort"])}
        <span className="s-muted">{t("sort")}</span>
        <AutoSubmitSelect name="sort" defaultValue={f.sort ?? "name"} options={[["name", t("sort_name")], ["newest", t("sort_newest")], ["available", t("sort_available")], ["popular", t("sort_popular")]]} />
      </form>
    </div>
  );

  const grid = products.length ? (
    <div className={`grid grid-cols-2 gap-x-5 gap-y-8 ${s.variant === "sidebar" ? "lg:grid-cols-3" : "md:grid-cols-3 lg:grid-cols-4"}`}>
      {products.map((p) => <ProductCard key={p.id} p={p} lang={data.lang} canReserve={!!data.user?.canReserve} editor={data.editor} />)}
    </div>
  ) : (
    <div className="s-rounded border border-dashed py-20 text-center" style={{ borderColor: "var(--c-border)" }}>
      <p className="font-medium">{t("no_products")}</p><SLink href="/products" className="s-btn s-btn-ghost s-btn-sm mt-4">{t("reset")}</SLink>
    </div>
  );

  const head = (
    <div className="mb-8">
      <Editable as="h1" sectionId={s.id} field="heading" value={s.props.heading || t("all_products")} className="s-heading text-[34px] md:text-[48px]" />
      {s.props.subheading && <Editable as="p" sectionId={s.id} field="subheading" value={s.props.subheading} className="s-muted mt-2 max-w-2xl" />}
    </div>
  );

  if (s.variant === "tabs") {
    return (
      <div className="s-container py-10 md:py-14">
        {head}
        <div className="mb-6"><DateRangeBar from={data.dates.from} to={data.dates.to} explicit={data.dates.explicit} labels={dateLabels(data)} /></div>
        <nav className="mb-6 flex gap-2 overflow-x-auto pb-2">
          <SLink href={qs({ category: undefined })} className={`shrink-0 rounded-full border px-4 py-1.5 text-[13px] ${!f.category ? "bg-[var(--c-text)] text-[var(--c-bg)]" : ""}`} style={{ borderColor: "var(--c-border)" }}>{t("all")}</SLink>
          {facets.categories.filter((c) => !c.parent_id).map((c) => <SLink key={c.id} href={qs({ category: c.slug })} className={`shrink-0 rounded-full border px-4 py-1.5 text-[13px] ${f.category === c.slug ? "bg-[var(--c-text)] text-[var(--c-bg)]" : ""}`} style={{ borderColor: "var(--c-border)" }}>{catName(c)}</SLink>)}
        </nav>
        {toolbar}{grid}
      </div>
    );
  }
  if (s.variant === "topbar") {
    return (
      <div className="s-container py-10 md:py-14">
        {head}
        <div className="mb-4"><DateRangeBar from={data.dates.from} to={data.dates.to} explicit={data.dates.explicit} labels={dateLabels(data)} /></div>
        <div className="mb-8 border-b pb-6" style={{ borderColor: "var(--c-border)" }}>{filterForm(false)}</div>
        {toolbar}{grid}
      </div>
    );
  }
  return (
    <div className="s-container py-10 md:py-14">
      {head}
      <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <DateRangeBar stacked from={data.dates.from} to={data.dates.to} explicit={data.dates.explicit} labels={dateLabels(data)} />
          {filterForm(true)}
        </aside>
        <div>{toolbar}{grid}</div>
      </div>
    </div>
  );
}

export function ProductDetailSection({ section: s, data }: SectionProps) {
  const t = (k: string) => tr(data.lang, k);
  const page = data.page.kind === "product" ? data.page : null;
  if (!page) {
    // Editor preview without a specific product: show the first product card grid as placeholder
    const p = data.products[0];
    return <div className="s-container py-16"><p className="s-muted text-center">{t("view_details")} — {p?.name}</p></div>;
  }
  const { detail, related } = page;
  const p = detail.product;
  const a = detail.availability;
  const cat = data.lang === "en" ? p.category_name_en : p.category_name_id;
  const specs: [string, string | null][] = [
    [t("sku"), p.sku],
    [t("category"), cat],
    [t("dimensions"), [p.length_cm, p.width_cm, p.height_cm].every((x: number | null) => x != null) ? `${p.length_cm} × ${p.width_cm} × ${p.height_cm} cm` : null],
    [t("weight"), p.weight_kg ? `${p.weight_kg} kg` : null],
    [t("color"), p.color],
    [t("material"), p.material],
    [t("condition"), p.condition_grade],
    [t("storage_location"), p.location_code ? `${p.warehouse_name} · ${p.location_code}` : null],
  ];
  const stock: [string, number, string?][] = [
    [t("total_inventory"), p.owned],
    [t("available_for_dates"), a.available, "ok"],
    [t("reserved_for_dates"), a.reserved],
    [t("pending_for_dates"), a.pending],
    [t("damaged") + " / " + t("under_repair"), p.damaged + p.under_repair],
  ];
  const stacked = s.variant === "stacked";
  return (
    <div className="s-container py-8 md:py-12">
      <nav className="s-muted mb-6 text-[13px]"><SLink href="/products" className="s-link">{t("all_products")}</SLink> / <SLink href={`/products?category=${p.category_slug}`} className="s-link">{cat}</SLink> / <span>{p.name}</span></nav>
      <div className={`grid gap-10 ${stacked ? "" : "lg:grid-cols-[1.25fr_1fr]"}`}>
        <Gallery images={detail.images} name={p.name} layout={stacked ? "row" : s.variant === "grid" ? "grid" : "thumbs"} />
        <div className={stacked ? "mx-auto w-full max-w-3xl" : "lg:sticky lg:top-24 lg:self-start"}>
          <p className="s-eyebrow">{cat} · <span className="font-mono">{p.sku}</span></p>
          <div className="mt-2 flex items-start justify-between gap-4">
            <h1 className="s-heading text-[32px] md:text-[42px]" data-testid="product-name">{p.name}</h1>
            <FavoriteButton productId={p.id} initial={p.is_favorite} disabled={data.editor || !data.user?.canReserve} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2"><AvailabilityPill p={a} lang={data.lang} />{p.is_demo && <span className="s-pill" style={{ background: "var(--c-surface)" }}>{t("demo_image")}</span>}</div>
          <p className="s-muted mt-5 whitespace-pre-line leading-relaxed">{p.description}</p>

          <div className="mt-6"><DateRangeBar from={data.dates.from} to={data.dates.to} explicit={data.dates.explicit} labels={dateLabels(data)} /></div>

          <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden border s-rounded sm:grid-cols-5" style={{ borderColor: "var(--c-border)", background: "var(--c-border)" }} data-testid="stock-breakdown">
            {stock.map(([k, v, tone]) => (
              <div key={k} className="p-3" style={{ background: "var(--c-bg)" }}>
                <dt className="s-muted text-[11px] leading-tight">{k}</dt>
                <dd className="mt-1 text-[20px] font-semibold" style={tone ? { color: a.available ? "#17663a" : "#a12a2a" } : undefined} data-testid={tone ? "available-qty" : undefined}>{v}</dd>
              </div>
            ))}
          </dl>
          {data.user?.canReserve ? (
            <div className="mt-5"><QtyAddToCart productId={p.id} label={t("add_to_reservation")} max={a.available} disabled={data.editor || a.available === 0} /></div>
          ) : !data.user ? (
            <SLink href="/login" className="s-btn mt-5 w-full">{t("login")}</SLink>
          ) : null}
          {data.user?.canReserve && <div className="mt-3"><WishlistPicker productId={p.id} lists={page.wishlists} lang={data.lang} /></div>}

          <dl className="mt-8 divide-y border-y text-[14px]" style={{ borderColor: "var(--c-border)" }}>
            {specs.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-6 py-2.5" style={{ borderColor: "var(--c-border)" }}><dt className="s-muted">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
            ))}
          </dl>
        </div>
      </div>
      <div className="mt-14">
        <h2 className="s-heading mb-4 text-[24px]">{t("availability_calendar")}</h2>
        <AvailabilityCalendar days={detail.calendar} lang={data.lang} selected={data.dates.explicit ? [data.dates.from, data.dates.to] : null} />
      </div>
      {related.length > 0 && (
        <div className="mt-16">
          <h2 className="s-heading mb-6 text-[26px]">{data.lang === "en" ? "You may also like" : "Produk serupa"}</h2>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">{related.map((r) => <ProductCard key={r.id} p={r} lang={data.lang} canReserve={!!data.user?.canReserve} editor={data.editor} compact />)}</div>
        </div>
      )}
    </div>
  );
}

export function CollectionsListSection({ section: s, data }: SectionProps) {
  const t = (k: string) => tr(data.lang, k);
  return (
    <div className="s-container py-10 md:py-14">
      <Editable as="h1" sectionId={s.id} field="heading" value={s.props.heading || t("nav_collections")} className="s-heading text-[34px] md:text-[48px]" />
      {s.props.subheading && <Editable as="p" sectionId={s.id} field="subheading" value={s.props.subheading} className="s-muted mt-2 max-w-2xl" />}
      <div className={`mt-10 grid gap-6 ${s.variant === "list" ? "" : "md:grid-cols-2"}`}>
        {data.collections.map((c) => (
          <SLink key={c.id} href={`/collections/${c.slug}`} className={`group overflow-hidden border s-rounded ${s.variant === "list" ? "grid md:grid-cols-[1fr_1.2fr]" : "block"}`} style={{ borderColor: "var(--c-border)" }}>
            <img src={c.cover ?? c.previews[0] ?? ""} alt="" className="aspect-[16/9] w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
            <div className="p-6">
              <p className="s-heading text-[24px]">{c.name}</p>
              <p className="s-muted mt-2 text-[14px]">{c.description}</p>
              <div className="mt-4 flex gap-2">{c.previews.slice(0, 4).map((src: string, i: number) => <img key={i} src={src} alt="" className="h-14 w-14 object-cover s-rounded" />)}</div>
            </div>
          </SLink>
        ))}
      </div>
    </div>
  );
}

export function CollectionDetailSection({ section: s, data }: SectionProps) {
  const t = (k: string) => tr(data.lang, k);
  const page = data.page.kind === "collection" ? data.page : null;
  const c = page?.collection ?? data.collections[0];
  const products = page?.products ?? data.products.slice(0, 8);
  if (!c) return null;
  return (
    <div>
      <div className="relative overflow-hidden" style={{ color: "#fff" }}>
        <img src={c.cover ?? ""} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/50" />
        <div className="s-container relative py-20 md:py-28">
          <SLink href="/collections" className="text-[13px] opacity-80">← {t("nav_collections")}</SLink>
          <h1 className="s-heading mt-3 text-[38px] md:text-[56px]">{c.name}</h1>
          {c.description && <p className="mt-3 max-w-xl opacity-85">{c.description}</p>}
          {c.kind === "wishlist" && <p className="mt-2 text-[13px] opacity-75">{t("my_wishlists")}</p>}
        </div>
      </div>
      <div className="s-container py-10">
        <div className="mb-6"><DateRangeBar from={data.dates.from} to={data.dates.to} explicit={data.dates.explicit} labels={dateLabels(data)} /></div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} p={p} lang={data.lang} canReserve={!!data.user?.canReserve} editor={data.editor} />)}
        </div>
      </div>
    </div>
  );
}
