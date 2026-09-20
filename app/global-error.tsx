"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <html lang="id" data-theme="dark">
      <body className="grid min-h-dvh place-items-center bg-[#0d0f14] p-6 text-white">
        <main className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1d24] p-6 text-center shadow-2xl">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-red-500/15 text-2xl">⚠️</div>
          <h1 className="text-xl font-bold">Aplikasi mengalami masalah</h1>
          <p className="mt-2 text-sm text-gray-400">
            Data lokal tetap aman. Silakan coba muat ulang halaman.
          </p>
          <button
            onClick={reset}
            className="mt-5 w-full rounded-xl bg-amber-500 px-4 py-3 font-bold text-black"
          >
            Coba Lagi
          </button>
        </main>
      </body>
    </html>
  );
}
