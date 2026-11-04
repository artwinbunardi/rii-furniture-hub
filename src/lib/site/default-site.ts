import type { SiteSnapshot, SitePage, PageType, Section } from "./types";
import { DEFAULT_THEME } from "./theme";
import { makeSection } from "./registry";

type S = [type: string, variant?: string, props?: Record<string, any>, style?: Record<string, any>];

export function page(page_type: PageType, slug: string, title: string, sections: S[], extra: Partial<SitePage> = {}): SitePage {
  return {
    slug, title, page_type, is_home: page_type === "home", is_system: page_type !== "custom",
    seo_title: null, seo_description: null,
    sections: sections.map(([t, v, p, st]) => makeSection(t, v, p ?? {}, st ?? {}) as Section),
    ...extra,
  };
}

/** Standard system pages every template provides (templates override variants/sections). */
export function systemPages(o: {
  catalog?: string; product?: string; collections?: string; cart?: string; reservations?: string; login?: string;
  about?: S[]; contact?: S[]; catalogTop?: S[]; catalogBottom?: S[]; productBottom?: S[];
} = {}): SitePage[] {
  return [
    page("catalog", "products", "Katalog", [...(o.catalogTop ?? []), ["catalog", o.catalog ?? "sidebar"], ...(o.catalogBottom ?? [])]),
    page("product", "products/:slug", "Detail Produk", [["product-detail", o.product ?? "thumbs"], ...(o.productBottom ?? [["reservation-cta", "minimal"]])]),
    page("collections", "collections", "Koleksi", [["collections-list", o.collections ?? "grid"]]),
    page("collection", "collections/:slug", "Detail Koleksi", [["collection-detail"]]),
    page("about", "about", "Tentang", o.about ?? [["hero", "minimal", { eyebrow: "Tentang", heading: "Satu sistem untuk seluruh koleksi furnitur RII", subheading: "RII Furniture Hub menghubungkan tim dekor, gudang, dan manajemen." }], ["text-image", "image-right"], ["stats", "plain"], ["faq", "two-column"]]),
    page("contact", "contact", "Kontak", o.contact ?? [["contact", "split"]]),
    page("cart", "cart", "Keranjang Reservasi", [["cart", o.cart ?? "two-column"]]),
    page("login", "sign-in", "Masuk", [["login-form", o.login ?? "card"]]),
    page("my_reservations", "my-reservations", "Reservasi Saya", [["my-reservations", o.reservations ?? "table"]]),
    page("reservation", "my-reservations/:id", "Detail Reservasi", [["reservation-detail"]]),
    page("account", "account", "Akun Saya", [["account"]]),
  ];
}

export function defaultSnapshot(): SiteSnapshot {
  return {
    name: "RII Furniture Catalog",
    templateId: null,
    theme: structuredClone(DEFAULT_THEME),
    header: { variant: "classic", sticky: true, showSearch: true, announcement: "", ctaLabel: "Reservasi", ctaHref: "/cart" },
    footer: { variant: "columns", tagline: "Koleksi furnitur & dekorasi acara RII — sistem reservasi internal.", address: "Jakarta, Indonesia (demo)", email: "furniture@rii.demo", phone: "+62 21 0000 0000", copyright: "" },
    navigation: [
      { label: "Katalog", href: "/products" }, { label: "Koleksi", href: "/collections" },
      { label: "Reservasi Saya", href: "/my-reservations" }, { label: "Tentang", href: "/about" }, { label: "Kontak", href: "/contact" },
    ],
    seo: { title: "RII Furniture Hub", description: "Koleksi & reservasi furnitur RII" },
    pages: [
      page("home", "", "Beranda", [["hero", "split"], ["search-availability", "inline"], ["category-grid", "tiles"], ["featured-products", "grid"], ["collection-showcase", "cards"], ["stats", "cards"], ["reservation-cta", "band"]]),
      ...systemPages(),
    ],
  };
}
