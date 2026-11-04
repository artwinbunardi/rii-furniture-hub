import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getPool, q1 } from "../db";
import type { SiteSnapshot, PageType, SitePage } from "./types";
import { defaultSnapshot } from "./default-site";
import type { CurrentUser } from "../auth/user";
import { hasPerm } from "../rbac";
import { listProducts, catalogFacets, listCollections, normalizeDates } from "../services/catalog";

/** Published snapshot of the primary website (or the built-in default when nothing is published yet). */
export const getPublishedSite = cache(async (): Promise<{ snapshot: SiteSnapshot; websiteId: string | null; versionNo: number | null; requireLogin: boolean }> => {
  const { rows } = await getPool().query(
    `SELECT w.id, v.snapshot, v.version_no, s.require_login FROM websites w
       LEFT JOIN website_versions v ON v.id = w.published_version_id
       LEFT JOIN website_settings s ON s.website_id = w.id
      WHERE w.is_primary LIMIT 1`,
  );
  const r = rows[0];
  if (r?.snapshot) return { snapshot: r.snapshot as SiteSnapshot, websiteId: r.id, versionNo: r.version_no, requireLogin: r.require_login ?? true };
  return { snapshot: defaultSnapshot(), websiteId: r?.id ?? null, versionNo: null, requireLogin: r?.require_login ?? true };
});

export function findPage(s: SiteSnapshot, type: PageType, slug?: string): SitePage | null {
  if (type === "custom") return s.pages.find((p) => p.page_type === "custom" && p.slug === slug) ?? null;
  if (type === "home") return s.pages.find((p) => p.is_home) ?? s.pages.find((p) => p.page_type === "home") ?? null;
  return s.pages.find((p) => p.page_type === type) ?? defaultSnapshot().pages.find((p) => p.page_type === type) ?? null;
}

export const DATES_COOKIE = "rii_dates";

/** Selected rental window: the user's cart dates, else the dates cookie, else today. */
export async function selectedDates(user: CurrentUser | null) {
  if (user) {
    const r = await q1(user.ctx, `SELECT loading_date, return_date FROM reservations WHERE requester_id = $1 AND is_cart`, [user.id]);
    if (r?.loading_date && r?.return_date) return normalizeDates(r.loading_date, r.return_date);
  }
  const c = (await cookies()).get(DATES_COOKIE)?.value?.split("|");
  return normalizeDates(c?.[0], c?.[1]);
}

export async function cartCount(user: CurrentUser | null) {
  if (!user) return 0;
  const r = await q1(user.ctx,
    `SELECT coalesce(sum(ri.qty_requested),0)::int AS n FROM reservations r JOIN reservation_items ri ON ri.reservation_id = r.id WHERE r.requester_id = $1 AND r.is_cart`,
    [user.id],
  );
  return (r?.n ?? 0) as number;
}

export function siteUser(user: CurrentUser | null) {
  if (!user) return null;
  return {
    id: user.id, name: user.name,
    canReserve: hasPerm(user.perms, "reservation.create"),
    isStaff: user.roles.some((r) => r !== "decor"),
  };
}

/** Shared live data every page/section can use (products & availability come straight from inventory). */
export async function baseSiteData(user: CurrentUser | null) {
  const ctx = user?.ctx ?? null;
  const dates = await selectedDates(user);
  const [products, facets, collections, count] = await Promise.all([
    listProducts(ctx, { from: dates.from, to: dates.to }),
    catalogFacets(ctx),
    listCollections(ctx),
    cartCount(user),
  ]);
  return { products, categories: facets.categories, facets, collections, dates, cartCount: count };
}
