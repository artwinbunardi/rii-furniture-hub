import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { q } from "@/lib/db";
import { PageHeader, Card, CardHeader, Badge } from "@/components/ui/misc";
import { Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { fmtDateTime } from "@/lib/utils";
import { InviteForm, UserEditor } from "./forms";

export const metadata = { title: "Users" };
export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string; status?: string; edit?: string }> }) {
  const me = await requireUser("users.manage");
  const { t, lang } = await getT();
  const en = lang === "en";
  const sp = await searchParams;
  const params: unknown[] = []; const where = ["true"];
  if (sp.q) { params.push(`%${sp.q}%`); where.push(`(u.name ILIKE $${params.length} OR u.email::text ILIKE $${params.length})`); }
  if (sp.status) { params.push(sp.status); where.push(`u.status = $${params.length}`); }
  if (sp.role) { params.push(sp.role); where.push(`EXISTS (SELECT 1 FROM user_roles x WHERE x.user_id = u.id AND x.role_code = $${params.length})`); }
  const [users, rolesRaw] = await Promise.all([
    q(me.ctx, `SELECT u.id, u.email::text, u.name, u.department, u.status, u.is_demo, u.last_login_at, coalesce(array_agg(ur.role_code ORDER BY ur.role_code) FILTER (WHERE ur.role_code IS NOT NULL), '{}') AS roles
      FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id WHERE ${where.join(" AND ")} GROUP BY u.id ORDER BY u.status, u.name`, params),
    q(me.ctx, `SELECT code, name_id, name_en FROM roles ORDER BY sort`),
  ]);
  const roles = rolesRaw.map((r) => ({ code: r.code, name: en ? r.name_en : r.name_id }));
  const roleName = (c: string) => roles.find((r) => r.code === c)?.name ?? c;
  const stTone = (s: string) => (s === "active" ? "green" : s === "invited" ? "amber" : "gray") as "green";
  return (
    <>
      <PageHeader title={t("nav_users")} subtitle={en ? "Invite people, assign roles and disable access. Disabling signs the user out everywhere." : "Undang pengguna, atur peran, dan nonaktifkan akses. Menonaktifkan akan mengeluarkan pengguna dari semua sesi."}
        actions={<Link href="/app/users/roles" className="text-sm text-ink-500 hover:text-ink">{en ? "Role permissions →" : "Izin per peran →"}</Link>} />
      <Card className="mb-6"><CardHeader title={en ? "Invite a user" : "Undang pengguna"} /><div className="p-4"><InviteForm lang={lang} roles={roles} /></div></Card>
      <Card>
        <form className="flex flex-wrap gap-2 border-b border-line p-3">
          <Input name="q" defaultValue={sp.q} placeholder={en ? "Name or email" : "Nama atau email"} className="max-w-xs" />
          <Select name="role" defaultValue={sp.role ?? ""} className="w-48"><option value="">{en ? "All roles" : "Semua peran"}</option>{roles.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}</Select>
          <Select name="status" defaultValue={sp.status ?? ""} className="w-40"><option value="">{t("all")}</option><option value="active">active</option><option value="invited">invited</option><option value="disabled">disabled</option></Select>
          <Button type="submit" variant="outline">{t("filter")}</Button>
        </form>
        <ul className="divide-y divide-line">
          {users.map((u) => (
            <li key={u.id}>
              <details open={sp.edit === u.id}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 hover:bg-canvas">
                  <span className="min-w-0"><span className="font-medium">{u.name}</span>{u.id === me.id && <span className="ml-1 text-xs text-ink-400">({en ? "you" : "Anda"})</span>}<span className="block text-xs text-ink-500">{u.email}{u.department ? ` · ${u.department}` : ""}</span></span>
                  <span className="flex flex-wrap items-center justify-end gap-1.5">
                    {u.roles.map((r: string) => <Badge key={r} tone="slate">{roleName(r)}</Badge>)}
                    <Badge tone={stTone(u.status)}>{u.status}</Badge>
                    <span className="hidden w-36 text-right text-xs text-ink-400 md:inline">{u.last_login_at ? fmtDateTime(u.last_login_at, lang) : "—"}</span>
                  </span>
                </summary>
                <div className="border-t border-line bg-canvas/50 p-4"><UserEditor lang={lang} user={u} roles={roles} isSelf={u.id === me.id} /></div>
              </details>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
