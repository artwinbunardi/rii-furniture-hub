"use client";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { saveProjectAction } from "../admin-actions";
import { PROJECT_STATUS } from "@/lib/status";


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ProjectForm({ lang, project, users, canManage }: { lang: "id" | "en"; project?: any; users: { id: string; name: string }[]; canManage: boolean }) {
  const en = lang === "en";
  const p = project ?? {};
  const ro = !!p.id && !canManage;
  return (
    <ActionForm action={saveProjectAction} className="space-y-4">
      {p.id && <input type="hidden" name="id" value={p.id} />}
      <fieldset disabled={ro} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[180px_1fr]">
          <Field label={en ? "Code" : "Kode"} hint={p.id ? undefined : en ? "Empty = auto (PRJ-YYYY-NNN)" : "Kosong = otomatis (PRJ-YYYY-NNN)"}><Input name="code" defaultValue={p.code} readOnly={!!p.id} className="font-mono uppercase" placeholder="PRJ-2026-010" /></Field>
          <Field label={`${en ? "Project name" : "Nama proyek"} *`}><Input name="name" defaultValue={p.name} required minLength={3} /></Field>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label={en ? "Client" : "Klien"}><Input name="client_name" defaultValue={p.client_name ?? ""} /></Field>
          <Field label={en ? "Event" : "Acara"}><Input name="event_name" defaultValue={p.event_name ?? ""} /></Field>
          <Field label={en ? "Location" : "Lokasi"}><Input name="location" defaultValue={p.location ?? ""} /></Field>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <Field label={en ? "Start date" : "Tanggal mulai"}><Input type="date" name="start_date" defaultValue={p.start_date ?? ""} /></Field>
          <Field label={en ? "End date" : "Tanggal selesai"}><Input type="date" name="end_date" defaultValue={p.end_date ?? ""} /></Field>
          <Field label={en ? "Department" : "Departemen"}><Input name="department" defaultValue={p.department ?? ""} /></Field>
          <Field label="PIC"><Select name="pic_user_id" defaultValue={p.pic_user_id ?? ""}><option value="">{en ? "— me —" : "— saya —"}</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field>
        </div>
        {(canManage || !p.id) && (
          <Field label="Status"><Select name="status" defaultValue={p.status ?? "active"} className="max-w-xs">{Object.entries(PROJECT_STATUS).map(([k, v]) => <option key={k} value={k}>{en ? v[1] : v[0]}</option>)}</Select></Field>
        )}
        <Field label={en ? "Notes" : "Catatan"}><Textarea name="notes" defaultValue={p.notes ?? ""} rows={3} /></Field>
        {!ro && <SubmitButton>{p.id ? (en ? "Save project" : "Simpan proyek") : (en ? "Create project" : "Buat proyek")}</SubmitButton>}
      </fieldset>
      {ro && <p className="text-xs text-ink-500">{en ? "Only Warehouse Managers, Management and Admins can edit projects." : "Hanya Manajer Gudang, Manajemen, dan Admin yang dapat mengubah proyek."}</p>}
    </ActionForm>
  );
}
