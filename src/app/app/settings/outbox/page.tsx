import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { q } from "@/lib/db";
import { PageHeader, Card, EmptyState, Alert } from "@/components/ui/misc";
import { fmtDateTime } from "@/lib/utils";

export const metadata = { title: "Email outbox" };
export default async function OutboxPage() {
  const me = await requireUser("settings.manage");
  const { t, lang } = await getT();
  const en = lang === "en";
  const rows = await q(me.ctx, `SELECT * FROM email_outbox ORDER BY created_at DESC LIMIT 200`);
  return (
    <>
      <PageHeader breadcrumb={<Link href="/app/settings" className="hover:text-ink">{t("nav_settings")}</Link>} title={en ? "Email outbox" : "Kotak keluar email"} />
      <Alert tone="warn" className="mb-4">{en ? "This build has no SMTP delivery. Every email the system would send (password resets, invitations, contact-form messages, reservation notifications) is recorded here so nothing is silently lost." : "Versi ini belum mengirim email via SMTP. Setiap email yang akan dikirim sistem (atur ulang sandi, undangan, pesan kontak, notifikasi reservasi) dicatat di sini agar tidak ada yang hilang."}</Alert>
      {rows.length === 0 ? <EmptyState title={en ? "No emails yet" : "Belum ada email"} /> : (
        <Card>
          <ul className="divide-y divide-line">{rows.map((m) => (
            <li key={m.id}>
              <details>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 hover:bg-canvas">
                  <span className="min-w-0"><span className="block truncate font-medium">{m.subject}</span><span className="text-xs text-ink-500">{en ? "to" : "ke"} {m.to_email}</span></span>
                  <span className="whitespace-nowrap text-xs text-ink-400">{fmtDateTime(m.created_at, lang)}</span>
                </summary>
                <div className="border-t border-line bg-canvas/50 px-4 py-3">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-ink-700">{m.body}</pre>
                  {m.link && <p className="mt-2 text-xs"><a href={m.link} className="link break-all">{m.link}</a></p>}
                </div>
              </details>
            </li>
          ))}</ul>
        </Card>
      )}
    </>
  );
}
