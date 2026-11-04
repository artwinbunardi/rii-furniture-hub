"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, Input, Select, Checkbox } from "@/components/ui/field";
import { inviteUserAction, updateUserAction, resendInviteAction, setRolePermissionAction } from "../admin-actions";

type Role = { code: string; name: string };

function InviteLink({ link, lang }: { link: string; lang: "id" | "en" }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
      <p className="mb-1">{lang === "en" ? "No SMTP server is configured, so the email was only written to the outbox. Share this one-time link with the user:" : "Server SMTP belum dikonfigurasi, jadi email hanya dicatat di kotak keluar. Bagikan tautan sekali pakai ini ke pengguna:"}</p>
      <div className="flex items-center gap-2"><code className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1">{link}</code>
        <button type="button" className="inline-flex items-center gap-1 rounded border border-amber-300 bg-white px-2 py-1" onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); }}><Copy className="h-3 w-3" />{copied ? "✓" : lang === "en" ? "Copy" : "Salin"}</button></div>
    </div>
  );
}

export function InviteForm({ lang, roles }: { lang: "id" | "en"; roles: Role[] }) {
  const en = lang === "en";
  const router = useRouter();
  const [link, setLink] = useState("");
  return (
    <div>
      <ActionForm action={inviteUserAction} resetOnSuccess onSuccess={(s) => { setLink(String(s?.data?.link ?? "")); router.refresh(); }} className="space-y-3">
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Email *"><Input name="email" type="email" required /></Field>
          <Field label={`${en ? "Name" : "Nama"} *`}><Input name="name" required /></Field>
          <Field label={en ? "Department" : "Departemen"}><Input name="department" /></Field>
          <Field label={en ? "Language" : "Bahasa"}><Select name="locale"><option value="id">Bahasa Indonesia</option><option value="en">English</option></Select></Field>
        </div>
        <div className="flex flex-wrap gap-4">{roles.map((r) => <Checkbox key={r.code} name="roles" value={r.code} defaultChecked={r.code === "decor"} label={r.name} />)}</div>
        <SubmitButton>{en ? "Send invitation" : "Kirim undangan"}</SubmitButton>
      </ActionForm>
      {link && <InviteLink link={link} lang={lang} />}
    </div>
  );
}

export function UserEditor({ lang, user, roles, isSelf }: { lang: "id" | "en"; user: { id: string; name: string; department: string | null; status: string; roles: string[] }; roles: Role[]; isSelf: boolean }) {
  const en = lang === "en";
  const router = useRouter();
  const [link, setLink] = useState("");
  return (
    <div className="space-y-3">
      <ActionForm action={updateUserAction} onSuccess={() => router.refresh()} className="space-y-3">
        <input type="hidden" name="id" value={user.id} />
        <div className="grid gap-3 md:grid-cols-3">
          <Field label={en ? "Name" : "Nama"}><Input name="name" defaultValue={user.name} required /></Field>
          <Field label={en ? "Department" : "Departemen"}><Input name="department" defaultValue={user.department ?? ""} /></Field>
          <Field label="Status">
            <Select name="status" defaultValue={user.status} disabled={isSelf}>
              {user.status === "invited" && <option value="invited">{en ? "Invited" : "Diundang"}</option>}
              {user.status !== "invited" && <option value="active">{en ? "Active" : "Aktif"}</option>}
              <option value="disabled">{en ? "Disabled (cannot sign in)" : "Nonaktif (tidak bisa login)"}</option>
            </Select>
            {isSelf && <input type="hidden" name="status" value={user.status} />}
          </Field>
        </div>
        <div className="flex flex-wrap gap-4">{roles.map((r) => <Checkbox key={r.code} name="roles" value={r.code} defaultChecked={user.roles.includes(r.code)} label={r.name} />)}</div>
        <SubmitButton size="sm">{en ? "Save user" : "Simpan pengguna"}</SubmitButton>
      </ActionForm>
      {user.status === "invited" && (
        <ActionForm action={resendInviteAction} onSuccess={(s) => setLink(String(s?.data?.link ?? ""))}>
          <input type="hidden" name="id" value={user.id} />
          <SubmitButton size="sm" variant="outline">{en ? "Create new invitation link" : "Buat tautan undangan baru"}</SubmitButton>
        </ActionForm>
      )}
      {link && <InviteLink link={link} lang={lang} />}
    </div>
  );
}

export function PermToggle({ role, perm, on, locked }: { role: string; perm: string; on: boolean; locked: boolean }) {
  const router = useRouter();
  return (
    <ActionForm action={setRolePermissionAction} onSuccess={() => router.refresh()} showMessages={false} className="flex justify-center">
      <input type="hidden" name="role" value={role} /><input type="hidden" name="perm" value={perm} /><input type="hidden" name="on" value={on ? "0" : "1"} />
      <button type="submit" disabled={locked} aria-pressed={on} aria-label={`${role} ${perm}`}
        className={`h-5 w-5 rounded border text-[11px] leading-none ${on ? "border-ink bg-ink text-white" : "border-line bg-white text-transparent hover:border-ink-400"} ${locked ? "cursor-not-allowed opacity-60" : ""}`}>✓</button>
    </ActionForm>
  );
}
