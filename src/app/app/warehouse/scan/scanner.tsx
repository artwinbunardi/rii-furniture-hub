"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { resolveCodeAction } from "../actions";

// Camera scanning uses the browser's native BarcodeDetector API (Chrome/Edge on Android, ChromeOS, macOS).
// Where it is unavailable we say so and the manual / USB-scanner input remains fully functional.
export function Scanner({ lang }: { lang: "id" | "en" }) {
  const en = lang === "en";
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [active, setActive] = useState(false);
  const [err, setErr] = useState("");
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => { setSupported(typeof window !== "undefined" && "BarcodeDetector" in window); inputRef.current?.focus(); }, []);
  useEffect(() => () => stop(), []);

  function stop() { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; setActive(false); }

  async function start() {
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      const v = videoRef.current!;
      v.srcObject = stream; await v.play(); setActive(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector = new (window as any).BarcodeDetector({ formats: ["qr_code", "code_128", "code_39", "ean_13"] });
      const tick = async () => {
        if (!streamRef.current) return;
        try {
          const codes = await detector.detect(v);
          if (codes.length) {
            inputRef.current!.value = codes[0].rawValue;
            stop(); (document.getElementById("scan-form") as HTMLFormElement | null)?.requestSubmit(); return;
          }
        } catch { /* frame not ready */ }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch (e) {
      setErr(en ? `Camera unavailable: ${(e as Error).message}` : `Kamera tidak tersedia: ${(e as Error).message}`);
      stop();
    }
  }

  return (
    <div className="space-y-4">
      <ActionForm id="scan-form" action={resolveCodeAction} className="flex flex-wrap gap-2">
        <Input ref={inputRef} name="code" required autoComplete="off" placeholder={en ? "Scan or type SKU, asset code or RES number" : "Pindai atau ketik SKU, kode aset, atau nomor RES"} className="min-w-[260px] flex-1 font-mono" />
        <SubmitButton>{en ? "Open" : "Buka"}</SubmitButton>
      </ActionForm>
      <p className="text-xs text-ink-500">{en ? "USB/Bluetooth barcode scanners work here too: they type the code and press Enter." : "Pemindai barcode USB/Bluetooth juga berfungsi di sini: alat mengetik kode lalu menekan Enter."}</p>
      {supported === false && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{en ? "This browser does not support camera barcode detection (BarcodeDetector). Use Chrome/Edge on Android, or type the code above." : "Browser ini tidak mendukung deteksi barcode kamera (BarcodeDetector). Gunakan Chrome/Edge di Android, atau ketik kode di atas."}</p>}
      {supported && (
        <div className="space-y-2">
          {active ? <Button type="button" variant="outline" onClick={stop}><CameraOff className="h-4 w-4" />{en ? "Stop camera" : "Matikan kamera"}</Button>
            : <Button type="button" variant="outline" onClick={start}><Camera className="h-4 w-4" />{en ? "Scan with camera" : "Pindai dengan kamera"}</Button>}
          <video ref={videoRef} playsInline muted className={active ? "w-full max-w-md rounded-xl border border-line bg-black" : "hidden"} />
        </div>
      )}
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
