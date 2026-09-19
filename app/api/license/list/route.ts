import { NextRequest, NextResponse } from "next/server";
import { getAllActivations, getActivationCount } from "@/lib/redis";

export const runtime = "edge";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "aethera-admin-2026";

export async function GET(req: NextRequest) {
  // Require admin token in Authorization header
  const auth = req.headers.get("authorization");
  if (!auth || auth !== `Bearer ${ADMIN_PASSWORD}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [activations, total] = await Promise.all([
      getAllActivations(200),
      getActivationCount(),
    ]);
    return NextResponse.json({ activations, total });
  } catch (err) {
    console.error("[license/list]", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
