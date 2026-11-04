import { Globe, MousePointerSquareDashed, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getLang } from "@/lib/i18n/server";
import { q } from "@/lib/db";
import { PageHeader, Card, Badge, Alert, Table } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";
import { fmtDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Websites" };

export default async function WebsitesPage() {
  const user = await requireUser("website.edit");
  const lang = await getLang();
  const T = (a: string, b: string) => (lang === "en" ? a : b);
  const rows = await q(user.ctx, `SELECT w.*, t.name AS template_name, v.version_no, v.published_at, s.require_login, s.domain,
      (SELECT count(*)::int FROM website_pages p WHERE p.website_id = w.id) AS pages,
      (SELECT count(*)::int FROM website_versions x WHERE x.website_id = w.id) AS versions
    FROM websites w LEFT JOIN website_templates t ON t.id = w.template_id LEFT JOIN website_versions v ON v.id = w.published_version_id
    LEFT JOIN website_settings s ON s.website_id = w.id ORDER BY w.is_primary DESC, w.created_at`);
  return (
    <>
      <PageHeader title={T("Websites", "Website")} subtitle={T("Websites built on the shared product & inventory database.", "Website yang dibangun di atas database produk & inventaris yang sama.")} />
      <Alert tone="info" className="mb-4">{T("This installation runs one primary website (the internal catalog at the root URL). Its catalog, availability and reservations always come from the live inventory database, never from copies.", "Instalasi ini menjalankan satu website utama (katalog internal di URL utama). Katalog, ketersediaan dan reservasinya selalu diambil dari database inventaris live, bukan salinan.")}</Alert>
      <Card>
        <Table>
          <thead><tr><th>{T("Website", "Website")}</th><th>{T("Template", "Template")}</th><th>{T("Live version", "Versi live")}</th><th>{T("Pages", "Halaman")}</th><th>{T("Access", "Akses")}</th><th>{T("Domain", "Domain")}</th><th /></tr></thead>
          <tbody>
            {rows.map((w) => (
              <tr key={w.id}>
                <td><div className="flex items-center gap-2"><Globe className="h-4 w-4 text-ink-400" /><b className="font-medium">{w.name}</b>{w.is_primary && <Badge tone="gold">{T("primary", "utama")}</Badge>}</div></td>
                <td>{w.template_name ?? "—"}</td>
                <td>{w.version_no ? <>v{w.version_no} <span className="text-xs text-ink-400">· {fmtDateTime(w.published_at, lang)}</span></> : "—"} <span className="text-xs text-ink-400">({w.versions} {T("versions", "versi")})</span></td>
                <td>{w.pages}</td>
                <td>{w.require_login ? <Badge tone="blue">{T("login", "login")}</Badge> : <Badge tone="amber">{T("public", "publik")}</Badge>}</td>
                <td className="font-mono text-xs">{w.domain?.custom || T("default URL", "URL bawaan")}</td>
                <td className="whitespace-nowrap text-right">
                  <a href="/" target="_blank" className={buttonClass("ghost", "sm")}><ExternalLink className="h-4 w-4" /></a>
                  <a href="/app/builder/editor" className={buttonClass("outline", "sm")}><MousePointerSquareDashed className="h-4 w-4" />{T("Edit", "Edit")}</a>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
