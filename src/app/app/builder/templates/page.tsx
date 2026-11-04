import { requireUser } from "@/lib/auth/session";
import { getLang } from "@/lib/i18n/server";
import { q } from "@/lib/db";
import { getDraft } from "@/lib/services/website";
import { TEMPLATE_CATEGORIES } from "@/lib/site/templates";
import { PageHeader } from "@/components/ui/misc";
import { TemplateLibrary } from "./library";

export const dynamic = "force-dynamic";
export const metadata = { title: "Templates" };

export default async function TemplatesPage({ searchParams }: { searchParams: Promise<{ use?: string; category?: string }> }) {
  const user = await requireUser("website.edit");
  const [lang, sp, { meta }] = await Promise.all([getLang(), searchParams, getDraft(user.ctx)]);
  const rows = await q(user.ctx, `SELECT id, name, category, description FROM website_templates WHERE is_active ORDER BY sort`);
  const en = lang === "en";
  return (
    <>
      <PageHeader title={en ? "Template library" : "Pustaka template"} subtitle={en ? `${rows.length} complete website designs. Applying one changes the draft only; publish when you're happy.` : `${rows.length} desain website lengkap. Menerapkan template hanya mengubah draf; publikasikan setelah Anda puas.`} />
      <TemplateLibrary lang={lang} templates={rows as any} categories={TEMPLATE_CATEGORIES.map(([id, nameId, nameEn]) => ({ id, name: en ? nameEn : nameId }))} activeId={meta.templateId} initialUse={sp.use} initialCategory={sp.category} />
    </>
  );
}
