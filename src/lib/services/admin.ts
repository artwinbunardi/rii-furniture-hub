import { withTx, type Tx } from "../db";
import { AppError, ForbiddenError } from "../errors";
import { hasPerm, ROLES, PERMISSIONS } from "../rbac";
import { slugify } from "../utils";
import { randomToken, hashToken } from "../auth/crypto";
import { audit } from "./audit";
import { sendMail } from "./mail";
import type { Actor } from "./reservations";

function need(actor: Actor, perm: string) { if (!hasPerm(actor.perms, perm)) throw new ForbiddenError(); }
const pgUnique = (e: unknown) => (e as { code?: string })?.code === "23505";
const pgFk = (e: unknown) => (e as { code?: string })?.code === "23503";

/* ---------------------------------------------------------------- categories */
export type CategoryInput = { name_id: string; name_en: string; slug?: string; parent_id?: string; description?: string; sort?: number; is_active?: boolean };

export async function saveCategory(actor: Actor, id: string | null, c: CategoryInput) {
  need(actor, "category.manage");
  if (!c.name_id?.trim() || !c.name_en?.trim()) throw new AppError("Nama (ID dan EN) wajib diisi. / Both names are required.");
  const slug = slugify(c.slug || c.name_en);
  if (!slug) throw new AppError("Slug tidak valid. / Invalid slug.");
  if (id && c.parent_id === id) throw new AppError("Kategori tidak bisa menjadi induk dirinya sendiri. / A category cannot be its own parent.");
  try {
    return await withTx(actor.ctx, async (tx) => {
      if (c.parent_id) {
        const parent = (await tx.query(`SELECT parent_id FROM categories WHERE id = $1`, [c.parent_id])).rows[0];
        if (!parent) throw new AppError("Induk tidak ditemukan.");
        if (parent.parent_id) throw new AppError("Hanya dua tingkat kategori yang didukung. / Only two category levels are supported.");
      }
      const vals = [c.name_id.trim(), c.name_en.trim(), slug, c.parent_id || null, c.description || null, c.sort ?? 0, c.is_active !== false];
      const row = id
        ? (await tx.query(`UPDATE categories SET name_id=$2,name_en=$3,slug=$4,parent_id=$5,description=$6,sort=$7,is_active=$8 WHERE id=$1 RETURNING *`, [id, ...vals])).rows[0]
        : (await tx.query(`INSERT INTO categories(name_id,name_en,slug,parent_id,description,sort,is_active) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, vals)).rows[0];
      if (!row) throw new AppError("Kategori tidak ditemukan.");
      await audit(tx, actor.id, id ? "category.update" : "category.create", "category", row.id, `${id ? "Updated" : "Created"} category ${row.name_en}`);
      return row;
    });
  } catch (e) {
    if (pgUnique(e)) throw new AppError(`Slug "${slug}" sudah dipakai. / Slug already in use.`);
    throw e;
  }
}

export async function deleteCategory(actor: Actor, id: string) {
  need(actor, "category.manage");
  try {
    await withTx(actor.ctx, async (tx) => {
      const r = (await tx.query(`DELETE FROM categories WHERE id = $1 RETURNING name_en`, [id])).rows[0];
      if (!r) throw new AppError("Kategori tidak ditemukan.");
      await audit(tx, actor.id, "category.delete", "category", id, `Deleted category ${r.name_en}`);
    });
  } catch (e) {
    if (pgFk(e)) throw new AppError("Kategori masih dipakai produk atau subkategori. Nonaktifkan saja. / Category is still used by products or subcategories — deactivate it instead.");
    throw e;
  }
}

/* --------------------------------------------------------------- collections */
export type CollectionInput = { name: string; slug?: string; description?: string; is_published?: boolean; sort?: number; cover_media_id?: string; product_ids?: string[] };

export async function saveCollection(actor: Actor, id: string | null, c: CollectionInput) {
  need(actor, "category.manage");
  if (!c.name?.trim()) throw new AppError("Nama wajib diisi. / Name is required.");
  const slug = slugify(c.slug || c.name);
  try {
    return await withTx(actor.ctx, async (tx) => {
      const vals = [c.name.trim(), slug, c.description || null, c.is_published !== false, c.sort ?? 0, c.cover_media_id || null];
      const row = id
        ? (await tx.query(`UPDATE collections SET name=$2,slug=$3,description=$4,is_published=$5,sort=$6,cover_media_id=$7 WHERE id=$1 AND kind='official' RETURNING *`, [id, ...vals])).rows[0]
        : (await tx.query(`INSERT INTO collections(name,slug,description,is_published,sort,cover_media_id,kind) VALUES ($1,$2,$3,$4,$5,$6,'official') RETURNING *`, vals)).rows[0];
      if (!row) throw new AppError("Koleksi tidak ditemukan.");
      if (c.product_ids) {
        await tx.query(`DELETE FROM collection_products WHERE collection_id = $1`, [row.id]);
        const ids = [...new Set(c.product_ids)];
        if (ids.length) await tx.query(`INSERT INTO collection_products(collection_id, product_id, sort) SELECT $1, x, ord FROM unnest($2::uuid[]) WITH ORDINALITY AS t(x, ord)`, [row.id, ids]);
      }
      await audit(tx, actor.id, id ? "collection.update" : "collection.create", "collection", row.id, `${id ? "Updated" : "Created"} collection ${row.name} (${c.product_ids?.length ?? "–"} products)`);
      return row;
    });
  } catch (e) {
    if (pgUnique(e)) throw new AppError(`Slug "${slug}" sudah dipakai. / Slug already in use.`);
    throw e;
  }
}

export async function deleteCollection(actor: Actor, id: string) {
  need(actor, "category.manage");
  await withTx(actor.ctx, async (tx) => {
    const r = (await tx.query(`DELETE FROM collections WHERE id = $1 AND kind = 'official' RETURNING name`, [id])).rows[0];
    if (!r) throw new AppError("Koleksi tidak ditemukan.");
    await audit(tx, actor.id, "collection.delete", "collection", id, `Deleted collection ${r.name}`);
  });
}

/* ----------------------------------------------------------------- locations */
export async function saveWarehouse(actor: Actor, id: string | null, w: { code: string; name: string; address?: string }) {
  need(actor, "location.manage");
  const code = w.code?.trim().toUpperCase();
  if (!code || !/^[A-Z0-9-]{2,20}$/.test(code)) throw new AppError("Kode gudang 2–20 karakter (A-Z, 0-9, -). / Warehouse code: 2–20 chars.");
  if (!w.name?.trim()) throw new AppError("Nama wajib diisi. / Name is required.");
  try {
    return await withTx(actor.ctx, async (tx) => {
      const row = id
        ? (await tx.query(`UPDATE warehouses SET code=$2,name=$3,address=$4 WHERE id=$1 RETURNING *`, [id, code, w.name.trim(), w.address || null])).rows[0]
        : (await tx.query(`INSERT INTO warehouses(code,name,address) VALUES ($1,$2,$3) RETURNING *`, [code, w.name.trim(), w.address || null])).rows[0];
      await audit(tx, actor.id, id ? "warehouse.update" : "warehouse.create", "warehouse", row.id, `${id ? "Updated" : "Created"} warehouse ${code}`);
      return row;
    });
  } catch (e) { if (pgUnique(e)) throw new AppError(`Kode ${code} sudah dipakai. / Code already in use.`); throw e; }
}

export async function saveLocation(actor: Actor, id: string | null, l: { warehouse_id: string; code: string; name: string; is_active?: boolean }) {
  need(actor, "location.manage");
  const code = l.code?.trim().toUpperCase();
  if (!code || !/^[A-Z0-9-]{1,20}$/.test(code)) throw new AppError("Kode lokasi tidak valid. / Invalid location code.");
  if (!l.warehouse_id) throw new AppError("Pilih gudang. / Choose a warehouse.");
  try {
    return await withTx(actor.ctx, async (tx) => {
      const row = id
        ? (await tx.query(`UPDATE storage_locations SET warehouse_id=$2,code=$3,name=$4,is_active=$5 WHERE id=$1 RETURNING *`, [id, l.warehouse_id, code, l.name?.trim() || code, l.is_active !== false])).rows[0]
        : (await tx.query(`INSERT INTO storage_locations(warehouse_id,code,name) VALUES ($1,$2,$3) RETURNING *`, [l.warehouse_id, code, l.name?.trim() || code])).rows[0];
      await audit(tx, actor.id, id ? "location.update" : "location.create", "storage_location", row.id, `${id ? "Updated" : "Created"} location ${code}`);
      return row;
    });
  } catch (e) { if (pgUnique(e)) throw new AppError(`Lokasi ${code} sudah ada di gudang ini. / Location already exists in this warehouse.`); throw e; }
}

export async function deleteLocation(actor: Actor, id: string) {
  need(actor, "location.manage");
  await withTx(actor.ctx, async (tx) => {
    const used = (await tx.query(`SELECT count(*)::int AS n FROM products WHERE location_id = $1`, [id])).rows[0].n;
    if (used) throw new AppError(`Lokasi masih dipakai ${used} produk. Pindahkan dulu atau nonaktifkan. / Location still holds ${used} products.`);
    const r = (await tx.query(`DELETE FROM storage_locations WHERE id = $1 RETURNING code`, [id])).rows[0];
    if (!r) throw new AppError("Lokasi tidak ditemukan.");
    await audit(tx, actor.id, "location.delete", "storage_location", id, `Deleted location ${r.code}`);
  });
}

/* --------------------------------------------------------------------- users */
const ROLE_CODES = ROLES.map((r) => r.code as string);

async function countActiveAdmins(tx: Tx, excludeUser?: string) {
  return (await tx.query(`SELECT count(DISTINCT u.id)::int AS n FROM users u JOIN user_roles ur ON ur.user_id = u.id
    WHERE ur.role_code = 'admin' AND u.status = 'active' AND u.id IS DISTINCT FROM $1`, [excludeUser ?? null])).rows[0].n as number;
}

export async function inviteUser(actor: Actor, u: { email: string; name: string; department?: string; roles: string[]; locale?: string }) {
  need(actor, "users.manage");
  const email = u.email?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new AppError("Email tidak valid. / Invalid email.");
  if (!u.name?.trim()) throw new AppError("Nama wajib diisi. / Name is required.");
  const roles = u.roles.filter((r) => ROLE_CODES.includes(r));
  if (!roles.length) throw new AppError("Pilih minimal satu peran. / Choose at least one role.");
  const token = randomToken();
  try {
    const user = await withTx(actor.ctx, async (tx) => {
      const row = (await tx.query(`INSERT INTO users(email,name,department,status,locale) VALUES ($1,$2,$3,'invited',$4) RETURNING id, email::text, name`,
        [email, u.name.trim(), u.department || null, u.locale === "en" ? "en" : "id"])).rows[0];
      for (const r of roles) await tx.query(`INSERT INTO user_roles VALUES ($1,$2)`, [row.id, r]);
      await tx.query(`INSERT INTO auth_tokens(user_id,kind,token_hash,expires_at,created_by) VALUES ($1,'invite',$2, now() + interval '7 days',$3)`, [row.id, hashToken(token), actor.id]);
      await audit(tx, actor.id, "user.invite", "user", row.id, `Invited ${email} as ${roles.join(", ")}`);
      return row;
    });
    const link = `${process.env.APP_URL ?? "http://localhost:3000"}/invite?token=${token}`;
    await sendMail(email, "Undangan ke RII Furniture Hub", `Halo ${user.name},\n\nAnda diundang ke RII Furniture Hub. Klik tautan berikut untuk membuat kata sandi (berlaku 7 hari):\n${link}`, link);
    return { user, link };
  } catch (e) { if (pgUnique(e)) throw new AppError("Email sudah terdaftar. / Email already registered."); throw e; }
}

export async function resendInvite(actor: Actor, userId: string) {
  need(actor, "users.manage");
  const token = randomToken();
  const user = await withTx(actor.ctx, async (tx) => {
    const u = (await tx.query(`SELECT id, email::text, name, status FROM users WHERE id = $1`, [userId])).rows[0];
    if (!u || u.status !== "invited") throw new AppError("Pengguna tidak dalam status diundang. / User is not in invited state.");
    await tx.query(`UPDATE auth_tokens SET used_at = now() WHERE user_id = $1 AND kind = 'invite' AND used_at IS NULL`, [userId]);
    await tx.query(`INSERT INTO auth_tokens(user_id,kind,token_hash,expires_at,created_by) VALUES ($1,'invite',$2, now() + interval '7 days',$3)`, [userId, hashToken(token), actor.id]);
    await audit(tx, actor.id, "user.invite_resend", "user", userId, `Re-sent invitation to ${u.email}`);
    return u;
  });
  const link = `${process.env.APP_URL ?? "http://localhost:3000"}/invite?token=${token}`;
  await sendMail(user.email, "Undangan ke RII Furniture Hub", `Halo ${user.name},\n\nTautan undangan baru Anda (berlaku 7 hari):\n${link}`, link);
  return { link };
}

export async function updateUser(actor: Actor, userId: string, u: { name: string; department?: string; roles: string[]; status: string }) {
  need(actor, "users.manage");
  const roles = u.roles.filter((r) => ROLE_CODES.includes(r));
  if (!roles.length) throw new AppError("Pilih minimal satu peran. / Choose at least one role.");
  if (!["active", "disabled", "invited"].includes(u.status)) throw new AppError("Status tidak valid.");
  return withTx(actor.ctx, async (tx) => {
    // serialise role/status changes so two admins cannot remove each other's admin role concurrently
    await tx.query(`SELECT pg_advisory_xact_lock(hashtext('rii.user_roles'))`);
    const before = (await tx.query(`SELECT u.id, u.email::text, u.name, u.department, u.status,
        (SELECT array_agg(ur.role_code ORDER BY ur.role_code) FROM user_roles ur WHERE ur.user_id = u.id) AS roles
      FROM users u WHERE u.id = $1 FOR UPDATE`, [userId])).rows[0];
    if (!before) throw new AppError("Pengguna tidak ditemukan.");
    if (before.status === "invited" && u.status === "active") throw new AppError("Pengguna yang diundang menjadi aktif setelah menerima undangan. / Invited users become active by accepting the invitation.");
    const losesAdmin = (before.roles ?? []).includes("admin") && (!roles.includes("admin") || u.status !== "active");
    if (losesAdmin && (await countActiveAdmins(tx, userId)) === 0) throw new AppError("Harus ada minimal satu administrator aktif. / At least one active administrator must remain.");
    if (userId === actor.id && u.status === "disabled") throw new AppError("Anda tidak dapat menonaktifkan akun sendiri. / You cannot disable your own account.");
    await tx.query(`UPDATE users SET name=$2, department=$3, status=$4, updated_at=now() WHERE id=$1`, [userId, u.name.trim() || before.name, u.department || null, u.status]);
    await tx.query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);
    for (const r of roles) await tx.query(`INSERT INTO user_roles VALUES ($1,$2)`, [userId, r]);
    if (u.status === "disabled") await tx.query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
    await audit(tx, actor.id, "user.update", "user", userId, `Updated ${before.email}: roles ${roles.join(", ")}, status ${u.status}`, before, { ...u, roles });
  });
}

export async function setRolePermission(actor: Actor, role: string, perm: string, on: boolean) {
  need(actor, "users.manage");
  if (!ROLE_CODES.includes(role) || !(perm in PERMISSIONS)) throw new AppError("Peran/izin tidak valid.");
  if (role === "admin") throw new AppError("Administrator selalu memiliki semua izin. / Administrators always have every permission.");
  await withTx(actor.ctx, async (tx) => {
    if (on) await tx.query(`INSERT INTO role_permissions VALUES ($1,$2) ON CONFLICT DO NOTHING`, [role, perm]);
    else await tx.query(`DELETE FROM role_permissions WHERE role_code = $1 AND permission_code = $2`, [role, perm]);
    await audit(tx, actor.id, on ? "role.grant" : "role.revoke", "role", role, `${on ? "Granted" : "Revoked"} ${perm} ${on ? "to" : "from"} ${role}`);
  });
}

/* ------------------------------------------------------------------ settings */
export const SETTINGS_SCHEMA: Record<string, { type: "int" | "number" | "text" | "bool" | "select"; min?: number; max?: number; options?: string[]; label: [string, string]; hint?: [string, string] }> = {
  company_name: { type: "text", label: ["Nama perusahaan", "Company name"] },
  turnaround_days: { type: "int", min: 0, max: 14, label: ["Buffer perawatan antar reservasi (hari)", "Turnaround buffer between reservations (days)"], hint: ["Hari setelah tanggal kembali saat barang belum dapat dipesan (pembersihan/inspeksi). Bisa diganti per produk.", "Days after the return date during which items stay unavailable (cleaning/inspection). Can be overridden per product."] },
  low_availability_threshold: { type: "number", min: 0, max: 1, label: ["Ambang ketersediaan rendah (0–1)", "Low-availability threshold (0–1)"], hint: ["Produk ditandai 'hampir habis' bila tersedia/usable di bawah nilai ini.", "Products are flagged when available/usable falls below this ratio."] },
  default_locale: { type: "select", options: ["id", "en"], label: ["Bahasa bawaan", "Default language"] },
  require_reservation_approval: { type: "bool", label: ["Reservasi memerlukan persetujuan manajer", "Reservations require manager approval"], hint: ["Selalu aktif: menonaktifkan persetujuan tidak didukung pada versi ini.", "Always on: disabling approval is not supported in this version."] },
};

export async function saveSettings(actor: Actor, values: Record<string, string | boolean>) {
  need(actor, "settings.manage");
  await withTx(actor.ctx, async (tx) => {
    for (const [key, def] of Object.entries(SETTINGS_SCHEMA)) {
      if (!(key in values)) continue;
      const raw = values[key];
      let v: unknown;
      if (def.type === "bool") v = raw === true || raw === "on" || raw === "true";
      else if (def.type === "int" || def.type === "number") {
        v = Number(raw);
        if (!Number.isFinite(v as number) || (def.type === "int" && !Number.isInteger(v)) || (def.min !== undefined && (v as number) < def.min) || (def.max !== undefined && (v as number) > def.max))
          throw new AppError(`${def.label[0]}: nilai tidak valid (${def.min}–${def.max}). / Invalid value.`);
      } else if (def.type === "select") { if (!def.options!.includes(String(raw))) throw new AppError("Pilihan tidak valid."); v = String(raw); }
      else { v = String(raw).trim().slice(0, 200); if (!v) throw new AppError(`${def.label[0]} wajib diisi.`); }
      if (key === "require_reservation_approval") v = true;
      const before = (await tx.query(`SELECT value FROM app_settings WHERE key = $1`, [key])).rows[0]?.value;
      if (JSON.stringify(before) === JSON.stringify(v)) continue;
      await tx.query(`INSERT INTO app_settings(key,value,updated_by,updated_at) VALUES ($1,$2,$3,now()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_by=EXCLUDED.updated_by, updated_at=now()`, [key, JSON.stringify(v), actor.id]);
      await audit(tx, actor.id, "settings.update", "setting", key, `Changed ${key}: ${JSON.stringify(before)} → ${JSON.stringify(v)}`, before, v);
    }
  });
}
