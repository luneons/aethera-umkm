"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTxDrawer } from "@/lib/stores/useTxDrawer";

export default function TambahPembelianPage() {
  const router = useRouter();
  const openDrawer = useTxDrawer((s) => s.openDrawer);

  useEffect(() => {
    router.replace("/pembelian");
    openDrawer("pembelian");
  }, [router, openDrawer]);

  return null;
}
