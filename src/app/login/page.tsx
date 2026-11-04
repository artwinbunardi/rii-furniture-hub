import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { Alert } from "@/components/ui/misc";
import { getCurrentUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { roleHome } from "@/lib/rbac";
import { getPool } from "@/lib/db";

export const metadata = { title: "Login" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(sp.next?.startsWith("/") ? sp.next : roleHome(user.roles));
  const { t, lang } = await getT();
  let demo: { email: string; role: string }[] = [];
  if (process.env.SHOW_DEMO_ACCOUNTS !== "false") {
    const { rows } = await getPool().query(
      `SELECT u.email::text, r.${lang === "en" ? "name_en" : "name_id"} AS role FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.code = ur.role_code
        WHERE u.is_demo AND u.status = 'active' ORDER BY r.sort, u.email`,
    );
    demo = rows;
  }
  return (
    <AuthShell lang={lang} back={`/login${sp.next ? `?next=${encodeURIComponent(sp.next)}` : ""}`}>
      <h1 className="text-2xl font-semibold tracking-tight">{t("login_title")}</h1>
      <p className="mb-6 mt-1.5 text-sm text-ink-500">{t("login_subtitle")}</p>
      {sp.reset && <Alert tone="success" className="mb-4">{lang === "en" ? "Password updated. Please sign in." : "Kata sandi diperbarui. Silakan masuk."}</Alert>}
      <LoginForm lang={lang} next={sp.next} demoAccounts={demo} />
    </AuthShell>
  );
}
