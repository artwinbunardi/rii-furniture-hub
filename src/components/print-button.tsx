"use client";
import { Printer } from "lucide-react";
import { buttonClass } from "./ui/button";
export function PrintButton({ label }: { label: string }) {
  return <button type="button" className={buttonClass("outline")} onClick={() => window.print()}><Printer className="h-4 w-4" />{label}</button>;
}
