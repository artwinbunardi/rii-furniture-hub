import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { q, q1 } from "@/lib/db";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui/misc";
import { Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { fmtDateTime, isIsoDate } from "@/lib/utils";

export const metadata = { title: "Audit log" };
const PAGE = 100;
type SP = { q?: string; entity?: string; user?: string; from?: string; to?: string; page?: string };

export default async function AuditPage({ searchParams }: { searchParams: Promise<SP> }) {
  const me = await requireUser("audit.view");
  const { t, lang } = await getT();
  const en = lang === "en";
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const params: unknown[] = []; const where = ["true"];
  if (sp.q) { params.push(`%${sp.q}%`); where.push(`(a.summary ILIKE $${params.length} OR a.action ILIKE $${params.length} OR a.entity_id ILIKE $${params.length})`); }
  if (sp.entity) { params.push(sp.entity); where.push(`a.entity_type = $${params.length}`); }
  if (sp.user && /^[0-9a-f-]{36}$/i.test(sp.user)) { params.push(sp.user); where.push(`a.user_id = $${params.length}`); }
  if (sp.from && isIsoDate(sp.from)) { params.push(sp.from); where.push(`(a.created_at AT TIME ZONE 'Asia/Jakarta')::date >= $${params.length}::date`); }
  if (sp.to && isIsoDate(sp.to)) { params.push(sp.to); where.push(`(a.created_at AT TIME ZONE 'Asia/Jakarta')::date <= $${params.length}::date`); }
  const W = where.join(" AND ");
  const [rows, count, entities, users] = await Promise.all([
    q(me.ctx, `SELECT a.*, u.name AS user_name FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id WHERE ${W} ORDER BY a.created_at DESC, a.id DESC LIMIT ${PAGE} OFFSET ${(page - 1) * PAGE}`, params),
    q1<{ n: number }>(me.ctx, `SELECT count(*)::int n FROM audit_logs a WHERE ${W}`, params),
    q(me.ctx, `SELECT DISTINCT entity_type FROM audit_logs ORDER BY 1`),
    q(me.ctx, `SELECT id, name FROM users ORDER BY name`),
  ]);
  const total = count?.n ?? 0;
  const qs = (over: Partial<SP>) => `?${new URLSearchParams(Object.entries({ ...sp, ...over }).filter(([, v]) => v) as [string, string][])}`;
  const tone = (a: string) => (/delete|reject|cancel|revoke|disable|write_off/.test(a) ? "red" : /approve|create|grant|publish|accept/.test(a) ? "green" : "gray") as "gray";
  return (
    <>
      <PageHeader title={t("nav_audit")} subtitle={en ? "Append-only record of every significant action. The application database role cannot edit or delete these rows." : "Catatan hanya-tambah untuk setiap tindakan penting. Peran database aplikasi tidak dapat mengubah atau menghapus baris ini."} />
      <Card>
        <form className="flex flex-wrap gap-2 border-b border-line p-3">
          <Input name="q" defaultValue={sp.q} placeholder={en ? "Search summary / action" : "Cari ringkasan / aksi"} className="max-w-xs" />
          <Select name="entity" defaultValue={sp.entity ?? ""} className="w-44"><option value="">{en ? "All entities" : "Semua entitas"}</option>{entities.map((e) => <option key={e.entity_type} value={e.entity_type}>{e.entity_type}</option>)}</Select>
          <Select name="user" defaultValue={sp.user ?? ""} className="w-48"><option value="">{en ? "All users" : "Semua pengguna"}</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>
          <Input name="from" type="date" defaultValue={sp.from} className="w-40" aria-label="from" />
          <Input name="to" type="date" defaultValue={sp.to} className="w-40" aria-label="to" />
          <Button type="submit" variant="outline">{t("filter")}</Button>
        </form>
        {rows.length === 0 ? <div className="p-6"><EmptyState title={t("no_data")} /></div> : (
          <div className="overflow-x-auto">
            <table className="tbl"><thead><tr><th>{t("date")}</th><th>{en ? "User" : "Pengguna"}</th><th>{en ? "Action" : "Aksi"}</th><th>{en ? "Entity" : "Entitas"}</th><th>{en ? "Summary" : "Ringkasan"}</th></tr></thead>
              <tbody>{rows.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap text-xs text-ink-500">{fmtDateTime(a.created_at, lang)}</td>
                  <td className="text-sm">{a.user_name ?? <span className="text-ink-400">system</span>}</td>
                  <td><Badge tone={tone(a.action)}>{a.action}</Badge></td>
                  <td className="text-xs text-ink-500">{a.entity_type}{a.entity_id && <div className="max-w-[140px] truncate font-mono text-[10px] text-ink-400" title={a.entity_id}>{a.entity_id}</div>}</td>
                  <td className="max-w-[460px] text-sm">{a.summary}
                    {(a.before_data || a.after_data) && (
                      <details className="mt-1 text-xs text-ink-500"><summary className="cursor-pointer">{en ? "details" : "detail"}</summary>
                        <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-canvas p-2 text-[11px]">{a.before_data ? `before: ${JSON.stringify(a.before_data, null, 1)}\n` : ""}{a.after_data ? `after: ${JSON.stringify(a.after_data, null, 1)}` : ""}</pre>
                      </details>
                    )}
                  </td>
                </tr>
              ))}</tbody></table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-line p-3 text-sm text-ink-500">
          <span>{total} {en ? "entries" : "entri"}</span>
          <span className="flex gap-3">
            {page > 1 && <Link href={qs({ page: String(page - 1) })} className="link">← {en ? "Newer" : "Lebih baru"}</Link>}
            {page * PAGE < total && <Link href={qs({ page: String(page + 1) })} className="link">{en ? "Older" : "Lebih lama"} →</Link>}
          </span>
        </div>
      </Card>
    </>
  );
}
