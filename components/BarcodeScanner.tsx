"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
}

/** Camera barcode/QR scanner using html5-qrcode (lazy-loaded). */
export function BarcodeScanner({ open, onClose, onDetected }: Props) {
  const containerId = "aethera-barcode-region";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 160 } },
          (decoded: string) => {
            onDetected(decoded);
            stop();
          },
          () => {}
        );
      } catch {
        /* camera unavailable */
      }
    })();

    const stop = async () => {
      const s = scannerRef.current;
      if (s) {
        try {
          await s.stop();
          await s.clear();
        } catch {
          /* ignore */
        }
        scannerRef.current = null;
      }
    };

    return () => {
      cancelled = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/80 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold">Scan Barcode / QR</h3>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]"
          >
            <X size={18} />
          </button>
        </div>
        <div id={containerId} className="overflow-hidden rounded-xl" />
        <p className="mt-3 text-center text-xs text-[var(--color-text-muted)]">
          Arahkan kamera ke barcode produk
        </p>
      </div>
    </div>,
    document.body
  );
}
