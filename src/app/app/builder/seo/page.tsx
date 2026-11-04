import { requireUser } from "@/lib/auth/session";
import { getLang } from "@/lib/i18n/server";
import { getDraft } from "@/lib/services/website";
import { SYSTEM_PAGE_SLUGS } from "@/lib/site/types";
import { PageHeader, Card, CardHeader, Alert } from "@/components/ui/misc";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { seoAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "SEO Settings" };

export default async function SeoPage() {
  const user = await requireUser("website.edit");
  const [lang, { snapshot, meta }] = await Promise.all([getLang(), getDraft(user.ctx)]);
  const T = (a: string, b: string) => (lang === "en" ? a : b);
  return (
    <>
      <PageHeader title={T("SEO Settings", "Pengaturan SEO")} subtitle={T("Site-wide title and description. Per-page SEO is set on the Pages screen. Changes go live when published.", "Judul dan deskripsi seluruh situs. SEO per halaman diatur di layar Halaman. Perubahan berlaku setelah dipublikasikan.")} />
      <Alert tone="info" className="mb-4">{T("This is an internal system: search engines cannot reach pages that require login. These settings are still used for browser tab titles and link previews.", "Ini sistem internal: mesin pencari tidak dapat mengakses halaman yang mewajibkan login. Pengaturan ini tetap dipakai untuk judul tab browser dan pratinjau tautan.")}</Alert>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title={T("Site defaults", "Bawaan situs")} />
          <ActionForm action={seoAction} className="space-y-4 p-5">
            <input type="hidden" name="rev" value={meta.rev} />
            <div><label className="label">{T("Website name", "Nama website")}</label><input name="name" defaultValue={snapshot.name} className="input" required maxLength={80} /></div>
            <div><label className="label">{T("Default page title", "Judul halaman bawaan")}</label><input name="seo_title" defaultValue={snapshot.seo.title ?? ""} className="input" maxLength={120} /></div>
            <div><label className="label">{T("Default meta description", "Deskripsi meta bawaan")}</label><textarea name="seo_description" defaultValue={snapshot.seo.description ?? ""} className="input min-h-[90px]" maxLength={320} /></div>
            <SubmitButton>{T("Save to draft", "Simpan ke draf")}</SubmitButton>
          </ActionForm>
        </Card>
        <Card>
          <CardHeader title={T("Per-page SEO (draft)", "SEO per halaman (draf)")} subtitle={<a href="/app/builder/pages" className="text-sky-700 hover:underline">{T("Edit on the Pages screen →", "Edit di layar Halaman →")}</a>} />
          <ul className="divide-y divide-line text-[13px]">
            {snapshot.pages.map((p) => (
              <li key={p.slug + p.page_type} className="px-5 py-2.5">
                <p className="font-mono text-[12px] text-ink-400">/{p.page_type === "custom" ? p.slug : SYSTEM_PAGE_SLUGS[p.page_type]}</p>
                <p className="font-medium text-[#1a0dab]">{p.seo_title || p.title}</p>
                <p className="line-clamp-2 text-ink-500">{p.seo_description || snapshot.seo.description || <i className="text-ink-300">{T("uses site default", "memakai bawaan situs")}</i>}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
