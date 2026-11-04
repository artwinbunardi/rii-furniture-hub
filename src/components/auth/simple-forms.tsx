"use client";
import Link from "next/link";
import { forgotPasswordAction, resetPasswordAction, acceptInviteAction } from "@/app/auth-actions";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Input, Field } from "@/components/ui/field";
import { tr, type Lang } from "@/lib/i18n/dict";

export function ForgotForm({ lang }: { lang: Lang }) {
  const t = (k: string) => tr(lang, k);
  return (
    <ActionForm action={forgotPasswordAction} className="space-y-4">
      <Field label={t("email")}><Input name="email" type="email" required autoComplete="email" /></Field>
      <SubmitButton className="w-full" size="lg">{t("send_reset_link")}</SubmitButton>
      <p className="text-center text-sm"><Link className="link" href="/login">{t("back")}</Link></p>
    </ActionForm>
  );
}

export function ResetForm({ lang, token, invite, name }: { lang: Lang; token: string; invite?: boolean; name?: string }) {
  const t = (k: string) => tr(lang, k);
  return (
    <ActionForm action={invite ? acceptInviteAction : resetPasswordAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {invite && <Field label={t("name")}><Input name="name" defaultValue={name} required /></Field>}
      <Field label={t("new_password")} hint={t("password_rule")}><Input name="password" type="password" required autoComplete="new-password" minLength={8} /></Field>
      <Field label={t("confirm_password")}><Input name="confirm" type="password" required autoComplete="new-password" /></Field>
      <SubmitButton className="w-full" size="lg">{invite ? t("accept_invite") : t("reset_password")}</SubmitButton>
    </ActionForm>
  );
}
