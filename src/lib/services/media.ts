import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { withTx, type Tx } from "../db";
import { AppError, ForbiddenError } from "../errors";
import { hasPerm } from "../rbac";
import type { Actor } from "./reservations";

const ALLOWED: Record<string, string> = { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif", "image/svg+xml": ".svg", "image/x-icon": ".ico", "image/vnd.microsoft.icon": ".ico" };
const MAX = 8 * 1024 * 1024;
const CATS = ["product", "banner", "logo", "favicon", "general", "gallery"];

function uploadRoot() {
  return path.resolve(process.env.UPLOAD_DIR ?? "./storage/uploads");
}

/** Storage adapter: local disk. Swap for S3 / Supabase Storage by reimplementing put/remove. */
export const storage = {
  async put(key: string, data: Buffer) {
    const file = path.join(uploadRoot(), key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, data);
  },
  async remove(key: string) {
    await fs.rm(path.join(uploadRoot(), key), { force: true });
  },
};

function sniff(buf: Buffer, declared: string) {
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  if (buf.subarray(0, 3).toString() === "GIF") return "image/gif";
  if (buf[0] === 0 && buf[1] === 0 && buf[2] === 1 && buf[3] === 0) return "image/x-icon";
  const head = buf.subarray(0, 512).toString("utf8").trim().toLowerCase();
  if (declared === "image/svg+xml" && (head.startsWith("<svg") || head.startsWith("<?xml"))) {
    if (/<script|on\w+\s*=|javascript:/i.test(buf.toString("utf8"))) throw new AppError("SVG berisi skrip tidak diizinkan. / SVG with scripts is not allowed.");
    return "image/svg+xml";
  }
  return null;
}

async function readChecked(file: File) {
  if (!file || file.size === 0) throw new AppError("File kosong. / Empty file.");
  if (file.size > MAX) throw new AppError("Ukuran file maksimal 8 MB. / Max file size is 8 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniff(buf, file.type);
  if (!mime || !ALLOWED[mime]) throw new AppError("Format tidak didukung (PNG, JPG, WEBP, GIF, SVG, ICO). / Unsupported format.");
  return { buf, mime };
}

export async function saveUpload(tx: Tx, actor: Actor, file: File, category = "general", alt?: string, folder?: string) {
  if (!hasPerm(actor.perms, "media.manage") && !hasPerm(actor.perms, "product.manage")) throw new ForbiddenError();
  const { buf, mime } = await readChecked(file);
  const key = `uploads/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}${ALLOWED[mime]}`;
  await storage.put(key, buf);
  const cat = CATS.includes(category) ? category : "general";
  const { rows } = await tx.query(
    `INSERT INTO media_assets(filename, storage_key, mime_type, size_bytes, category, alt_text, uploaded_by, folder) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [file.name.slice(0, 200), key, mime, buf.length, cat, alt ?? null, actor.id, folder?.slice(0, 60) || null],
  );
  return rows[0];
}

/**
 * Replace a file but keep the media id. Same format → bytes are overwritten under the same key, so
 * every URL (products, collections, website drafts AND published versions) keeps working.
 * Different format → new key; website draft references are rewritten and the old file is kept
 * because published website versions may still point to it.
 */
export async function replaceMedia(actor: Actor, mediaId: string, file: File) {
  if (!hasPerm(actor.perms, "media.manage") && !hasPerm(actor.perms, "product.manage")) throw new ForbiddenError();
  const { buf, mime } = await readChecked(file);
  return withTx(actor.ctx, async (tx) => {
    const old = (await tx.query(`SELECT * FROM media_assets WHERE id = $1 FOR UPDATE`, [mediaId])).rows[0];
    if (!old) throw new AppError("Media tidak ditemukan.");
    let key = old.storage_key as string;
    if (path.extname(key).toLowerCase() === ALLOWED[mime]) {
      await storage.put(key, buf);
    } else {
      key = `uploads/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}${ALLOWED[mime]}`;
      await storage.put(key, buf);
      const from = `/media/${old.storage_key}`, to = `/media/${key}`;
      await tx.query(`UPDATE website_sections SET props = replace(props::text, $1, $2)::jsonb WHERE props::text LIKE '%' || $1 || '%'`, [from, to]);
      await tx.query(`UPDATE website_themes SET theme = replace(theme::text, $1, $2)::jsonb WHERE theme::text LIKE '%' || $1 || '%'`, [from, to]);
    }
    await tx.query(`UPDATE media_assets SET storage_key = $2, mime_type = $3, size_bytes = $4, filename = $5, updated_at = now() WHERE id = $1`, [mediaId, key, mime, buf.length, file.name.slice(0, 200)]);
    return { ...old, storage_key: key };
  });
}

export async function deleteMedia(actor: Actor, mediaId: string) {
  if (!hasPerm(actor.perms, "media.manage")) throw new ForbiddenError();
  return withTx(actor.ctx, async (tx) => {
    const m = (await tx.query(`SELECT * FROM media_assets WHERE id = $1`, [mediaId])).rows[0];
    if (!m) return;
    const used = (await tx.query(`SELECT (SELECT count(*) FROM product_images WHERE media_id = $1) + (SELECT count(*) FROM collections WHERE cover_media_id = $1) AS n`, [mediaId])).rows[0].n;
    if (Number(used) > 0) throw new AppError("Media masih digunakan oleh produk/koleksi. / Media is still used by products or collections.");
    const url = `%/media/${m.storage_key}%`;
    const site = (await tx.query(`SELECT (SELECT count(*) FROM website_sections WHERE props::text LIKE $1) + (SELECT count(*) FROM website_themes WHERE theme::text LIKE $1)
        + (SELECT count(*) FROM websites w JOIN website_versions v ON v.id = w.published_version_id WHERE v.snapshot::text LIKE $1) AS n`, [url])).rows[0].n;
    if (Number(site) > 0) throw new AppError("Media dipakai di website (draf atau versi yang terbit). Hapus dari halaman lalu publikasikan dulu. / Media is used on the website (draft or live).");
    await tx.query(`DELETE FROM media_assets WHERE id = $1`, [mediaId]);
    if (!m.is_demo) await storage.remove(m.storage_key).catch(() => {});
  });
}
