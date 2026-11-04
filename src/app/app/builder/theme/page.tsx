import { requireUser } from "@/lib/auth/session";
import { getLang } from "@/lib/i18n/server";
import { q } from "@/lib/db";
import { hasPerm } from "@/lib/rbac";
import { getDraft } from "@/lib/services/website";
import { PageHeader } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";
import { ThemeForm } from "./form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Theme & Branding" };

export default async function ThemePage() {
  const user = await requireUser("website.edit");
  const [lang, { snapshot, meta }] = await Promise.all([getLang(), getDraft(user.ctx)]);
  const media = await q(user.ctx, `SELECT id, filename AS name, storage_key, category, folder, alt_text AS alt FROM media_assets WHERE mime_type LIKE 'image/%' ORDER BY (category IN ('logo','favicon')) DESC, created_at DESC LIMIT 300`);
  const T = (a: string, b: string) => (lang === "en" ? a : b);
  return (
    <>
      <PageHeader title={T("Theme & Branding", "Tema & Merek")} subtitle={T("Global colors, fonts, buttons, logo and layout. For live visual feedback use the Theme panel in the visual editor.", "Warna, font, tombol, logo dan tata letak global. Untuk umpan balik visual langsung, gunakan panel Tema di editor visual.")}
        actions={<a href="/app/builder/editor" className={buttonClass("outline")}>{T("Edit visually", "Edit secara visual")}</a>} />
      <ThemeForm lang={lang} rev={meta.rev} theme={snapshot.theme} header={snapshot.header} footer={snapshot.footer} canUpload={hasPerm(user.perms, "media.manage")}
        media={media.map((m) => ({ id: m.id, url: `/media/${m.storage_key}`, name: m.name, category: m.category, folder: m.folder, alt: m.alt }))} />
    </>
  );
}
