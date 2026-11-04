import { Eye, Rocket, MousePointerSquareDashed, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getLang } from "@/lib/i18n/server";
import { hasPerm } from "@/lib/rbac";
import { getDraft, getVersionSnapshot, diffSnapshots } from "@/lib/services/website";
import { validateSnapshot } from "@/lib/site/validate";
import { PageHeader, Card, CardHeader, Alert, Badge } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { publishAction } from "../actions";
import { fmtDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Publish" };

export default async function PublishPage() {
  const user = await requireUser("website.edit");
  const [lang, { snapshot, meta }] = await Promise.all([getLang(), getDraft(user.ctx)]);
  const T = (a: string, b: string) => (lang === "en" ? a : b);
  const live = meta.publishedVersionId ? await getVersionSnapshot(user.ctx, meta.publishedVersionId) : null;
  const d = diffSnapshots(live ? validateSnapshot(live) : null, validateSnapshot(snapshot));
  const canPublish = hasPerm(user.perms, "website.publish");
  const items: string[] = [
    ...(d.firstPublish ? [T("First publish of this website", "Publikasi pertama website ini")] : []),
    ...(d.theme ? [T("Theme & branding", "Tema & merek")] : []), ...(d.header ? [T("Header settings", "Pengaturan header")] : []),
    ...(d.navigation ? [T("Menu links", "Tautan menu")] : []), ...(d.footer ? ["Footer"] : []), ...(d.seo ? [T("Site name / SEO", "Nama situs / SEO")] : []),
    ...d.added.map((t) => `${T("New page", "Halaman baru")}: ${t}`), ...d.removed.map((t) => `${T("Removed page", "Halaman dihapus")}: ${t}`), ...d.changed.map((t) => `${T("Changed page", "Halaman diubah")}: ${t}`),
  ];
  return (
    <>
      <PageHeader title={T("Publish", "Publikasi")} subtitle={T("Publishing copies the saved draft into a new, permanent version and makes it the live website immediately.", "Publikasi menyalin draf tersimpan menjadi versi baru yang permanen dan langsung menjadikannya website live.")}
        actions={<><a href="/preview/draft" target="_blank" className={buttonClass("outline")}><Eye className="h-4 w-4" />{T("Preview draft", "Pratinjau draf")}</a><a href="/" target="_blank" className={buttonClass("outline")}><ExternalLink className="h-4 w-4" />{T("Live site", "Website live")}</a></>} />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader title={T("Changes waiting to be published", "Perubahan yang menunggu dipublikasikan")} subtitle={`${T("Live", "Live")}: ${meta.publishedVersionNo ? `v${meta.publishedVersionNo} · ${fmtDateTime(meta.publishedAt, lang)}` : "—"} · ${T("Draft saved", "Draf disimpan")} ${fmtDateTime(meta.draftUpdatedAt, lang)}`} />
          {items.length ? (
            <ul className="divide-y divide-line" data-testid="pending-changes">{items.map((x) => <li key={x} className="px-5 py-2.5 text-sm">{x}</li>)}</ul>
          ) : <p className="px-5 py-8 text-sm text-ink-500" data-testid="pending-changes">{T("No differences: the live website already matches the draft.", "Tidak ada perbedaan: website live sudah sama dengan draf.")}</p>}
          <p className="border-t border-line px-5 py-3 text-[12px] text-ink-400">{T("Unsaved edits in an open editor are not included; save them first.", "Editan yang belum disimpan di editor tidak ikut; simpan terlebih dahulu.")} <a href="/app/builder/editor" className="text-sky-700 hover:underline"><MousePointerSquareDashed className="mr-0.5 inline h-3.5 w-3.5" />{T("Open editor", "Buka editor")}</a></p>
        </Card>
        <Card className="self-start">
          <CardHeader title={T("Publish now", "Publikasikan sekarang")} />
          <div className="p-5">
            {canPublish ? (
              <ActionForm action={publishAction} className="space-y-3">
                <div><label className="label">{T("Version note", "Catatan versi")}</label><input name="note" className="input" maxLength={300} placeholder={T("What changed?", "Apa yang berubah?")} /></div>
                <SubmitButton className="w-full"><Rocket className="h-4 w-4" />{T(`Publish as v${(meta.publishedVersionNo ?? 0) + 1}`, `Publikasikan sebagai v${(meta.publishedVersionNo ?? 0) + 1}`)}</SubmitButton>
                {!items.length && <p className="text-[12px] text-ink-400">{T("Publishing without changes still creates a version (useful as a checkpoint).", "Publikasi tanpa perubahan tetap membuat versi (berguna sebagai titik simpan).")}</p>}
              </ActionForm>
            ) : <Alert tone="warn">{T("Your role can edit the draft but cannot publish. Ask an administrator to publish, or to grant the “website.publish” permission.", "Peran Anda dapat mengedit draf tetapi tidak dapat mempublikasikan. Minta administrator untuk mempublikasikan atau memberi izin “website.publish”.")} <Badge>website.publish</Badge></Alert>}
          </div>
        </Card>
      </div>
    </>
  );
}
