import { NextRequest, NextResponse } from "next/server";
import { getAllActivations, getActivationCount } from "@/lib/redis";
import { isAdminRequest } from "@/lib/server/adminAuth";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  void req;
  if (!(await isAdminRequest())) {
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
