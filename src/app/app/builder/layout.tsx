import { requireUser } from "@/lib/auth/session";
import { getLang } from "@/lib/i18n/server";
import { BuilderNav } from "@/components/builder/builder-nav";

export default async function BuilderLayout({ children }: { children: React.ReactNode }) {
  await requireUser(["website.edit", "media.manage"]);
  const lang = await getLang();
  return <BuilderNav lang={lang}>{children}</BuilderNav>;
}
