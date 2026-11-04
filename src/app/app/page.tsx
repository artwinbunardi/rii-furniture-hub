import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { roleHome } from "@/lib/rbac";

export default async function AppIndex() {
  const u = await requireUser();
  const home = roleHome(u.roles);
  redirect(home === "/" ? "/app/profile" : home);
}
