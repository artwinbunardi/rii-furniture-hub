import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { q, q1 } from "@/lib/db";
import { PageHeader, Card } from "@/components/ui/misc";
import { CollectionForm } from "../collection-form";
import { collectionFormData } from "../data";

export const metadata = { title: "Collection" };
export default async function EditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("category.manage");
  const { t, lang } = await getT();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const c = await q1(user.ctx, `SELECT id, name, slug, description, is_published, sort, cover_media_id FROM collections WHERE id = $1 AND kind = 'official'`, [id]);
  if (!c) notFound();
  const [sel, { products, media }] = await Promise.all([
    q(user.ctx, `SELECT product_id FROM collection_products WHERE collection_id = $1 ORDER BY sort`, [id]),
    collectionFormData(user.ctx),
  ]);
  return (
    <>
      <PageHeader breadcrumb={<Link href="/app/collections" className="hover:text-ink">{t("nav_collections")}</Link>} title={c.name}
        actions={c.is_published ? <Link href={`/collections/${c.slug}`} className="text-sm text-ink-500 hover:text-ink" target="_blank">{lang === "en" ? "View on website ↗" : "Lihat di website ↗"}</Link> : null} />
      <Card className="max-w-3xl p-5"><CollectionForm lang={lang} collection={c} selected={sel.map((s) => s.product_id)} products={products} media={media} /></Card>
    </>
  );
}
