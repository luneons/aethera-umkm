import { NextRequest, NextResponse } from "next/server";
import { createAdminCookieValue, ADMIN_COOKIE_NAME, ADMIN_COOKIE_TTL_SECONDS } from "@/lib/server/adminAuth";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { password?: string };
    const configuredPassword = process.env.ADMIN_PASSWORD;
    if (!configuredPassword || !body.password || body.password !== configuredPassword) {
      return NextResponse.json({ error: "Password salah" }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: await createAdminCookieValue(),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ADMIN_COOKIE_TTL_SECONDS,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Permintaan login tidak valid" }, { status: 400 });
  }
}
