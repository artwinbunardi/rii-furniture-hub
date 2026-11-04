import "server-only";
import { q1 } from "../db";
import type { CurrentUser } from "../auth/user";
import type { PageType } from "./types";
import type { PageData } from "@/components/site/types";
import { ROLES } from "../rbac";
import { getProductDetail, listProducts, listWishlists, getCollection } from "../services/catalog";
import { getCartView, listMyReservations, getReservationView } from "../services/reservation-queries";
import type { baseSiteData } from "./loader";

type Base = Awaited<ReturnType<typeof baseSiteData>>;
export type Loader = (user: CurrentUser | null, base: Base) => Promise<PageData | null>;
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** One loader per functional page type — shared by the live site, previews and the editor canvas. */
export const loaders = {
  catalog: (sp: SP): Loader => async (user, base) => {
    const filters = Object.fromEntries(["q", "category", "color", "material", "available", "sort", "collection", "favorites"].map((k) => [k, one(sp[k])]).filter(([, v]) => v));
    return {
      kind: "catalog", filters, facets: base.facets,
      products: await listProducts(user?.ctx ?? null, {
        q: filters.q, category: filters.category, color: filters.color, material: filters.material,
        availableOnly: filters.available === "1", sort: filters.sort as any, collection: filters.collection, favorites: filters.favorites === "1",
        from: base.dates.from, to: base.dates.to,
      }),
    };
  },
  product: (slug: string): Loader => async (user, base) => {
    const detail = await getProductDetail(user?.ctx ?? null, slug, base.dates.from, base.dates.to);
    if (!detail || !detail.product.is_active) return null;
    const related = detail.relatedIds.length ? await listProducts(user?.ctx ?? null, { ids: detail.relatedIds, from: base.dates.from, to: base.dates.to }) : [];
    const wishlists = user ? await listWishlists(user.ctx) : [];
    return { kind: "product", detail, related, wishlists };
  },
  collection: (slug: string): Loader => async (user, base) => {
    const c = await getCollection(user?.ctx ?? null, slug);
    if (!c) return null;
    const products = c.productIds.length ? await listProducts(user?.ctx ?? null, { ids: c.productIds, from: base.dates.from, to: base.dates.to }) : [];
    return { kind: "collection", collection: c, products };
  },
  cart: (): Loader => async (user) => {
    if (!user) return { kind: "none" };
    const v = await getCartView(user.ctx);
    return { kind: "cart", cart: v.cart, projects: v.projects };
  },
  reservations: (): Loader => async (user) => (user ? { kind: "reservations", list: await listMyReservations(user.ctx), drafts: [] } : { kind: "none" }),
  reservation: (id: string, submitted = false): Loader => async (user) => {
    if (!user) return { kind: "none" };
    if (!/^[0-9a-f-]{36}$/i.test(id) && !/^RES-/.test(id)) return null;
    const detail = await getReservationView(user.ctx, id);
    if (!detail) return null;
    return { kind: "reservation", detail, submitted } as PageData;
  },
  account: (lang: "id" | "en"): Loader => async (user) => {
    if (!user) return { kind: "none" };
    const stats = await q1(user.ctx, `SELECT count(*) FILTER (WHERE NOT is_cart AND status <> 'draft')::int AS total,
        count(*) FILTER (WHERE status IN ('pending_approval','approved','preparing','ready_for_dispatch','checked_out','partially_returned'))::int AS active
        FROM reservations WHERE requester_id = $1`, [user.id]);
    const fav = await q1(user.ctx, `SELECT count(*)::int AS n FROM favorites WHERE user_id = $1`, [user.id]);
    return { kind: "account", account: {
      name: user.name, email: user.email, department: user.department,
      roles: user.roles.map((r) => ROLES.find((x) => x.code === r)?.[lang === "en" ? "name_en" : "name_id"] ?? r),
      reservationCount: stats?.total ?? 0, activeCount: stats?.active ?? 0, favoriteCount: fav?.n ?? 0, wishlists: await listWishlists(user.ctx),
    } };
  },
  login: (next?: string): Loader => async () => ({ kind: "login", next }),
};

/** Map a site path (as segments) to the page type, slug and loader. Used by preview routes. */
export function resolveSitePath(segs: string[], sp: SP, lang: "id" | "en"): { type: PageType; slug?: string; load?: Loader; requireAuth?: boolean } {
  const [a, b, ...rest] = segs;
  if (!a) return { type: "home" };
  if (a === "products" && !b) return { type: "catalog", load: loaders.catalog(sp) };
  if (a === "products" && b && !rest.length) return { type: "product", load: loaders.product(b) };
  if (a === "collections" && !b) return { type: "collections" };
  if (a === "collections" && b && !rest.length) return { type: "collection", load: loaders.collection(b) };
  if (a === "cart" && !b) return { type: "cart", load: loaders.cart(), requireAuth: true };
  if (a === "my-reservations" && !b) return { type: "my_reservations", load: loaders.reservations(), requireAuth: true };
  if (a === "my-reservations" && b && !rest.length) return { type: "reservation", load: loaders.reservation(b), requireAuth: true };
  if (a === "account" && !b) return { type: "account", load: loaders.account(lang), requireAuth: true };
  if (a === "sign-in" && !b) return { type: "login", load: loaders.login() };
  if (a === "about" && !b) return { type: "about" };
  if (a === "contact" && !b) return { type: "contact" };
  return { type: "custom", slug: segs.join("/") };
}
