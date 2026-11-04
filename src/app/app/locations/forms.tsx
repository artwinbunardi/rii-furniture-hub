"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { ActionForm, SubmitButton, ConfirmButton } from "@/components/ui/action-form";
import { Input, Checkbox } from "@/components/ui/field";
import { saveWarehouseAction, saveLocationAction, deleteLocationAction } from "../admin-actions";

export function WarehouseForm({ lang, wh }: { lang: "id" | "en"; wh?: { id: string; code: string; name: string; address: string | null } }) {
  const en = lang === "en";
  const router = useRouter();
  return (
    <ActionForm action={saveWarehouseAction} onSuccess={() => router.refresh()} resetOnSuccess={!wh} className="grid gap-2 md:grid-cols-[120px_1fr_1.4fr_auto]">
      {wh && <input type="hidden" name="id" value={wh.id} />}
      <Input name="code" defaultValue={wh?.code} placeholder={en ? "Code" : "Kode"} required className="font-mono uppercase" aria-label="code" />
      <Input name="name" defaultValue={wh?.name} placeholder={en ? "Warehouse name" : "Nama gudang"} required aria-label="name" />
      <Input name="address" defaultValue={wh?.address ?? ""} placeholder={en ? "Address" : "Alamat"} aria-label="address" />
      <SubmitButton size="sm">{wh ? (en ? "Save" : "Simpan") : (en ? "Add warehouse" : "Tambah gudang")}</SubmitButton>
    </ActionForm>
  );
}

export function LocationAdd({ lang, warehouseId }: { lang: "id" | "en"; warehouseId: string }) {
  const en = lang === "en";
  const router = useRouter();
  return (
    <ActionForm action={saveLocationAction} onSuccess={() => router.refresh()} resetOnSuccess className="flex flex-wrap gap-2">
      <input type="hidden" name="warehouse_id" value={warehouseId} />
      <Input name="code" placeholder={en ? "Code e.g. A-03" : "Kode mis. A-03"} required className="w-36 font-mono uppercase" aria-label="code" />
      <Input name="name" placeholder={en ? "Description (rack, zone…)" : "Keterangan (rak, zona…)"} className="min-w-[200px] flex-1" aria-label="name" />
      <SubmitButton size="sm" variant="outline">{en ? "Add location" : "Tambah lokasi"}</SubmitButton>
    </ActionForm>
  );
}

export function LocationRow({ lang, loc, warehouseId, products, canManage }: { lang: "id" | "en"; loc: { id: string; code: string; name: string; is_active: boolean }; warehouseId: string; products: number; canManage: boolean }) {
  const en = lang === "en";
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  if (edit) return (
    <li className="bg-canvas px-4 py-2">
      <ActionForm action={saveLocationAction} onSuccess={() => { router.refresh(); setEdit(false); }} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={loc.id} /><input type="hidden" name="warehouse_id" value={warehouseId} />
        <Input name="code" defaultValue={loc.code} required className="w-32 font-mono uppercase" aria-label="code" />
        <Input name="name" defaultValue={loc.name} className="min-w-[180px] flex-1" aria-label="name" />
        <Checkbox name="is_active" defaultChecked={loc.is_active} label={en ? "Active" : "Aktif"} />
        <SubmitButton size="sm">{en ? "Save" : "Simpan"}</SubmitButton>
        <button type="button" className="text-xs text-ink-500 underline" onClick={() => setEdit(false)}>{en ? "Cancel" : "Batal"}</button>
      </ActionForm>
    </li>
  );
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-2">
      <span className={loc.is_active ? "" : "text-ink-400 line-through"}><span className="font-mono text-sm">{loc.code}</span> <span className="text-sm text-ink-500">{loc.name !== loc.code ? loc.name : ""}</span></span>
      <span className="flex items-center gap-2">
        <span className="text-xs tabular-nums text-ink-500">{products} {en ? "products" : "produk"}</span>
        {canManage && <>
          <button type="button" onClick={() => setEdit(true)} className="rounded p-1.5 hover:bg-canvas" aria-label={en ? "Edit" : "Ubah"}><Pencil className="h-3.5 w-3.5" /></button>
          <ActionForm action={deleteLocationAction} onSuccess={() => router.refresh()} className="contents">
            <input type="hidden" name="id" value={loc.id} />
            <ConfirmButton size="sm" variant="ghost" title={en ? `Delete location ${loc.code}?` : `Hapus lokasi ${loc.code}?`} body={en ? "Only empty locations can be deleted." : "Hanya lokasi kosong yang dapat dihapus."} confirmLabel={en ? "Delete" : "Hapus"} cancelLabel={en ? "Cancel" : "Batal"}>{en ? "Delete" : "Hapus"}</ConfirmButton>
          </ActionForm>
        </>}
      </span>
    </li>
  );
}
