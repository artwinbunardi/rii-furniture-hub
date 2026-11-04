"use client";
import Link from "next/link";
import { useRef } from "react";
import { loginAction } from "@/app/auth-actions";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Input, Field, Checkbox } from "@/components/ui/field";
import { tr, type Lang } from "@/lib/i18n/dict";

export function LoginForm({ lang, next, demoAccounts }: { lang: Lang; next?: string; demoAccounts?: { email: string; role: string }[] }) {
  const t = (k: string) => tr(lang, k);
  const emailRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <ActionForm action={loginAction} className="space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label={t("email")} htmlFor="email">
          <Input ref={emailRef} id="email" name="email" type="email" autoComplete="email" required placeholder="nama@rii.co.id" />
        </Field>
        <Field label={<span className="flex justify-between"><span>{t("password")}</span><Link href="/forgot-password" className="text-[12px] font-normal text-ink-500 hover:text-ink">{t("forgot_password")}</Link></span>} htmlFor="password">
          <Input ref={pwRef} id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <Checkbox name="remember" label={t("remember_me")} defaultChecked />
        <SubmitButton className="w-full" size="lg">{t("login")}</SubmitButton>
      </ActionForm>
      {demoAccounts && demoAccounts.length > 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-line p-4">
          <p className="text-[12px] font-medium uppercase tracking-wide text-ink-400">{t("demo_accounts")} · Demo1234!</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {demoAccounts.map((a) => (
              <button key={a.email} type="button" data-testid={`demo-${a.email}`}
                onClick={() => { if (emailRef.current && pwRef.current) { emailRef.current.value = a.email; pwRef.current.value = "Demo1234!"; } }}
                className="rounded-lg bg-canvas px-2.5 py-1.5 text-left text-[12px] hover:bg-line">
                <span className="block font-medium text-ink">{a.role}</span>
                <span className="block truncate text-ink-400">{a.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
