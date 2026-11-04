import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getLang } from "@/lib/i18n/server";
import { q1 } from "@/lib/db";
import { resolveSitePath } from "@/lib/site/page-loaders";
import { validateSnapshot } from "@/lib/site/validate";
import { SitePage } from "@/components/site/site-page";
import { PreviewBanner } from "@/components/builder/preview-banner";

export const dynamic = "force-dynamic";
export const metadata = { title: "Template preview", robots: { index: false } };

export default async function TemplatePreview({ params, searchParams }: { params: Promise<{ id: string; path?: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("website.edit");
  const [{ id, path = [] }, sp, lang] = await Promise.all([params, searchParams, getLang()]);
  // templates are stored as configuration rows; the same renderer shows them with live product data
  const tpl = await q1(user.ctx, `SELECT name, config FROM website_templates WHERE id = $1 AND is_active`, [id]);
  if (!tpl) notFound();
  const r = resolveSitePath(path, sp, lang);
  const en = lang === "en";
  const embed = sp.embed === "1";
  return (
    <SitePage {...r} snapshot={validateSnapshot(tpl.config)} prefix={`/preview/template/${id}`}
      banner={embed ? null : <PreviewBanner tone="blue" label={en ? `Template preview: ${tpl.name} — live product data` : `Pratinjau template: ${tpl.name} — data produk langsung`}
        actions={[{ href: `/app/builder/templates?use=${id}`, label: en ? "Use this template" : "Gunakan template ini" }, { href: "/app/builder/templates", label: en ? "All templates" : "Semua template" }]} />} />
  );
}
