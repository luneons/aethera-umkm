import { NextRequest, NextResponse } from "next/server";
import { recordActivation } from "@/lib/redis";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      key?: string;
      name?: string;
      deviceId?: string;
      plan?: string;
      expiry?: string;
    };

    if (!body.key || !body.name) {
      return NextResponse.json({ error: "key and name required" }, { status: 400 });
    }

    // Extract client IP from headers (Vercel sets x-forwarded-for)
    const ip =
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    const userAgent = req.headers.get("user-agent") || "unknown";

    await recordActivation({
      key:         body.key,
      name:        body.name,
      deviceId:    body.deviceId || "unknown",
      ip,
      plan:        body.plan || "unknown",
      expiry:      body.expiry || "unknown",
      activatedAt: new Date().toISOString(),
      userAgent,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[license/activate]", err);
    // Return 200 even on error so client doesn't see a failed activation
    return NextResponse.json({ ok: false });
  }
}
