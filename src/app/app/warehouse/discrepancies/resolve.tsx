"use client";
import { useRouter } from "next/navigation";
import { ActionForm, ConfirmButton } from "@/components/ui/action-form";
import { resolveDiscrepancyAction } from "../actions";

export function ResolveForm({ id, lang }: { id: string; lang: "id" | "en" }) {
  const router = useRouter();
  const en = lang === "en";
  return (
    <ActionForm action={resolveDiscrepancyAction} onSuccess={() => router.refresh()}>
      <input type="hidden" name="id" value={id} />
      <ConfirmButton variant="outline" size="sm" title={en ? "Resolve discrepancy" : "Selesaikan selisih"} body={en ? "Describe the resolution. If stock must change, also submit a stock adjustment." : "Jelaskan penyelesaian. Jika stok perlu diubah, ajukan juga penyesuaian stok."} confirmLabel={en ? "Resolve" : "Selesaikan"} cancelLabel={en ? "Cancel" : "Batal"} requireReason reasonName="resolution" reasonLabel={en ? "Resolution" : "Penyelesaian"}>{en ? "Resolve" : "Selesaikan"}</ConfirmButton>
    </ActionForm>
  );
}
