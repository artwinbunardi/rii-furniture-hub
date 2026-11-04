"use client";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/field";
import { updateProfileAction, changePasswordAction } from "@/app/app/profile/actions";
import { tr, type Lang } from "@/lib/i18n/dict";

export function ProfileForms({ lang, user }: { lang: Lang; user: { name: string; email: string; phone: string | null; department: string | null } }) {
  const t = (k: string) => tr(lang, k);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card p-5">
        <h2 className="mb-4 font-semibold">{t("profile")}</h2>
        <ActionForm action={updateProfileAction} className="space-y-4">
          <Field label={t("email")}><Input value={user.email} disabled readOnly /></Field>
          <Field label={t("name")}><Input name="name" defaultValue={user.name} required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("department")}><Input name="department" defaultValue={user.department ?? ""} /></Field>
            <Field label="Telepon / Phone"><Input name="phone" defaultValue={user.phone ?? ""} /></Field>
          </div>
          <SubmitButton>{t("save")}</SubmitButton>
        </ActionForm>
      </div>
      <div className="card p-5">
        <h2 className="mb-4 font-semibold">{t("password")}</h2>
        <ActionForm action={changePasswordAction} className="space-y-4" resetOnSuccess>
          <Field label={lang === "en" ? "Current password" : "Kata sandi saat ini"}><Input name="current" type="password" required autoComplete="current-password" /></Field>
          <Field label={t("new_password")} hint={t("password_rule")}><Input name="password" type="password" required autoComplete="new-password" /></Field>
          <Field label={t("confirm_password")}><Input name="confirm" type="password" required autoComplete="new-password" /></Field>
          <SubmitButton>{t("update")}</SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}
