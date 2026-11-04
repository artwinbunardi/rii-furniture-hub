import { requireUser } from "@/lib/auth/session";
import { getLang } from "@/lib/i18n/server";
import { getDraft } from "@/lib/services/website";
import { SYSTEM_PAGE_SLUGS } from "@/lib/site/types";
import { PageHeader } from "@/components/ui/misc";
import { PagesManager } from "./manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pages" };

export default async function PagesPage() {
  const user = await requireUser("website.edit");
  const [lang, { snapshot, meta }] = await Promise.all([getLang(), getDraft(user.ctx)]);
  const pages = snapshot.pages.map((p) => ({
    slug: p.slug, title: p.title, type: p.page_type, isHome: p.is_home, isSystem: p.is_system, seoTitle: p.seo_title ?? "", seoDescription: p.seo_description ?? "",
    url: "/" + (p.page_type === "custom" ? p.slug : SYSTEM_PAGE_SLUGS[p.page_type]), sections: p.sections.length, hidden: p.sections.filter((s) => s.hidden).length,
  }));
  return (
    <>
      <PageHeader title={lang === "en" ? "Pages" : "Halaman"} subtitle={lang === "en" ? "Create, rename and organise pages. System pages (catalog, cart, product…) have fixed URLs because the reservation flow depends on them. All changes go to the draft." : "Buat, ganti nama dan atur halaman. Halaman sistem (katalog, keranjang, produk…) memiliki URL tetap karena alur reservasi bergantung padanya. Semua perubahan masuk ke draf."} />
      <PagesManager pages={pages} rev={meta.rev} lang={lang} />
    </>
  );
}
