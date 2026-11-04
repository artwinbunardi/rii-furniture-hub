import { requireUser } from "@/lib/auth/session";
import { getLang } from "@/lib/i18n/server";
import { getDraft } from "@/lib/services/website";
import { SYSTEM_PAGE_SLUGS } from "@/lib/site/types";
import { PageHeader } from "@/components/ui/misc";
import { NavigationForm } from "./form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Navigation" };

export default async function NavigationPage() {
  const user = await requireUser("website.edit");
  const [lang, { snapshot, meta }] = await Promise.all([getLang(), getDraft(user.ctx)]);
  const pages = snapshot.pages.filter((p) => !(p.page_type !== "custom" && SYSTEM_PAGE_SLUGS[p.page_type].includes(":")))
    .map((p) => ({ title: p.title, href: "/" + (p.page_type === "custom" ? p.slug : SYSTEM_PAGE_SLUGS[p.page_type]) }));
  return (
    <>
      <PageHeader title={lang === "en" ? "Navigation" : "Navigasi"} subtitle={lang === "en" ? "Menu links, header button, announcement and footer details. Saved to the draft." : "Tautan menu, tombol header, pengumuman dan detail footer. Disimpan ke draf."} />
      <NavigationForm lang={lang} rev={meta.rev} nav={snapshot.navigation} header={snapshot.header} footer={snapshot.footer} pages={pages} />
    </>
  );
}
