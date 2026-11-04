import { requireUser } from "@/lib/auth/session";
import { getLang } from "@/lib/i18n/server";
import { hasPerm } from "@/lib/rbac";
import { getDraft } from "@/lib/services/website";
import { PageHeader, Card, CardHeader, Alert } from "@/components/ui/misc";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { siteAccessAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Domain & Access" };

export default async function DomainPage() {
  const user = await requireUser("website.edit");
  const [lang, { meta }] = await Promise.all([getLang(), getDraft(user.ctx)]);
  const T = (a: string, b: string) => (lang === "en" ? a : b);
  const canEdit = hasPerm(user.perms, "website.publish");
  return (
    <>
      <PageHeader title={T("Domain & Access", "Domain & Akses")} subtitle={T("Who can see the website and which address it is meant to use. These settings apply immediately (they are not part of the draft).", "Siapa yang dapat melihat website dan alamat yang akan dipakai. Pengaturan ini langsung berlaku (bukan bagian dari draf).")} />
      {!canEdit && <Alert tone="warn" className="mb-4">{T("Only users allowed to publish can change these settings.", "Hanya pengguna yang berhak mempublikasikan yang dapat mengubah pengaturan ini.")}</Alert>}
      <ActionForm action={siteAccessAction} className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title={T("Access", "Akses")} />
          <div className="space-y-3 p-5 text-sm">
            <label className="flex items-start gap-2"><input type="checkbox" name="require_login" defaultChecked={meta.requireLogin} className="mt-0.5" disabled={!canEdit} />
              <span><b className="font-medium">{T("Require login to browse the catalog", "Wajib login untuk melihat katalog")}</b><br /><span className="text-ink-500">{T("Recommended for an internal system. When off, anyone with the URL can browse products and availability; reserving always requires login.", "Disarankan untuk sistem internal. Jika dimatikan, siapa pun yang memiliki URL dapat melihat produk dan ketersediaan; reservasi tetap wajib login.")}</span></span></label>
          </div>
        </Card>
        <Card id="domain">
          <CardHeader title={T("Domain", "Domain")} />
          <div className="space-y-4 p-5">
            <div><label className="label">{T("Custom domain", "Domain kustom")}</label><input name="domain" defaultValue={meta.domain?.custom ?? ""} className="input font-mono" placeholder="furniture.rii.co.id" disabled={!canEdit} /></div>
            <div><label className="label">{T("Subdomain label", "Label subdomain")}</label><input name="subdomain" defaultValue={meta.domain?.subdomain ?? ""} className="input font-mono" placeholder="furniture" disabled={!canEdit} /></div>
            <Alert tone="warn">{T("Saving a domain here only records the intended address. Connecting it requires a DNS record (CNAME/A) pointing to wherever you deploy the app, plus HTTPS on that host. No DNS has been configured by this system.", "Menyimpan domain di sini hanya mencatat alamat yang dituju. Untuk menghubungkannya, buat record DNS (CNAME/A) ke server tempat aplikasi di-deploy, beserta HTTPS di server tersebut. Sistem ini belum mengonfigurasi DNS apa pun.")}</Alert>
          </div>
        </Card>
        {canEdit && <div><SubmitButton>{T("Save settings", "Simpan pengaturan")}</SubmitButton></div>}
      </ActionForm>
    </>
  );
}
