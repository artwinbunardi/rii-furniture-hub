import { requireUser } from "@/lib/auth/session";
import { getLang } from "@/lib/i18n/server";
import { q, q1 } from "@/lib/db";
import { PageHeader } from "@/components/ui/misc";
import { MediaLibrary } from "./library";

export const dynamic = "force-dynamic";
export const metadata = { title: "Media Library" };
const PER = 48;

export default async function MediaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("media.manage");
  const [lang, sp] = await Promise.all([getLang(), searchParams]);
  const where: string[] = [], args: unknown[] = [];
  if (sp.q) { args.push(`%${sp.q}%`); where.push(`(m.filename ILIKE $${args.length} OR m.alt_text ILIKE $${args.length})`); }
  if (sp.category) { args.push(sp.category); where.push(`m.category = $${args.length}`); }
  if (sp.folder) { args.push(sp.folder); where.push(`m.folder = $${args.length}`); }
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const [rows, total, folders, counts] = await Promise.all([
    q(user.ctx, `SELECT m.id, m.filename, m.storage_key, m.mime_type, m.size_bytes, m.category, m.folder, m.alt_text, m.is_demo, m.created_at, u.name AS uploader,
        (SELECT count(*)::int FROM product_images pi WHERE pi.media_id = m.id) AS product_uses,
        (SELECT count(*)::int FROM website_sections s WHERE s.props::text LIKE '%/media/' || m.storage_key || '%')
          + (SELECT count(*)::int FROM website_themes t WHERE t.theme::text LIKE '%/media/' || m.storage_key || '%') AS site_uses
      FROM media_assets m LEFT JOIN users u ON u.id = m.uploaded_by ${w} ORDER BY m.created_at DESC, m.filename LIMIT ${PER} OFFSET ${(page - 1) * PER}`, args),
    q1(user.ctx, `SELECT count(*)::int AS n FROM media_assets m ${w}`, args),
    q(user.ctx, `SELECT folder, count(*)::int AS n FROM media_assets WHERE folder IS NOT NULL GROUP BY folder ORDER BY folder`),
    q(user.ctx, `SELECT category, count(*)::int AS n FROM media_assets GROUP BY category ORDER BY category`),
  ]);
  return (
    <>
      <PageHeader title={lang === "en" ? "Media Library" : "Pustaka Media"} subtitle={lang === "en" ? "Images for the website and products, stored once and shared. Replacing a file keeps every page and product that uses it working." : "Gambar untuk website dan produk, disimpan sekali dan dipakai bersama. Mengganti file tetap menjaga semua halaman dan produk yang memakainya."} />
      <MediaLibrary lang={lang} total={total?.n ?? 0} page={page} per={PER} sp={sp} folders={folders as any} counts={counts as any}
        items={rows.map((r) => ({ id: r.id, name: r.filename, url: `/media/${r.storage_key}`, mime: r.mime_type, size: r.size_bytes, category: r.category, folder: r.folder, alt: r.alt_text, demo: r.is_demo, uploader: r.uploader, created: r.created_at.toISOString(), productUses: r.product_uses, siteUses: r.site_uses }))} />
    </>
  );
}
