import type { Lang } from "@/lib/i18n/dict";
import type { ProductCard, Category, CollectionCard } from "@/lib/services/catalog";
import type { Section, Theme, HeaderConfig, FooterConfig, NavLink } from "@/lib/site/types";

export type SiteUser = { id: string; name: string; canReserve: boolean; isStaff: boolean } | null;

export type PageData =
  | { kind: "catalog"; products: ProductCard[]; filters: Record<string, string>; facets: { categories: Category[]; colors: string[]; materials: string[] } }
  | { kind: "product"; detail: any; related: ProductCard[]; wishlists: { id: string; name: string; product_ids: string[] }[] }
  | { kind: "collection"; collection: any; products: ProductCard[] }
  | { kind: "cart"; cart: any; projects: any[] }
  | { kind: "reservations"; list: any[]; drafts: any[] }
  | { kind: "reservation"; detail: any }
  | { kind: "account"; account: any }
  | { kind: "login"; next?: string }
  | { kind: "none" };

export type SiteData = {
  lang: Lang;
  user: SiteUser;
  products: ProductCard[];
  categories: Category[];
  collections: CollectionCard[];
  dates: { from: string; to: string; explicit: boolean };
  cartCount: number;
  page: PageData;
  editor: boolean;
};

export type SectionProps = { section: Section; theme: Theme; data: SiteData };

export type FrameConfig = { theme: Theme; header: HeaderConfig; footer: FooterConfig; navigation: NavLink[] };
