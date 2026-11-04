import Link from "next/link";
import { Plus, LayoutGrid } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { q } from "@/lib/db";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui/misc";
import { LinkButton } from "@/components/ui/button";

export const metadata = { title: "Collections" };
export default async function CollectionsAdminPage() {
  const user = await requireUser("category.manage");
  const { t, lang } = await getT();
  const en = lang === "en";
  const rows = await q(user.ctx, `SELECT c.*, (SELECT count(*)::int FROM collection_products cp WHERE cp.collection_id = c.id) AS n,
      (SELECT array_agg(k) FROM (SELECT m.storage_key k FROM collection_products cp JOIN LATERAL (SELECT media_id FROM product_images WHERE product_id = cp.product_id ORDER BY sort LIMIT 1) pi ON true
        JOIN media_assets m ON m.id = pi.media_id WHERE cp.collection_id = c.id ORDER BY cp.sort LIMIT 4) x) AS previews,
      cm.storage_key AS cover
    FROM collections c LEFT JOIN media_assets cm ON cm.id = c.cover_media_id WHERE c.kind = 'official' ORDER BY c.sort, c.name`);
  return (
    <>
      <PageHeader title={t("nav_collections")} subtitle={en ? "Curated official collections shown in the catalog and usable in website sections. Personal wishlists are managed by each user." : "Koleksi resmi yang tampil di katalog dan dapat dipakai di bagian website. Wishlist pribadi dikelola masing-masing pengguna."}
        actions={<LinkButton href="/app/collections/new"><Plus className="h-4 w-4" />{en ? "New collection" : "Koleksi baru"}</LinkButton>} />
      {rows.length === 0 ? <EmptyState icon={<LayoutGrid className="h-5 w-5" />} title={t("no_data")} /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => (
            <Link key={c.id} href={`/app/collections/${c.id}`}>
              <Card className="overflow-hidden transition hover:shadow-pop">
                <div className="grid aspect-[16/9] grid-cols-2 grid-rows-2 gap-0.5 bg-canvas">
                  {c.cover ? <img src={`/media/${c.cover}`} alt="" className="col-span-2 row-span-2 h-full w-full object-cover" />
                    : (c.previews ?? []).slice(0, 4).map((k: string) => <img key={k} src={`/media/${k}`} alt="" className="h-full w-full object-cover" />)}
                </div>
                <div className="flex items-center justify-between gap-2 p-4">
                  <div className="min-w-0"><p className="truncate font-medium">{c.name}</p><p className="font-mono text-xs text-ink-400">/{c.slug}</p></div>
                  <div className="text-right"><Badge tone={c.is_published ? "green" : "gray"}>{c.is_published ? (en ? "published" : "terbit") : (en ? "hidden" : "tersembunyi")}</Badge><p className="mt-1 text-xs text-ink-500">{c.n} {en ? "products" : "produk"}</p></div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
