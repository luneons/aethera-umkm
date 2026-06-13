"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, QrCode } from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { Button } from "@/components/ui/Button";
import { getSetting } from "@/lib/db/queries/settings";
import { buildDynamicQris, looksLikeQris } from "@/lib/utils/qris";
import { formatRupiah } from "@/lib/utils/format";

export const QRIS_STATIC_SETTING = "qris_static";

interface Props {
  open: boolean;
  onClose: () => void;
  amount: number;
}

export function QrisModal({ open, onClose, amount }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasStatic, setHasStatic] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    (async () => {
      const staticQris = await getSetting(QRIS_STATIC_SETTING);
      if (!staticQris || !looksLikeQris(staticQris)) {
        setHasStatic(false);
        return;
      }
      setHasStatic(true);
      try {
        const { payload } = buildDynamicQris(staticQris, amount);
        if (canvasRef.current) {
          await QRCode.toCanvas(canvasRef.current, payload, {
            width: 240,
            margin: 1,
            color: { dark: "#000000", light: "#ffffff" },
          });
        }
      } catch {
        setError("Gagal membuat QRIS. Periksa kode QRIS statis di Pengaturan.");
      }
    })();
  }, [open, amount]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/80 p-4">
      <div className="w-full max-w-xs rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-bold">
            <QrCode size={18} className="text-[var(--color-accent-gold)]" /> Bayar QRIS
          </h3>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]"
          >
            <X size={18} />
          </button>
        </div>

        {hasStatic === false ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Kode QRIS statis belum diatur. Tambahkan di Pengaturan agar bisa membuat QR
              pembayaran dengan nominal otomatis.
            </p>
            <Link href="/pengaturan">
              <Button onClick={onClose}>Ke Pengaturan</Button>
            </Link>
          </div>
        ) : error ? (
          <p className="py-6 text-center text-sm text-[var(--color-danger)]">{error}</p>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-xl bg-white p-3">
              <canvas ref={canvasRef} />
            </div>
            <div className="text-center">
              <p className="text-xs text-[var(--color-text-muted)]">Total tagihan</p>
              <p className="text-xl font-bold text-[var(--color-accent-gold)]">
                {formatRupiah(amount)}
              </p>
            </div>
            <p className="text-center text-xs text-[var(--color-text-muted)]">
              Tunjukkan ke pelanggan untuk dipindai. Pembayaran diproses oleh aplikasi
              bank/e-wallet pelanggan.
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
