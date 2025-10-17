// app/nextjs/app/api/admin/deploy/route.ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-auth";

export async function POST(req: Request) {
  try {
    requireAdmin(req);
    const hookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;
    if (!hookUrl) {
      return NextResponse.json({ ok: false, error: "VERCEL_DEPLOY_HOOK_URL ist nicht gesetzt" }, { status: 500 });
    }
    const res = await fetch(hookUrl, { method: "POST" });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Deploy Hook failed (${res.status}): ${text}`);
    }
    return NextResponse.json({ ok: true, triggered: true });
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json({ ok: false, error: err.message ?? "Unknown error" }, { status });
  }
}
