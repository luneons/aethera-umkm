import { NextRequest, NextResponse } from "next/server";
import { generateServerLicense } from "@/lib/server/license";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { name?: string; deviceId?: string };
    const deviceId = String(body.deviceId ?? "").slice(0, 64).trim();
    if (!deviceId) {
      return NextResponse.json({ error: "Device ID tidak tersedia" }, { status: 400 });
    }
    const key = await generateServerLicense({
      name: String(body.name || "Trial").slice(0, 120).trim() || "Trial",
      plan: "premium",
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
      device: deviceId,
    });
    return NextResponse.json({ key }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membuat trial" },
      { status: 400 }
    );
  }
}
