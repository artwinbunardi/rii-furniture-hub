"use client";
import { useRouter } from "next/navigation";
import { ActionForm, ConfirmButton } from "@/components/ui/action-form";
import { adjustmentDecisionAction } from "../actions";

export function AdjustmentDecision({ id, lang }: { id: string; lang: "id" | "en" }) {
  const en = lang === "en";
  const router = useRouter();
  return (
    <div className="flex gap-1.5">
      <ActionForm action={adjustmentDecisionAction} onSuccess={() => router.refresh()}>
        <input type="hidden" name="id" value={id} /><input type="hidden" name="decision" value="approve" />
        <ConfirmButton variant="primary" size="sm" title={en ? "Approve adjustment?" : "Setujui penyesuaian?"} body={en ? "The inventory balance will change and be written to the ledger." : "Saldo inventaris akan berubah dan dicatat di buku besar."} confirmLabel={en ? "Approve" : "Setujui"} cancelLabel={en ? "Cancel" : "Batal"}>{en ? "Approve" : "Setujui"}</ConfirmButton>
      </ActionForm>
      <ActionForm action={adjustmentDecisionAction} onSuccess={() => router.refresh()}>
        <input type="hidden" name="id" value={id} /><input type="hidden" name="decision" value="reject" />
        <ConfirmButton variant="outline" size="sm" title={en ? "Reject adjustment" : "Tolak penyesuaian"} confirmLabel={en ? "Reject" : "Tolak"} cancelLabel={en ? "Cancel" : "Batal"} requireReason>{en ? "Reject" : "Tolak"}</ConfirmButton>
      </ActionForm>
    </div>
  );
}
