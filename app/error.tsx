"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[route error]", error);
  }, [error]);

  return (
    <main className="grid min-h-[70dvh] place-items-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-danger)]/30 bg-[var(--color-bg-card)] p-6 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--color-danger)]/10 text-2xl">⚠️</div>
        <h1 className="font-heading text-xl font-bold">Halaman tidak dapat dimuat</h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Terjadi kesalahan sementara. Data lokal tidak dihapus.
        </p>
        <button
          onClick={reset}
          className="mt-5 rounded-xl bg-[var(--color-accent-gold)] px-5 py-3 font-bold text-black"
        >
          Coba Lagi
        </button>
      </div>
    </main>
  );
}
