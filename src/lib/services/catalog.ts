import { withTx, type DbCtx } from "../db";
import { getAvailability, getDailyAvailability } from "./availability";
import { todayJakarta, isIsoDate } from "../utils";

export type ProductCard = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  category_id: string;
  category_slug: string;
  category_name_id: string;
  category_name_en: string;
  color: string | null;
  material: string | null;
  image: string | null;
  image_alt: string | null;
  owned: number;
  usable: number;
  reserved: number;
  pending: number;
  available: number;
  is_favorite?: boolean;
  times_reserved?: number;
};

export type CatalogFilters = {
  q?: string;
  category?: string; // slug
  color?: string;
  material?: string;
  availableOnly?: boolean;
  sort?: "name" | "newest" | "available" | "popular";
  collection?: string; // slug
  favorites?: boolean;
  ids?: string[];
  limit?: number;
  from?: string;
  to?: string;
};

export function mediaUrl(key: string | null | undefined) {
  return key ? `/media/${key}` : null;
}

export function normalizeDates(from?: string | null, to?: string | null) {
  const today = todayJakarta();
  const f = isIsoDate(from) ? from : today;
  let t = isIsoDate(to) ? to : f;
  if (t < f) t = f;
  return { from: f, to: t, explicit: isIsoDate(from) && isIsoDate(to) };
}

export async function listProducts(ctx: DbCtx | null, f: CatalogFilters = {}): Promise<ProductCard[]> {
  const { from, to } = normalizeDates(f.from, f.to);
  return withTx(ctx, async (tx) => {
    const where: string[] = ["p.is_active"];
    const params: unknown[] = [];
    const add = (sql: string, v: unknown) => {
      params.push(v);
      where.push(sql.replace("?", `$${params.length}`));
    };
    if (f.q) add(`(p.name ILIKE ? OR p.sku ILIKE $${params.length + 1} OR p.color ILIKE $${params.length + 1} OR p.material ILIKE $${params.length + 1} OR p.description ILIKE $${params.length + 1})`, `%${f.q}%`);
    if (f.category) add(`(c.slug = ? OR c.parent_id = (SELECT id FROM categories WHERE slug = $${params.length + 1}))`, f.category);
    if (f.color) add(`p.color = ?`, f.color);
    if (f.material) add(`p.material ILIKE ?`, `%${f.material}%`);
    if (f.collection) add(`EXISTS (SELECT 1 FROM collection_products cp JOIN collections co ON co.id = cp.collection_id WHERE cp.product_id = p.id AND co.slug = ? AND co.kind = 'official')`, f.collection);
    if (f.favorites && ctx?.userId) add(`EXISTS (SELECT 1 FROM favorites fv WHERE fv.product_id = p.id AND fv.user_id = ?)`, ctx.userId);
    if (f.ids) add(`p.id = ANY(?::uuid[])`, f.ids);
    params.push(ctx?.userId ?? null);
    const userParam = `$${params.length}`;
    const { rows } = await tx.query(
      `SELECT p.id, p.sku, p.slug, p.name, p.category_id, c.slug AS category_slug, c.name_id AS category_name_id, c.name_en AS category_name_en,
              p.color, p.material, p.created_at, b.owned,
              (SELECT m.storage_key FROM product_images pi JOIN media_assets m ON m.id = pi.media_id WHERE pi.product_id = p.id ORDER BY pi.sort LIMIT 1) AS image_key,
              (SELECT m.alt_text FROM product_images pi JOIN media_assets m ON m.id = pi.media_id WHERE pi.product_id = p.id ORDER BY pi.sort LIMIT 1) AS image_alt,
              EXISTS (SELECT 1 FROM favorites fv WHERE fv.product_id = p.id AND fv.user_id = ${userParam}::uuid) AS is_favorite,
              (SELECT count(*) FROM reservation_items ri JOIN reservations r ON r.id = ri.reservation_id
                WHERE ri.product_id = p.id AND r.status NOT IN ('draft','cancelled','rejected'))::int AS times_reserved
         FROM products p
         JOIN categories c ON c.id = p.category_id
         JOIN inventory_balances b ON b.product_id = p.id
        WHERE ${where.join(" AND ")}`,
      params,
    );
    const avail = await getAvailability(tx, rows.map((r) => r.id), from, to);
    let list: ProductCard[] = rows.map((r) => {
      const a = avail.get(r.id);
      return {
        ...r,
        image: mediaUrl(r.image_key),
        usable: a?.usable ?? 0,
        reserved: a?.reserved ?? 0,
        pending: a?.pending ?? 0,
        available: a?.available ?? 0,
      };
    });
    if (f.availableOnly) list = list.filter((p) => p.available > 0);
    const sort = f.sort ?? "name";
    list.sort((a, b) => {
      if (sort === "available") return b.available - a.available || a.name.localeCompare(b.name);
      if (sort === "popular") return (b.times_reserved ?? 0) - (a.times_reserved ?? 0) || a.name.localeCompare(b.name);
      if (sort === "newest") return String((b as unknown as { created_at: string }).created_at).localeCompare(String((a as unknown as { created_at: string }).created_at));
      return a.name.localeCompare(b.name);
    });
    if (f.ids) list.sort((a, b) => f.ids!.indexOf(a.id) - f.ids!.indexOf(b.id));
    return f.limit ? list.slice(0, f.limit) : list;
  });
}

export async function catalogFacets(ctx: DbCtx | null) {
  return withTx(ctx, async (tx) => {
    const cats = (await tx.query(
      `SELECT c.id, c.slug, c.name_id, c.name_en, c.parent_id, c.sort,
              (SELECT count(*) FROM products p WHERE p.is_active AND (p.category_id = c.id OR p.category_id IN (SELECT id FROM categories s WHERE s.parent_id = c.id)))::int AS count,
              (SELECT m.storage_key FROM products p JOIN product_images pi ON pi.product_id = p.id JOIN media_assets m ON m.id = pi.media_id
                WHERE p.category_id = c.id AND p.is_active ORDER BY p.sku, pi.sort LIMIT 1) AS image_key
         FROM categories c WHERE c.is_active ORDER BY c.sort, c.name_id`,
    )).rows.map((c) => ({ ...c, image: mediaUrl(c.image_key) }));
    const colors = (await tx.query(`SELECT DISTINCT color FROM products WHERE is_active AND color IS NOT NULL ORDER BY color`)).rows.map((r) => r.color as string);
    const materials = (await tx.query(
      `SELECT DISTINCT trim(split_part(material, ',', 1)) AS m FROM products WHERE is_active AND material IS NOT NULL ORDER BY 1`,
    )).rows.map((r) => r.m as string);
    return { categories: cats, colors, materials };
  });
}

export type Category = Awaited<ReturnType<typeof catalogFacets>>["categories"][number];

export async function getProductDetail(ctx: DbCtx | null, slugOrId: string, from?: string, to?: string) {
  const d = normalizeDates(from, to);
  return withTx(ctx, async (tx) => {
    const { rows } = await tx.query(
      `SELECT p.*, c.slug AS category_slug, c.name_id AS category_name_id, c.name_en AS category_name_en,
              b.owned, b.in_warehouse, b.checked_out, b.pending_inspection, b.damaged, b.under_repair, b.lost,
              sl.code AS location_code, sl.name AS location_name, w.name AS warehouse_name, w.code AS warehouse_code,
              EXISTS (SELECT 1 FROM favorites fv WHERE fv.product_id = p.id AND fv.user_id = $2::uuid) AS is_favorite
         FROM products p
         JOIN categories c ON c.id = p.category_id
         JOIN inventory_balances b ON b.product_id = p.id
         LEFT JOIN storage_locations sl ON sl.id = p.location_id
         LEFT JOIN warehouses w ON w.id = sl.warehouse_id
        WHERE (p.slug = $1 OR p.id::text = $1)`,
      [slugOrId, ctx?.userId ?? null],
    );
    const p = rows[0];
    if (!p) return null;
    const images = (await tx.query(
      `SELECT m.id, m.storage_key, m.alt_text FROM product_images pi JOIN media_assets m ON m.id = pi.media_id WHERE pi.product_id = $1 ORDER BY pi.sort`,
      [p.id],
    )).rows.map((m) => ({ id: m.id as string, url: mediaUrl(m.storage_key)!, alt: m.alt_text as string | null }));
    const a = (await getAvailability(tx, [p.id], d.from, d.to)).get(p.id)!;
    const calendarStart = d.from.slice(0, 8) + "01";
    const calendar = await getDailyAvailability(tx, p.id, calendarStart, 62);
    const related = (await tx.query(`SELECT id FROM products WHERE category_id = $1 AND id <> $2 AND is_active ORDER BY sku LIMIT 4`, [p.category_id, p.id])).rows.map((r) => r.id);
    return { product: p, images, availability: a, calendar, dates: d, relatedIds: related as string[] };
  });
}

export async function listCollections(ctx: DbCtx | null) {
  return withTx(ctx, async (tx) => {
    const { rows } = await tx.query(
      `SELECT co.id, co.slug, co.name, co.description, m.storage_key AS cover_key,
              (SELECT count(*) FROM collection_products cp WHERE cp.collection_id = co.id)::int AS count,
              (SELECT coalesce(array_agg(cp.product_id ORDER BY cp.sort), '{}') FROM collection_products cp WHERE cp.collection_id = co.id) AS product_ids,
              (SELECT array_agg(k ORDER BY s) FROM (SELECT m2.storage_key AS k, cp.sort AS s FROM collection_products cp
                 JOIN LATERAL (SELECT media_id FROM product_images WHERE product_id = cp.product_id ORDER BY sort LIMIT 1) pi ON true
                 JOIN media_assets m2 ON m2.id = pi.media_id WHERE cp.collection_id = co.id ORDER BY cp.sort LIMIT 4) x) AS preview_keys
         FROM collections co LEFT JOIN media_assets m ON m.id = co.cover_media_id
        WHERE co.kind = 'official' AND co.is_published ORDER BY co.sort, co.name`,
    );
    return rows.map((r) => ({ ...r, cover: mediaUrl(r.cover_key), previews: (r.preview_keys ?? []).map(mediaUrl) as string[] }));
  });
}
export type CollectionCard = Awaited<ReturnType<typeof listCollections>>[number];

export async function getCollection(ctx: DbCtx | null, slug: string) {
  return withTx(ctx, async (tx) => {
    const { rows } = await tx.query(
      `SELECT co.*, m.storage_key AS cover_key FROM collections co LEFT JOIN media_assets m ON m.id = co.cover_media_id
        WHERE co.slug = $1 AND ((co.kind = 'official' AND co.is_published) OR (co.kind = 'wishlist' AND co.owner_id = $2::uuid))
        ORDER BY (co.kind = 'official') DESC LIMIT 1`,
      [slug, ctx?.userId ?? null],
    );
    if (!rows[0]) return null;
    const ids = (await tx.query(`SELECT product_id FROM collection_products WHERE collection_id = $1 ORDER BY sort`, [rows[0].id])).rows.map((r) => r.product_id);
    return { ...rows[0], cover: mediaUrl(rows[0].cover_key), productIds: ids as string[] };
  });
}

export async function listWishlists(ctx: DbCtx) {
  return withTx(ctx, async (tx) => {
    const { rows } = await tx.query(
      `SELECT co.id, co.slug, co.name, (SELECT count(*) FROM collection_products cp WHERE cp.collection_id = co.id)::int AS count,
              (SELECT array_agg(product_id) FROM collection_products cp WHERE cp.collection_id = co.id) AS product_ids
         FROM collections co WHERE co.kind = 'wishlist' AND co.owner_id = $1 ORDER BY co.created_at`,
      [ctx.userId],
    );
    return rows.map((r) => ({ ...r, product_ids: (r.product_ids ?? []) as string[] }));
  });
}
