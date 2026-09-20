import { NextRequest, NextResponse } from "next/server";
import { getActivationByKey, recordActivation } from "@/lib/redis";
import { verifyServerLicense } from "@/lib/server/license";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      key?: string;
      deviceId?: string;
    };

    if (!body.key) {
      return NextResponse.json({ error: "key wajib diisi" }, { status: 400 });
    }

    const license = await verifyServerLicense(body.key);
    if (!license.active || !license.payload) {
      return NextResponse.json(
        { ok: false, error: license.reason ?? "Lisensi tidak valid" },
        { status: 400 }
      );
    }

    if (license.payload.device && license.payload.device !== (body.deviceId || "")) {
      return NextResponse.json(
        { ok: false, error: "Lisensi ini terdaftar untuk perangkat lain." },
        { status: 409 }
      );
    }

    // Extract client IP from headers (Vercel sets x-forwarded-for)
    const ip =
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    const userAgent = req.headers.get("user-agent") || "unknown";

    const existing = await getActivationByKey(body.key);
    if (existing && existing.deviceId !== (body.deviceId || "unknown")) {
      return NextResponse.json(
        { ok: false, error: "Lisensi ini sudah digunakan pada perangkat lain." },
        { status: 409 }
      );
    }

    await recordActivation({
      key:         body.key,
      name:        license.payload.name,
      deviceId:    body.deviceId || "unknown",
      ip,
      plan:        license.payload.plan,
      expiry:      license.payload.exp ? new Date(license.payload.exp).toISOString() : "Lifetime",
      activatedAt: new Date().toISOString(),
      userAgent,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[license/activate]", err);
    // Monitoring is best-effort; activation itself must not crash the client.
    return NextResponse.json({ ok: false, error: "Monitoring aktivasi tidak tersedia" });
  }
}
