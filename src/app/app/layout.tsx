import Link from "next/link";
import { headers } from "next/headers";
import { LogOut, Store, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { hasPerm, ROLES } from "@/lib/rbac";
import { NAV } from "@/components/app-shell/nav";
import { Sidebar } from "@/components/app-shell/sidebar";
import { LangSwitch } from "@/components/lang-switch";
import { logoutAction } from "@/app/auth-actions";
import { DICT } from "@/lib/i18n/dict";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const { t, lang } = await getT();
  const path = (await headers()).get("x-pathname") ?? "/app";
  // the visual editor is a full-screen workspace without the app shell
  if (path.startsWith("/app/builder/editor")) return <div className="h-screen overflow-hidden bg-[#f4f4f5]">{children}</div>;
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.perm || (Array.isArray(i.perm) ? i.perm : [i.perm]).some((p) => hasPerm(user.perms, p))) })).filter((g) => g.items.length);
  const labels = Object.fromEntries(Object.keys(DICT).filter((k) => k.startsWith("nav_")).map((k) => [k, t(k)]));
  const roleNames = user.roles.map((r) => ROLES.find((x) => x.code === r)?.[lang === "en" ? "name_en" : "name_id"] ?? r).join(", ");
  const footer = (
    <div className="space-y-2">
      <Link href="/" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-ink-500 hover:bg-canvas hover:text-ink"><Store className="h-4 w-4" />{t("open_catalog")}</Link>
      <div className="flex items-center gap-2.5 rounded-lg bg-canvas px-2.5 py-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[12px] font-semibold text-white">
          {user.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
        </div>
        <Link href="/app/profile" className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-ink">{user.name}</p>
          <p className="truncate text-[11px] text-ink-400">{roleNames}</p>
        </Link>
        <form action={logoutAction}><button title={t("logout")} aria-label={t("logout")} className="rounded-md p-1.5 text-ink-400 hover:bg-white hover:text-ink"><LogOut className="h-4 w-4" /></button></form>
      </div>
      <div className="flex items-center justify-between px-1">
        <Link href="/app/profile" className="inline-flex items-center gap-1 text-[12px] text-ink-400 hover:text-ink"><UserRound className="h-3.5 w-3.5" />{t("profile")}</Link>
        <LangSwitch lang={lang} back={path} />
      </div>
    </div>
  );
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Sidebar groups={groups} labels={labels} footer={footer} />
      <main className="lg:pl-[248px]">
        <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}
