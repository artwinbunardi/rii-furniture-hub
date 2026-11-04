import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getLang } from "@/lib/i18n/server";
import { q1 } from "@/lib/db";
import { resolveSitePath } from "@/lib/site/page-loaders";
import { validateSnapshot } from "@/lib/site/validate";
import { SitePage } from "@/components/site/site-page";
import { PreviewBanner } from "@/components/builder/preview-banner";

export const dynamic = "force-dynamic";
export const metadata = { title: "Version preview", robots: { index: false } };

export default async function VersionPreview({ params, searchParams }: { params: Promise<{ id: string; path?: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("website.edit");
  const [{ id, path = [] }, sp, lang] = await Promise.all([params, searchParams, getLang()]);
  if (!/^\d+$/.test(id)) notFound();
  const v = await q1(user.ctx, `SELECT version_no, snapshot FROM website_versions WHERE id = $1`, [id]);
  if (!v) notFound();
  const r = resolveSitePath(path, sp, lang);
  const en = lang === "en";
  return (
    <SitePage {...r} snapshot={validateSnapshot(v.snapshot)} prefix={`/preview/version/${id}`}
      banner={<PreviewBanner tone="violet" label={en ? `Version ${v.version_no} (history)` : `Versi ${v.version_no} (riwayat)`} actions={[{ href: "/app/builder/publish", label: en ? "Version history" : "Riwayat versi" }]} />} />
  );
}
