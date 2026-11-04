"use client";
import { useRouter } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Input, Select } from "@/components/ui/field";
import { damageOpAction } from "../actions";

export function DamageOps({ id, remaining, status, lang }: { id: string; remaining: number; status: string; lang: "id" | "en" }) {
  const en = lang === "en";
  const router = useRouter();
  const ops: [string, string][] = status === "in_repair"
    ? [["complete_repair", en ? "Repair completed → back to warehouse" : "Perbaikan selesai → kembali ke gudang"], ["start_repair", en ? "Send more units to repair" : "Kirim unit lain ke perbaikan"], ["write_off", en ? "Write off (beyond repair)" : "Hapus (tidak dapat diperbaiki)"]]
    : [["start_repair", en ? "Send to repair" : "Kirim ke perbaikan"], ["release", en ? "Approve for use (release)" : "Setujui untuk digunakan (lepas)"], ["write_off", en ? "Write off (beyond repair)" : "Hapus (tidak dapat diperbaiki)"]];
  return (
    <ActionForm action={damageOpAction} onSuccess={() => router.refresh()} className="mt-3 flex flex-wrap items-end gap-2 border-t border-line pt-3">
      <input type="hidden" name="id" value={id} />
      <Select name="op" className="w-auto min-w-[260px]">{ops.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
      <Input name="qty" type="number" min={1} max={remaining} defaultValue={remaining} className="w-24" aria-label="qty" />
      <Input name="note" placeholder={en ? "Note (required for write-off)" : "Catatan (wajib untuk penghapusan)"} className="min-w-[220px] flex-1" />
      <SubmitButton>{en ? "Apply" : "Terapkan"}</SubmitButton>
    </ActionForm>
  );
}
