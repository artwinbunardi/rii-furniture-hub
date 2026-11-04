import Link from "next/link";
import { ExternalLink, Eye, MousePointerSquareDashed, Rocket, LayoutTemplate, Files, Images, History } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getLang } from "@/lib/i18n/server";
import { q, q1 } from "@/lib/db";
import { hasPerm } from "@/lib/rbac";
import { getDraft, listVersions } from "@/lib/services/website";
import { PageHeader, Card, CardHeader, Badge, Stat } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";
import { fmtDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Website Builder" };

export default async function BuilderOverview() {
  const user = await requireUser("website.edit");
  const lang = await getLang();
  const en = lang === "en";
  const T = (a: string, b: string) => (en ? a : b);
  const [{ snapshot, meta }, versions, media, audit] = await Promise.all([
    getDraft(user.ctx), listVersions(user.ctx),
    q1(user.ctx, `SELECT count(*)::int AS n FROM media_assets`),
    q(user.ctx, `SELECT a.action, a.summary, a.created_at, u.name FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id WHERE a.action LIKE 'website.%' OR a.action LIKE 'media.%' ORDER BY a.created_at DESC LIMIT 8`).catch(() => [] as any[]),
  ]);
  const tpl = meta.templateId ? await q1(user.ctx, `SELECT name, category FROM website_templates WHERE id = $1`, [meta.templateId]) : null;
  const sections = snapshot.pages.reduce((n, p) => n + p.sections.length, 0);
  const canPublish = hasPerm(user.perms, "website.publish");
  return (
    <>
      <PageHeader title="Website Builder" subtitle={T("Design the internal catalog website. Changes are saved as a draft and only reach users when published.", "Rancang website katalog internal. Perubahan disimpan sebagai draf dan baru terlihat pengguna setelah dipublikasikan.")}
        actions={<>
          <a href="/" target="_blank" className={buttonClass("outline")}><ExternalLink className="h-4 w-4" />{T("Live site", "Website live")}</a>
          <a href="/preview/draft" target="_blank" className={buttonClass("outline")}><Eye className="h-4 w-4" />{T("Preview draft", "Pratinjau draf")}</a>
          <a href="/app/builder/editor" className={buttonClass("primary")}><MousePointerSquareDashed className="h-4 w-4" />{T("Open visual editor", "Buka editor visual")}</a>
        </>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={T("Live version", "Versi live")} value={meta.publishedVersionNo ? `v${meta.publishedVersionNo}` : "—"} hint={meta.publishedAt ? fmtDateTime(meta.publishedAt, lang) : T("Never published", "Belum pernah dipublikasikan")} />
        <Stat label={T("Draft", "Draf")} value={meta.changedSincePublish ? T("Unpublished changes", "Ada perubahan") : T("Same as live", "Sama dengan live")} tone={meta.changedSincePublish ? "warn" : "good"} hint={`${T("Last saved", "Disimpan")} ${fmtDateTime(meta.draftUpdatedAt, lang)}`} />
        <Stat label={T("Pages · sections", "Halaman · bagian")} value={`${snapshot.pages.length} · ${sections}`} hint={T("in the draft", "di draf")} />
        <Stat label={T("Media files", "File media")} value={media?.n ?? 0} hint={T("shared with product images", "dipakai bersama foto produk")} />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title={T("Draft status", "Status draf")} subtitle={tpl ? `${T("Based on template", "Berdasarkan template")} “${tpl.name}” (${tpl.category})` : T("Custom design", "Desain kustom")} />
          <div className="flex flex-wrap items-center gap-4 p-5">
            {meta.templateId && <img src={`/template-thumbs/${meta.templateId}.jpg`} alt="" className="h-28 w-44 rounded-lg border border-line object-cover object-top" />}
            <div className="min-w-0 flex-1 space-y-2 text-sm">
              <p><span className="text-ink-500">{T("Site name", "Nama situs")}:</span> <b>{snapshot.name}</b></p>
              <p><span className="text-ink-500">{T("Access", "Akses")}:</span> {meta.requireLogin ? <Badge tone="blue">{T("Login required", "Wajib login")}</Badge> : <Badge tone="amber">{T("Public browsing allowed", "Dapat dilihat tanpa login")}</Badge>}</p>
              <p className="text-ink-500">{meta.changedSincePublish ? T("The draft has changes that are not live yet.", "Draf berisi perubahan yang belum live.") : T("The live site matches the draft.", "Website live sama dengan draf.")}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {canPublish && <Link href="/app/builder/publish" className={buttonClass(meta.changedSincePublish ? "primary" : "outline", "sm")}><Rocket className="h-4 w-4" />{T("Publish", "Publikasikan")}</Link>}
                <Link href="/app/builder/templates" className={buttonClass("outline", "sm")}><LayoutTemplate className="h-4 w-4" />{T("Change template", "Ganti template")}</Link>
                <Link href="/app/builder/pages" className={buttonClass("outline", "sm")}><Files className="h-4 w-4" />{T("Pages", "Halaman")}</Link>
                <Link href="/app/builder/media" className={buttonClass("outline", "sm")}><Images className="h-4 w-4" />{T("Media", "Media")}</Link>
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title={T("Recent versions", "Versi terbaru")} action={<Link href="/app/builder/versions" className="text-[13px] text-sky-700 hover:underline"><History className="mr-1 inline h-3.5 w-3.5" />{T("All", "Semua")}</Link>} />
          <ul className="divide-y divide-line">
            {versions.slice(0, 5).map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                <div className="min-w-0"><p className="font-medium">v{v.version_no} {v.is_live && <Badge tone="green">live</Badge>}</p><p className="truncate text-xs text-ink-500">{v.note || "—"}</p></div>
                <span className="shrink-0 text-xs text-ink-400">{fmtDateTime(v.published_at, lang)}</span>
              </li>
            ))}
            {!versions.length && <li className="px-5 py-6 text-sm text-ink-400">{T("No versions yet.", "Belum ada versi.")}</li>}
          </ul>
        </Card>
      </div>
      {audit.length > 0 && (
        <Card className="mt-6">
          <CardHeader title={T("Builder activity", "Aktivitas builder")} />
          <ul className="divide-y divide-line">
            {audit.map((a, i) => <li key={i} className="flex justify-between gap-3 px-5 py-2 text-[13px]"><span><b className="font-medium">{a.name ?? "—"}</b> · {a.summary}</span><span className="shrink-0 text-ink-400">{fmtDateTime(a.created_at, lang)}</span></li>)}
          </ul>
        </Card>
      )}
    </>
  );
}
