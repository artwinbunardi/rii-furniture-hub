"use client";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, Input, Select, Checkbox } from "@/components/ui/field";
import { saveSettingsAction } from "../admin-actions";

type Def = { key: string; type: string; min?: number; max?: number; options?: string[]; label: string; hint?: string; value: unknown; locked?: boolean };

export function SettingsForm({ lang, defs }: { lang: "id" | "en"; defs: Def[] }) {
  return (
    <ActionForm action={saveSettingsAction} className="space-y-4">
      {defs.map((d) => (
        d.type === "bool"
          ? <div key={d.key}><Checkbox name={d.key} defaultChecked={!!d.value} disabled={d.locked} label={d.label} />{d.locked && <input type="hidden" name={d.key} value="on" />}{d.hint && <p className="ml-6 mt-1 text-xs text-ink-500">{d.hint}</p>}</div>
          : <Field key={d.key} label={d.label} hint={d.hint}>
              {d.type === "select"
                ? <Select name={d.key} defaultValue={String(d.value ?? "")} className="max-w-xs">{d.options!.map((o) => <option key={o} value={o}>{o === "id" ? "Bahasa Indonesia" : o === "en" ? "English" : o}</option>)}</Select>
                : <Input name={d.key} type={d.type === "text" ? "text" : "number"} step={d.type === "number" ? "0.05" : "1"} min={d.min} max={d.max} defaultValue={String(d.value ?? "")} className={d.type === "text" ? "max-w-md" : "max-w-[160px]"} required />}
            </Field>
      ))}
      <SubmitButton>{lang === "en" ? "Save settings" : "Simpan pengaturan"}</SubmitButton>
    </ActionForm>
  );
}
