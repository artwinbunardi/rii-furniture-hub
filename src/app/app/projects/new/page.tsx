import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { q } from "@/lib/db";
import { PageHeader, Card } from "@/components/ui/misc";
import { hasPerm } from "@/lib/rbac";
import { ProjectForm } from "../project-form";

export const metadata = { title: "New project" };
export default async function NewProjectPage() {
  const user = await requireUser(["project.manage", "project.create"]);
  const { t, lang } = await getT();
  const users = await q(user.ctx, `SELECT id, name FROM users WHERE status = 'active' ORDER BY name`);
  return (
    <>
      <PageHeader breadcrumb={<Link href="/app/projects" className="hover:text-ink">{t("nav_projects")}</Link>} title={lang === "en" ? "New project" : "Proyek baru"} />
      <Card className="max-w-4xl p-5"><ProjectForm lang={lang} users={users} canManage={hasPerm(user.perms, "project.manage")} /></Card>
    </>
  );
}
