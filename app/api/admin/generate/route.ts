import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/adminAuth";
import { generateServerLicense, type ServerLicensePayload } from "@/lib/server/license";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json() as Partial<ServerLicensePayload>;
    const payload: ServerLicensePayload = {
      name: String(body.name ?? "").slice(0, 120).trim(),
      plan: "premium",
      exp: typeof body.exp === "number" ? body.exp : null,
      device: body.device ? String(body.device).slice(0, 64).trim() : null,
    };
    const key = await generateServerLicense(payload);
    return NextResponse.json({ key, payload }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membuat lisensi" },
      { status: 400 }
    );
  }
}
