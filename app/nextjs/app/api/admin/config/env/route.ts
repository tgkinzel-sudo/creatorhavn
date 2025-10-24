// app/nextjs/app/api/admin/config/env/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-auth";

export async function POST(req: NextRequest) {
  requireAdmin(req);
  const body = await req.json().catch(() => ({}));
  // TODO: hier könnte man mit Vercel-API echte ENV-Updates machen
  return NextResponse.json({ ok: true, received: body }, { status: 200 });
}
