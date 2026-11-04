import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { q } from "@/lib/db";
import { PageHeader, Card, CardHeader } from "@/components/ui/misc";
import { SETTINGS_SCHEMA } from "@/lib/services/admin";
import { SettingsForm } from "./form";

export const metadata = { title: "Settings" };
export default async function SettingsPage() {
  const me = await requireUser("settings.manage");
  const { t, lang } = await getT();
  const en = lang === "en";
  const rows = await q(me.ctx, `SELECT key, value FROM app_settings`);
  const val = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const i = en ? 1 : 0;
  const defs = Object.entries(SETTINGS_SCHEMA).map(([key, d]) => ({ key, type: d.type, min: d.min, max: d.max, options: d.options, label: d.label[i], hint: d.hint?.[i], value: val[key], locked: key === "require_reservation_approval" }));
  return (
    <>
      <PageHeader title={t("nav_settings")} actions={<Link href="/app/settings/outbox" className="text-sm text-ink-500 hover:text-ink">{en ? "Email outbox →" : "Kotak keluar email →"}</Link>} />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card><CardHeader title={en ? "Application settings" : "Pengaturan aplikasi"} subtitle={en ? "Stored in the database and audited on every change." : "Disimpan di database dan dicatat di log audit setiap perubahan."} /><div className="p-5"><SettingsForm lang={lang} defs={defs} /></div></Card>
        <Card>
          <CardHeader title={en ? "Environment" : "Lingkungan"} subtitle={en ? "Fixed for this deployment (set via environment variables)." : "Tetap untuk instalasi ini (diatur lewat variabel lingkungan)."} />
          <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-2 p-5 text-sm">
            <dt className="text-ink-500">{en ? "Timezone" : "Zona waktu"}</dt><dd>Asia/Jakarta (WIB)</dd>
            <dt className="text-ink-500">{en ? "Currency" : "Mata uang"}</dt><dd>IDR</dd>
            <dt className="text-ink-500">Email</dt><dd>{process.env.SMTP_URL ? (en ? "SMTP configured (delivery not implemented in this build — outbox only)" : "SMTP diatur (pengiriman belum diimplementasikan — hanya kotak keluar)") : (en ? "No SMTP — emails are stored in the outbox" : "Tanpa SMTP — email disimpan di kotak keluar")}</dd>
            <dt className="text-ink-500">{en ? "File storage" : "Penyimpanan file"}</dt><dd>{en ? "Local disk" : "Disk lokal"} (<code className="text-xs">{process.env.UPLOAD_DIR ?? "./storage/uploads"}</code>)</dd>
            <dt className="text-ink-500">App URL</dt><dd className="truncate">{process.env.APP_URL ?? "—"}</dd>
          </dl>
        </Card>
      </div>
    </>
  );
}
