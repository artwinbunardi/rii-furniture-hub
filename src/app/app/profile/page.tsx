import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { getPool } from "@/lib/db";
import { PageHeader, Badge } from "@/components/ui/misc";
import { ProfileForms } from "@/components/profile-forms";
import { ROLES } from "@/lib/rbac";

export const metadata = { title: "Profile" };
export default async function ProfilePage() {
  const u = await requireUser();
  const { t, lang } = await getT();
  const { rows } = await getPool().query(`SELECT name, email::text, phone, department FROM users WHERE id = $1`, [u.id]);
  return (
    <>
      <PageHeader title={t("my_account")} subtitle={<span className="flex flex-wrap gap-1.5">{u.roles.map((r) => <Badge key={r} tone="gold">{ROLES.find((x) => x.code === r)?.[lang === "en" ? "name_en" : "name_id"]}</Badge>)}</span>} />
      <ProfileForms lang={lang} user={rows[0]} />
    </>
  );
}
