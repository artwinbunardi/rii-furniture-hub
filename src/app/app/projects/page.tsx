import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { q } from "@/lib/db";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui/misc";
import { Input, Select } from "@/components/ui/field";
import { Button, LinkButton } from "@/components/ui/button";
import { fmtDate } from "@/lib/utils";
import { PROJECT_STATUS } from "@/lib/status";

export const metadata = { title: "Projects" };
const tone = (s: string) => (s === "active" ? "green" : s === "planning" ? "blue" : s === "cancelled" ? "red" : "gray") as "green";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const user = await requireUser(["project.manage", "project.create"]);
  const { t, lang } = await getT();
  const en = lang === "en";
  const sp = await searchParams;
  const params: unknown[] = []; const where = ["true"];
  if (sp.q) { params.push(`%${sp.q}%`); where.push(`(p.name ILIKE $1 OR p.code ILIKE $1 OR p.client_name ILIKE $1 OR p.event_name ILIKE $1)`); }
  if (sp.status && sp.status in PROJECT_STATUS) { params.push(sp.status); where.push(`p.status = $${params.length}`); }
  const rows = await q(user.ctx, `
    SELECT p.*, u.name AS pic,
      (SELECT count(*)::int FROM reservations r WHERE r.project_id = p.id AND NOT r.is_cart AND r.status <> 'draft') AS reservations,
      (SELECT count(*)::int FROM reservations r WHERE r.project_id = p.id AND r.status IN ('checked_out','partially_returned')) AS active_out
    FROM projects p LEFT JOIN users u ON u.id = p.pic_user_id WHERE ${where.join(" AND ")}
    ORDER BY CASE p.status WHEN 'active' THEN 0 WHEN 'planning' THEN 1 ELSE 2 END, p.start_date DESC NULLS LAST, p.code DESC`, params);
  return (
    <>
      <PageHeader title={t("nav_projects")} subtitle={en ? "Every reservation is linked to a project, so usage can be tracked per client and event." : "Setiap reservasi terhubung ke proyek agar pemakaian dapat dilacak per klien dan acara."}
        actions={<LinkButton href="/app/projects/new"><Plus className="h-4 w-4" />{en ? "New project" : "Proyek baru"}</LinkButton>} />
      <Card>
        <form className="flex flex-wrap gap-2 border-b border-line p-3">
          <Input name="q" defaultValue={sp.q} placeholder={en ? "Code, name, client, event" : "Kode, nama, klien, acara"} className="max-w-xs" />
          <Select name="status" defaultValue={sp.status ?? ""} className="w-44"><option value="">{t("all")}</option>{Object.entries(PROJECT_STATUS).map(([k, v]) => <option key={k} value={k}>{en ? v[1] : v[0]}</option>)}</Select>
          <Button type="submit" variant="outline">{t("filter")}</Button>
        </form>
        {rows.length === 0 ? <div className="p-6"><EmptyState icon={<FolderKanban className="h-5 w-5" />} title={t("no_data")} /></div> : (
          <div className="overflow-x-auto">
            <table className="tbl"><thead><tr><th>{en ? "Code" : "Kode"}</th><th>{en ? "Project" : "Proyek"}</th><th>{en ? "Client / event" : "Klien / acara"}</th><th>{en ? "Dates" : "Tanggal"}</th><th>PIC</th><th className="text-right">{en ? "Reservations" : "Reservasi"}</th><th>Status</th></tr></thead>
              <tbody>{rows.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs"><Link href={`/app/projects/${p.id}`} className="link">{p.code}</Link></td>
                  <td><Link href={`/app/projects/${p.id}`} className="font-medium hover:underline">{p.name}</Link>{p.is_demo && <span className="ml-1 text-[10px] text-ink-400">DEMO</span>}</td>
                  <td className="text-sm text-ink-700">{p.client_name}<div className="text-xs text-ink-400">{p.event_name}</div></td>
                  <td className="whitespace-nowrap text-xs text-ink-500">{p.start_date ? `${fmtDate(p.start_date, lang)} – ${fmtDate(p.end_date, lang)}` : "—"}</td>
                  <td className="text-sm">{p.pic}</td>
                  <td className="text-right tabular-nums">{p.reservations}{p.active_out ? <div className="text-xs text-amber-600">{p.active_out} {en ? "out" : "keluar"}</div> : null}</td>
                  <td><Badge tone={tone(p.status)}>{en ? PROJECT_STATUS[p.status][1] : PROJECT_STATUS[p.status][0]}</Badge></td>
                </tr>
              ))}</tbody></table>
          </div>
        )}
      </Card>
    </>
  );
}
