import { Eye, History } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getLang } from "@/lib/i18n/server";
import { hasPerm } from "@/lib/rbac";
import { listVersions } from "@/lib/services/website";
import { PageHeader, Card, Badge, Table, EmptyState } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";
import { ActionForm, ConfirmButton } from "@/components/ui/action-form";
import { restoreVersionAction } from "../actions";
import { fmtDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Version History" };

export default async function VersionsPage() {
  const user = await requireUser("website.edit");
  const [lang, versions] = await Promise.all([getLang(), listVersions(user.ctx)]);
  const T = (a: string, b: string) => (lang === "en" ? a : b);
  const canPublish = hasPerm(user.perms, "website.publish");
  return (
    <>
      <PageHeader title={T("Version History", "Riwayat Versi")} subtitle={T("Every publish is stored permanently. Preview any version, load it into the draft, or restore it as the live site.", "Setiap publikasi disimpan permanen. Pratinjau versi mana pun, muat ke draf, atau pulihkan sebagai website live.")} />
      {!versions.length ? <EmptyState icon={<History className="h-5 w-5" />} title={T("Nothing published yet", "Belum ada yang dipublikasikan")} /> : (
        <Card>
          <Table>
            <thead><tr><th>{T("Version", "Versi")}</th><th>{T("Published", "Dipublikasikan")}</th><th>{T("By", "Oleh")}</th><th>{T("Note", "Catatan")}</th><th>{T("Pages", "Halaman")}</th><th /></tr></thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id} data-version={v.version_no}>
                  <td className="whitespace-nowrap font-medium">v{v.version_no} {v.is_live && <Badge tone="green" dot>live</Badge>}</td>
                  <td className="whitespace-nowrap">{fmtDateTime(v.published_at, lang)}</td>
                  <td>{v.published_by ?? "—"}</td>
                  <td className="max-w-[320px] truncate text-ink-500">{v.note || "—"}{v.template_id && <span className="ml-1 font-mono text-[11px] text-ink-400">({v.template_id})</span>}</td>
                  <td>{v.pages}</td>
                  <td className="whitespace-nowrap text-right">
                    <div className="flex justify-end gap-1.5">
                      <a href={`/preview/version/${v.id}`} target="_blank" className={buttonClass("ghost", "sm")}><Eye className="h-4 w-4" />{T("Preview", "Pratinjau")}</a>
                      <ActionForm action={restoreVersionAction}>
                        <input type="hidden" name="id" value={v.id} />
                        <ConfirmButton variant="outline" size="sm" title={T(`Load v${v.version_no} into the draft?`, `Muat v${v.version_no} ke draf?`)} body={T("The current draft is replaced (unpublished edits are lost). The live site does not change.", "Draf saat ini diganti (editan yang belum dipublikasikan hilang). Website live tidak berubah.")} confirmLabel={T("Load into draft", "Muat ke draf")} cancelLabel={T("Cancel", "Batal")}>{T("Restore to draft", "Pulihkan ke draf")}</ConfirmButton>
                      </ActionForm>
                      {canPublish && !v.is_live && (
                        <ActionForm action={restoreVersionAction}>
                          <input type="hidden" name="id" value={v.id} /><input type="hidden" name="publish" value="1" />
                          <ConfirmButton variant="primary" size="sm" title={T(`Make v${v.version_no} live again?`, `Jadikan v${v.version_no} live kembali?`)} body={T("Its content is loaded into the draft and published as a new version. Nothing is deleted.", "Kontennya dimuat ke draf dan dipublikasikan sebagai versi baru. Tidak ada yang dihapus.")} confirmLabel={T("Restore & publish", "Pulihkan & publikasikan")} cancelLabel={T("Cancel", "Batal")}>{T("Restore & publish", "Pulihkan & publikasikan")}</ConfirmButton>
                        </ActionForm>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
