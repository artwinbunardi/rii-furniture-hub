import { ShieldAlert } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { getT } from "@/lib/i18n/server";

export default async function Forbidden() {
  const { t } = await getT();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="rounded-full bg-red-50 p-4 text-red-600"><ShieldAlert className="h-7 w-7" /></div>
      <h1 className="mt-4 text-xl font-semibold">{t("forbidden_title")}</h1>
      <p className="mt-1 text-sm text-ink-500">{t("forbidden_body")}</p>
      <div className="mt-6 flex gap-2"><LinkButton href="/" variant="outline">{t("nav_catalog")}</LinkButton><LinkButton href="/login">{t("login")}</LinkButton></div>
    </div>
  );
}
