import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getLang } from "@/lib/i18n/server";
import { getDraft } from "@/lib/services/website";
import { resolveSitePath } from "@/lib/site/page-loaders";
import { validateSnapshot } from "@/lib/site/validate";
import { SitePage } from "@/components/site/site-page";
import { PreviewBanner } from "@/components/builder/preview-banner";

export const dynamic = "force-dynamic";
export const metadata = { title: "Draft preview", robots: { index: false } };

export default async function DraftPreview({ params, searchParams }: { params: Promise<{ path?: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("website.edit");
  const [{ path = [] }, sp, lang] = await Promise.all([params, searchParams, getLang()]);
  const { snapshot, meta } = await getDraft(user.ctx);
  const r = resolveSitePath(path, sp, lang);
  if (r.type === "custom" && !snapshot.pages.some((p) => p.page_type === "custom" && p.slug === r.slug)) notFound();
  const en = lang === "en";
  return (
    <SitePage {...r} snapshot={validateSnapshot(snapshot)} prefix="/preview/draft"
      banner={<PreviewBanner label={en ? `Draft preview — not published${meta.changedSincePublish ? " (has unpublished changes)" : ""}` : `Pratinjau draf — belum dipublikasikan${meta.changedSincePublish ? " (ada perubahan)" : ""}`}
        actions={[{ href: `/app/builder/editor?page=${encodeURIComponent(path.join("/"))}`, label: en ? "Back to editor" : "Kembali ke editor" }, { href: "/app/builder/publish", label: en ? "Publish…" : "Publikasikan…" }]} />} />
  );
}
