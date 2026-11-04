import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotForm } from "@/components/auth/simple-forms";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Forgot password" };
export default async function Page() {
  const { t, lang } = await getT();
  return (
    <AuthShell lang={lang} back="/forgot-password">
      <h1 className="text-2xl font-semibold tracking-tight">{t("reset_password")}</h1>
      <p className="mb-6 mt-1.5 text-sm text-ink-500">{lang === "en" ? "Enter your email and we will send you a reset link." : "Masukkan email Anda dan kami akan mengirim tautan atur ulang."}</p>
      <ForgotForm lang={lang} />
    </AuthShell>
  );
}
