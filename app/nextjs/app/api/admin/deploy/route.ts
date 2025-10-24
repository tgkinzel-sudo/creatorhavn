// app/nextjs/app/api/admin/deploy/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-auth";

export async function POST(req: NextRequest) {
  requireAdmin(req);
  // TODO: hier könnte man einen GitHub workflow_dispatch oder Vercel re-deploy triggern
  return NextResponse.json({ ok: true, message: "deploy accepted" }, { status: 200 });
}
