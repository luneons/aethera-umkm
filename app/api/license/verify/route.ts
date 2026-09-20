import { NextRequest, NextResponse } from "next/server";
import { verifyServerLicense } from "@/lib/server/license";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { key?: string; deviceId?: string };
    if (!body.key) {
      return NextResponse.json({ active: false, payload: null, reason: "Key wajib diisi" }, { status: 400 });
    }

    const status = await verifyServerLicense(body.key);
    if (status.active && status.payload?.device && status.payload.device !== (body.deviceId || "")) {
      return NextResponse.json({
        active: false,
        payload: status.payload,
        reason: "Lisensi ini terdaftar untuk perangkat lain. Hubungi admin untuk pindah perangkat.",
      });
    }
    return NextResponse.json(status);
  } catch {
    return NextResponse.json(
      { active: false, payload: null, reason: "Permintaan verifikasi tidak valid" },
      { status: 400 }
    );
  }
}
