import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, ADMIN_COOKIE_NAME } from "@/lib/server/adminAuth";

export const runtime = "edge";

export async function GET() {
  return NextResponse.json({ authenticated: await isAdminRequest() });
}

export async function DELETE(_req: NextRequest) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
