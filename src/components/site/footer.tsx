import type { FooterConfig, NavLink, Theme } from "@/lib/site/types";
import { SLink } from "./link";
import type { CollectionCard, Category } from "@/lib/services/catalog";
import type { Lang } from "@/lib/i18n/dict";

export function SiteFooter({ theme, footer, nav, categories, collections, lang }: {
  theme: Theme; footer: FooterConfig; nav: NavLink[]; categories: Category[]; collections: CollectionCard[]; lang: Lang;
}) {
  const v = footer.variant;
  const style = { background: "var(--c-footer-bg)", color: "var(--c-footer-text)" };
  const cats = categories.filter((c) => !c.parent_id).slice(0, 6);
  const catName = (c: Category) => (lang === "en" ? c.name_en : c.name_id);
  const small = <p className="text-[12px] opacity-60">{footer.copyright || `© ${new Date().getFullYear()} ${theme.logoText}`} · {lang === "en" ? "Internal reservation system" : "Sistem reservasi internal"}</p>;

  if (v === "minimal")
    return (
      <footer style={style}>
        <div className="s-container flex flex-col items-center justify-between gap-4 py-8 md:flex-row">
          <span className="s-heading text-lg">{theme.logoText}</span>
          <nav className="flex flex-wrap gap-6 text-[13px] opacity-80">{nav.map((n, i) => <SLink key={i} href={n.href} className="s-link">{n.label}</SLink>)}</nav>
          {small}
        </div>
      </footer>
    );
  if (v === "bigtype")
    return (
      <footer style={style}>
        <div className="s-container pb-8 pt-16">
          <div className="grid gap-10 md:grid-cols-3">
            <p className="max-w-xs text-[14px] opacity-75">{footer.tagline}</p>
            <div className="text-[14px] opacity-80"><p>{footer.address}</p><p className="mt-2">{footer.email}</p><p>{footer.phone}</p></div>
            <nav className="flex flex-col gap-2 text-[14px]">{nav.map((n, i) => <SLink key={i} href={n.href} className="s-link">{n.label}</SLink>)}</nav>
          </div>
          <p className="s-heading mt-14 break-words text-[16vw] leading-[0.85] opacity-95 md:text-[11vw]">{theme.logoText}</p>
          <div className="mt-6">{small}</div>
        </div>
      </footer>
    );
  if (v === "centered")
    return (
      <footer style={style}>
        <div className="s-container flex flex-col items-center gap-6 py-14 text-center">
          <span className="s-heading text-2xl">{theme.logoText}</span>
          <p className="max-w-md text-[14px] opacity-70">{footer.tagline}</p>
          <nav className="flex flex-wrap justify-center gap-6 text-[13px] uppercase tracking-[.14em]">{nav.map((n, i) => <SLink key={i} href={n.href} className="s-link">{n.label}</SLink>)}</nav>
          <p className="text-[13px] opacity-70">{footer.email} · {footer.phone}</p>
          {small}
        </div>
      </footer>
    );
  if (v === "split")
    return (
      <footer style={style}>
        <div className="s-container grid gap-10 py-14 md:grid-cols-2">
          <div>
            <span className="s-heading text-3xl">{theme.logoText}</span>
            <p className="mt-4 max-w-sm text-[14px] opacity-70">{footer.tagline}</p>
            <SLink href="/products" className="s-btn mt-6">{lang === "en" ? "Browse collection" : "Jelajahi koleksi"}</SLink>
          </div>
          <div className="grid grid-cols-2 gap-6 text-[14px]">
            <div className="flex flex-col gap-2">{cats.map((c) => <SLink key={c.id} href={`/products?category=${c.slug}`} className="s-link opacity-80">{catName(c)}</SLink>)}</div>
            <div className="flex flex-col gap-2 opacity-80"><p>{footer.address}</p><p>{footer.email}</p><p>{footer.phone}</p></div>
          </div>
        </div>
        <div className="s-container border-t py-5" style={{ borderColor: "rgba(127,127,127,.25)" }}>{small}</div>
      </footer>
    );
  return (
    <footer style={style}>
      <div className="s-container grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <span className="s-heading text-xl">{theme.logoText}</span>
          <p className="mt-3 max-w-xs text-[14px] opacity-70">{footer.tagline}</p>
        </div>
        <div>
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[.14em] opacity-60">{lang === "en" ? "Categories" : "Kategori"}</p>
          <div className="flex flex-col gap-2 text-[14px]">{cats.map((c) => <SLink key={c.id} href={`/products?category=${c.slug}`} className="s-link opacity-85">{catName(c)}</SLink>)}</div>
        </div>
        <div>
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[.14em] opacity-60">{lang === "en" ? "Collections" : "Koleksi"}</p>
          <div className="flex flex-col gap-2 text-[14px]">{collections.slice(0, 5).map((c) => <SLink key={c.id} href={`/collections/${c.slug}`} className="s-link opacity-85">{c.name}</SLink>)}</div>
        </div>
        <div className="text-[14px] opacity-80">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[.14em] opacity-75">{lang === "en" ? "Contact" : "Kontak"}</p>
          <p>{footer.address}</p><p className="mt-2">{footer.email}</p><p>{footer.phone}</p>
        </div>
      </div>
      <div className="s-container border-t py-5" style={{ borderColor: "rgba(127,127,127,.25)" }}>{small}</div>
    </footer>
  );
}
