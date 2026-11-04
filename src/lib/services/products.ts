import { withTx } from "../db";
import { AppError, ForbiddenError } from "../errors";
import { hasPerm } from "../rbac";
import { slugify } from "../utils";
import { audit } from "./audit";
import { moveStock } from "./inventory";
import type { Actor } from "./reservations";

export type ProductInput = {
  sku: string; name: string; category_id: string; description?: string | null;
  length_cm?: number | null; width_cm?: number | null; height_cm?: number | null; weight_kg?: number | null;
  color?: string | null; material?: string | null; condition_grade?: string; location_id?: string | null;
  min_stock?: number; turnaround_days?: number | null; track_units?: boolean; is_active?: boolean;
};

function validate(p: ProductInput) {
  if (!/^[A-Z0-9][A-Z0-9-]{1,30}$/.test(p.sku)) throw new AppError("SKU hanya huruf besar, angka dan tanda hubung (2–31 karakter). / SKU: uppercase letters, digits, dashes.");
  if (!p.name || p.name.trim().length < 2) throw new AppError("Nama produk wajib diisi. / Product name is required.");
  if (!p.category_id) throw new AppError("Kategori wajib dipilih. / Category is required.");
  for (const [k, v] of Object.entries({ length_cm: p.length_cm, width_cm: p.width_cm, height_cm: p.height_cm, weight_kg: p.weight_kg }))
    if (v != null && (Number.isNaN(v) || v < 0)) throw new AppError(`${k} tidak valid.`);
  if (p.min_stock != null && (!Number.isInteger(p.min_stock) || p.min_stock < 0)) throw new AppError("Stok minimum tidak valid.");
  if (p.condition_grade && !["new", "excellent", "good", "fair"].includes(p.condition_grade)) throw new AppError("Kondisi tidak valid.");
}

export async function createProduct(actor: Actor, p: ProductInput, initialQty: number) {
  if (!hasPerm(actor.perms, "product.manage")) throw new ForbiddenError();
  validate(p);
  if (!Number.isInteger(initialQty) || initialQty < 0) throw new AppError("Stok awal tidak valid. / Invalid initial stock.");
  return withTx(actor.ctx, async (tx) => {
    let slug = `${p.sku.toLowerCase()}-${slugify(p.name)}`;
    if ((await tx.query(`SELECT 1 FROM products WHERE slug = $1`, [slug])).rowCount) slug += "-" + Date.now().toString(36);
    const { rows } = await tx.query(
      `INSERT INTO products(sku,slug,name,category_id,description,length_cm,width_cm,height_cm,weight_kg,color,material,condition_grade,location_id,min_stock,turnaround_days,track_units,is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [p.sku, slug, p.name.trim(), p.category_id, p.description || null, p.length_cm ?? null, p.width_cm ?? null, p.height_cm ?? null, p.weight_kg ?? null,
       p.color || null, p.material || null, p.condition_grade || "good", p.location_id || null, p.min_stock ?? 0, p.turnaround_days ?? null, !!p.track_units, p.is_active !== false],
    );
    const prod = rows[0];
    await tx.query(`INSERT INTO inventory_balances(product_id) VALUES ($1)`, [prod.id]);
    if (initialQty > 0) await moveStock(tx, actor, { productId: prod.id, type: "initial", qty: initialQty, from: "external", to: "in_warehouse", reason: "Registrasi stok awal / Initial stock registration", approvedBy: actor.id });
    await audit(tx, actor.id, "product.create", "product", prod.id, `Created ${p.sku} with ${initialQty} units`, null, prod);
    return prod;
  });
}

export async function updateProduct(actor: Actor, id: string, p: ProductInput) {
  if (!hasPerm(actor.perms, "product.manage")) throw new ForbiddenError();
  validate(p);
  return withTx(actor.ctx, async (tx) => {
    const before = (await tx.query(`SELECT * FROM products WHERE id = $1 FOR UPDATE`, [id])).rows[0];
    if (!before) throw new AppError("Produk tidak ditemukan.");
    const { rows } = await tx.query(
      `UPDATE products SET sku=$2, name=$3, category_id=$4, description=$5, length_cm=$6, width_cm=$7, height_cm=$8, weight_kg=$9, color=$10, material=$11,
              condition_grade=$12, location_id=$13, min_stock=$14, turnaround_days=$15, track_units=$16, is_active=$17, updated_at=now() WHERE id=$1 RETURNING *`,
      [id, p.sku, p.name.trim(), p.category_id, p.description || null, p.length_cm ?? null, p.width_cm ?? null, p.height_cm ?? null, p.weight_kg ?? null,
       p.color || null, p.material || null, p.condition_grade || "good", p.location_id || null, p.min_stock ?? 0, p.turnaround_days ?? null, !!p.track_units, p.is_active !== false],
    );
    await audit(tx, actor.id, "product.update", "product", id, `Updated ${p.sku}`, before, rows[0]);
    return rows[0];
  });
}

export async function relocateProduct(actor: Actor, id: string, locationId: string | null, reason: string) {
  if (!hasPerm(actor.perms, "warehouse.relocate") && !hasPerm(actor.perms, "product.manage")) throw new ForbiddenError();
  return withTx(actor.ctx, async (tx) => {
    const before = (await tx.query(`SELECT p.id, p.sku, p.location_id, sl.code FROM products p LEFT JOIN storage_locations sl ON sl.id = p.location_id WHERE p.id = $1 FOR UPDATE OF p`, [id])).rows[0];
    if (!before) throw new AppError("Produk tidak ditemukan.");
    const loc = locationId ? (await tx.query(`SELECT code FROM storage_locations WHERE id = $1 AND is_active`, [locationId])).rows[0] : null;
    if (locationId && !loc) throw new AppError("Lokasi tidak valid.");
    await tx.query(`UPDATE products SET location_id = $2, updated_at = now() WHERE id = $1`, [id, locationId]);
    await audit(tx, actor.id, "product.relocate", "product", id, `${before.sku}: ${before.code ?? "—"} → ${loc?.code ?? "—"}${reason ? ` (${reason})` : ""}`, { location: before.code }, { location: loc?.code });
  });
}

export async function addProductImages(actor: Actor, productId: string, mediaIds: string[]) {
  if (!hasPerm(actor.perms, "product.manage")) throw new ForbiddenError();
  return withTx(actor.ctx, async (tx) => {
    const max = (await tx.query(`SELECT coalesce(max(sort), -1) AS m FROM product_images WHERE product_id = $1`, [productId])).rows[0].m;
    let i = max + 1;
    for (const m of mediaIds) await tx.query(`INSERT INTO product_images(product_id, media_id, sort) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [productId, m, i++]);
    await audit(tx, actor.id, "product.images_add", "product", productId, `Added ${mediaIds.length} image(s)`);
  });
}

export async function removeProductImage(actor: Actor, productId: string, mediaId: string) {
  if (!hasPerm(actor.perms, "product.manage")) throw new ForbiddenError();
  return withTx(actor.ctx, async (tx) => {
    await tx.query(`DELETE FROM product_images WHERE product_id = $1 AND media_id = $2`, [productId, mediaId]);
    await audit(tx, actor.id, "product.images_remove", "product", productId, `Removed image ${mediaId}`);
  });
}

export async function moveProductImage(actor: Actor, productId: string, mediaId: string, dir: -1 | 1) {
  if (!hasPerm(actor.perms, "product.manage")) throw new ForbiddenError();
  return withTx(actor.ctx, async (tx) => {
    const list = (await tx.query(`SELECT media_id FROM product_images WHERE product_id = $1 ORDER BY sort, media_id`, [productId])).rows.map((r) => r.media_id as string);
    const i = list.indexOf(mediaId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    for (let k = 0; k < list.length; k++) await tx.query(`UPDATE product_images SET sort = $3 WHERE product_id = $1 AND media_id = $2`, [productId, list[k], k]);
  });
}
