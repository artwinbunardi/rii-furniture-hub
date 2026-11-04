import { AuthShell } from "@/components/auth/auth-shell";
import { ResetForm } from "@/components/auth/simple-forms";
import { Alert } from "@/components/ui/misc";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Reset password" };
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const { t, lang } = await getT();
  return (
    <AuthShell lang={lang} back={`/reset-password?token=${token ?? ""}`}>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{t("reset_password")}</h1>
      {token ? <ResetForm lang={lang} token={token} /> : <Alert tone="error">Token missing.</Alert>}
    </AuthShell>
  );
}
