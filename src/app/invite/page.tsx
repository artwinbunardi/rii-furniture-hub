import { AuthShell } from "@/components/auth/auth-shell";
import { ResetForm } from "@/components/auth/simple-forms";
import { Alert } from "@/components/ui/misc";
import { getT } from "@/lib/i18n/server";
import { getPool } from "@/lib/db";
import { hashToken } from "@/lib/auth/crypto";

export const metadata = { title: "Accept invitation" };
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const { t, lang } = await getT();
  const row = token
    ? (await getPool().query(`SELECT u.name, u.email::text FROM auth_tokens a JOIN users u ON u.id = a.user_id WHERE a.token_hash = $1 AND a.kind = 'invite' AND a.used_at IS NULL AND a.expires_at > now()`, [hashToken(token)])).rows[0]
    : null;
  return (
    <AuthShell lang={lang} back={`/invite?token=${token ?? ""}`}>
      <h1 className="text-2xl font-semibold tracking-tight">{t("accept_invite")}</h1>
      {row ? (
        <>
          <p className="mb-6 mt-1.5 text-sm text-ink-500">{row.email}</p>
          <ResetForm lang={lang} token={token!} invite name={row.name} />
        </>
      ) : (
        <Alert tone="error" className="mt-6">{lang === "en" ? "This invitation link is invalid or has expired." : "Tautan undangan tidak valid atau sudah kedaluwarsa."}</Alert>
      )}
    </AuthShell>
  );
}
