"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTxDrawer } from "@/lib/stores/useTxDrawer";

export default function TambahPenjualanPage() {
  const router = useRouter();
  const openDrawer = useTxDrawer((s) => s.openDrawer);

  useEffect(() => {
    router.replace("/penjualan");
    openDrawer("penjualan");
  }, [router, openDrawer]);

  return null;
}
