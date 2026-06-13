"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Camera, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { scanReceipt } from "@/lib/utils/ocr";
import { formatRupiah } from "@/lib/utils/format";
import { toast } from "@/lib/stores/useToastStore";

interface Props {
  open: boolean;
  onClose: () => void;
  onAmount: (amount: number) => void;
}

/** Receipt OCR scanner — pick/take a photo, extract the total amount. */
export function ReceiptScanner({ open, onClose, onAmount }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [detected, setDetected] = useState<number[]>([]);
  const [best, setBest] = useState<number | null>(null);

  const reset = () => {
    setScanning(false);
    setProgress(0);
    setPreview(null);
    setDetected([]);
    setBest(null);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setScanning(true);
    setProgress(0);
    try {
      const res = await scanReceipt(file, setProgress);
      setDetected(Array.from(new Set(res.amounts)).sort((a, b) => b - a).slice(0, 6));
      setBest(res.bestAmount);
      if (!res.bestAmount) toast.error("Tidak menemukan nominal. Coba foto lebih jelas.");
    } catch {
      toast.error("Gagal memindai gambar");
    } finally {
      setScanning(false);
    }
  };

  const confirm = (amount: number) => {
    onAmount(amount);
    reset();
    onClose();
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/80 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold">Scan Nota / Struk</h3>
          <button
            onClick={() => {
              reset();
              onClose();
            }}
            aria-label="Tutup"
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]"
          >
            <X size={18} />
          </button>
        </div>

        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Pratinjau nota"
            className="mb-3 max-h-48 w-full rounded-xl object-contain"
          />
        )}

        {scanning ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <Loader2 className="animate-spin text-[var(--color-accent-gold)]" size={28} />
            <p className="text-sm text-[var(--color-text-secondary)]">
              Memindai... {progress}%
            </p>
          </div>
        ) : detected.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Pilih nominal yang benar:
            </p>
            {best && (
              <button
                onClick={() => confirm(best)}
                className="flex items-center justify-between rounded-xl border border-[var(--color-accent-gold)] bg-[var(--color-accent-gold)]/10 px-4 py-3"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Check size={16} className="text-[var(--color-accent-gold)]" />
                  {formatRupiah(best)}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">disarankan</span>
              </button>
            )}
            <div className="grid grid-cols-2 gap-2">
              {detected
                .filter((a) => a !== best)
                .map((a) => (
                  <button
                    key={a}
                    onClick={() => confirm(a)}
                    className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-bg-elevated)]"
                  >
                    {formatRupiah(a)}
                  </button>
                ))}
            </div>
            <Button variant="ghost" onClick={() => fileRef.current?.click()}>
              Foto ulang
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Ambil foto struk/nota, AI akan mendeteksi nominal totalnya otomatis.
            </p>
            <Button onClick={() => fileRef.current?.click()}>
              <Camera size={18} /> Ambil / Pilih Foto
            </Button>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>,
    document.body
  );
}
