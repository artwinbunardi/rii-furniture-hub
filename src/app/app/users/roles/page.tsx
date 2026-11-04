import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { q } from "@/lib/db";
import { PageHeader, Card } from "@/components/ui/misc";
import { PERMISSIONS } from "@/lib/rbac";
import { PermToggle } from "../forms";

export const metadata = { title: "Role permissions" };
export default async function RolesPage() {
  const me = await requireUser("users.manage");
  const { t, lang } = await getT();
  const en = lang === "en";
  const [roles, rp] = await Promise.all([
    q(me.ctx, `SELECT code, name_id, name_en FROM roles ORDER BY sort`),
    q(me.ctx, `SELECT role_code, permission_code FROM role_permissions`),
  ]);
  const has = new Set(rp.map((r) => `${r.role_code}|${r.permission_code}`));
  const modules = [...new Set(Object.values(PERMISSIONS).map((p) => p.module))];
  return (
    <>
      <PageHeader breadcrumb={<Link href="/app/users" className="hover:text-ink">{t("nav_users")}</Link>} title={en ? "Role permissions" : "Izin per peran"}
        subtitle={en ? "Changes apply on the user's next request and are enforced by the server and the database. Administrator always has all permissions." : "Perubahan berlaku pada permintaan berikutnya dan ditegakkan oleh server serta database. Administrator selalu memiliki semua izin."} />
      <Card>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>{en ? "Permission" : "Izin"}</th>{roles.map((r) => <th key={r.code} className="text-center">{en ? r.name_en : r.name_id}</th>)}</tr></thead>
            <tbody>
              {modules.map((m) => [
                <tr key={m}><td colSpan={roles.length + 1} className="bg-canvas text-[11px] font-semibold uppercase tracking-wide text-ink-500">{m}</td></tr>,
                ...Object.entries(PERMISSIONS).filter(([, p]) => p.module === m).map(([code, p]) => (
                  <tr key={code}>
                    <td><span className="font-mono text-xs">{code}</span><div className="text-xs text-ink-500">{p.description}</div></td>
                    {roles.map((r) => <td key={r.code}><PermToggle role={r.code} perm={code} on={r.code === "admin" || has.has(`${r.code}|${code}`)} locked={r.code === "admin"} /></td>)}
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
