// app/nextjs/app/api/admin/health/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/app/lib/admin-auth";

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req); // prüft x-admin-key Header

    const out: Record<string, any> = {
      env: {},
      db: {},
      webhook: {},
    };

    // 1) ENV vorhanden?
    const envKeys = [
      "DATABASE_URL",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "ADMIN_API_KEY",
      "NEXT_PUBLIC_STRIPE_PRICE_ID",
    ];
    envKeys.forEach((k) => (out.env[k] = !!process.env[k]));

    // 2) DB erreichbar + kleiner Roundtrip
    try {
      const pong = await pool.query("select 1 as ok");
      out.db.connected = pong.rows?.[0]?.ok === 1;
      // Kleine Abfrage auf Events (ohne Fehler zu werfen)
      try {
        const cnt = await pool.query("select count(*)::int as c from stripe_events");
        out.db.stripe_events_rows = cnt.rows?.[0]?.c ?? 0;
      } catch {
        out.db.stripe_events_rows = null;
      }
    } catch (dbErr: any) {
      out.db.connected = false;
      out.db.error = String(dbErr?.message || dbErr);
    }

    // 3) Webhook-Route erreichbar (GET)
    try {
      const base =
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.VERCEL_URL?.startsWith("http") ? process.env.VERCEL_URL : `https://${process.env.VERCEL_URL}`;
      const url = base ? `${base}/api/stripe/webhook` : `${req.nextUrl.origin}/api/stripe/webhook`;
      const res = await fetch(url, { method: "GET", cache: "no-store" });
      out.webhook.get_ok = res.ok;
      out.webhook.status = res.status;
    } catch (e: any) {
      out.webhook.get_ok = false;
      out.webhook.error = String(e?.message || e);
    }

    // Ampel
    out.ok =
      out.env.DATABASE_URL &&
      out.env.STRIPE_SECRET_KEY &&
      out.env.STRIPE_WEBHOOK_SECRET &&
      out.db.connected &&
      out.webhook.get_ok;

    return NextResponse.json(out, { status: out.ok ? 200 : 503 });
  } catch (e: any) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}
