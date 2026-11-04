import { requireUser } from "@/lib/auth/session";
import { getLang } from "@/lib/i18n/server";
import { q, q1 } from "@/lib/db";
import { hasPerm } from "@/lib/rbac";
import { getDraft } from "@/lib/services/website";
import { validateSnapshot } from "@/lib/site/validate";
import { EditorClient } from "@/components/builder/editor-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Visual editor" };

export default async function EditorPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requireUser("website.edit");
  const [lang, sp, { snapshot, meta }] = await Promise.all([getLang(), searchParams, getDraft(user.ctx)]);
  const [media, cats, cols, prod, res] = await Promise.all([
    q(user.ctx, `SELECT id, filename AS name, storage_key, category, folder, alt_text AS alt FROM media_assets WHERE mime_type LIKE 'image/%' ORDER BY (category = 'banner') DESC, created_at DESC LIMIT 400`),
    q(user.ctx, `SELECT slug, name_id, name_en FROM categories WHERE is_active ORDER BY sort, name_id`),
    q(user.ctx, `SELECT slug, name FROM collections WHERE kind = 'official' ORDER BY sort, name`),
    q1(user.ctx, `SELECT slug FROM products WHERE is_active ORDER BY sku LIMIT 1`),
    q1(user.ctx, `SELECT id FROM reservations WHERE requester_id = $1 AND NOT is_cart AND status <> 'draft' ORDER BY created_at DESC LIMIT 1`, [user.id]),
  ]);
  return (
    <EditorClient
      initial={validateSnapshot(snapshot)} rev={meta.rev} lang={lang} initialPage={sp.page}
      canPublish={hasPerm(user.perms, "website.publish")} canUpload={hasPerm(user.perms, "media.manage")}
      media={media.map((m) => ({ id: m.id, url: `/media/${m.storage_key}`, name: m.name, category: m.category, folder: m.folder, alt: m.alt }))}
      categories={cats.map((c) => ({ slug: c.slug, name: lang === "en" ? c.name_en : c.name_id }))}
      collections={cols.map((c) => ({ slug: c.slug, name: c.name }))}
      sample={{ product: prod?.slug, collection: cols[0]?.slug, reservation: res?.id }}
      published={{ versionNo: meta.publishedVersionNo, changed: meta.changedSincePublish }}
    />
  );
}
