// app/nextjs/app/api/admin/health/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-auth";

let pgPool: any = null;
async function getPool() {
  if (pgPool) return pgPool;
  const { Pool } = await import("pg");
  pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pgPool;
}

export async function GET(req: NextRequest) {
  try {
    // ✅ Admin prüfen (schützt diesen Health-Endpunkt)
    requireAdmin(req);

    // ✅ ENV-Checks
    const env = {
      DATABASE_URL: !!process.env.DATABASE_URL,
      STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
      ADMIN_API_KEY: !!process.env.ADMIN_API_KEY,
      NEXT_PUBLIC_STRIPE_PRICE_ID: !!process.env.NEXT_PUBLIC_STRIPE_PRICE_ID,
    };

    // ✅ DB-Check
    let db = { connected: false as boolean, stripe_events_rows: 0 as number };
    try {
      const pool = await getPool();
      await pool.query("select 1"); // connectivity
      // Tabelle ist optional – fehlertolerant zählen
      const countRes = await pool
        .query('select count(*)::int as n from stripe_events')
        .catch(() => ({ rows: [{ n: 0 }] }));
      db = { connected: true, stripe_events_rows: countRes.rows[0].n };
    } catch {
      db = { connected: false, stripe_events_rows: 0 };
    }

    // ✅ Interner Ping zum Webhook
    // WICHTIG: absoluter URL mit Protokoll; KEINE Auth-Header mitsenden
    const hdrs = req.headers;
    const proto =
      hdrs.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
    const host =
      hdrs.get("host") ||
      process.env.NEXT_PUBLIC_APP_DOMAIN ||
      "creatorhavn.vercel.app";
    const base = `${proto}://${host}`;

    // Debug (erscheint in Vercel-Logs): console.log("Health ping base:", base);

    const r = await fetch(`${base}/api/stripe/webhook`, {
      method: "GET",
      headers: {
        // explizit KEINE Admin-Header mitschicken
        "Cache-Control": "no-cache",
      },
      cache: "no-store",
      redirect: "follow",
    });

    const webhook = {
      get_ok: r.ok,
      status: r.status,
    };

    const ok = env.DATABASE_URL && env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && db.connected && webhook.get_ok;

    return NextResponse.json({ env, db, webhook, ok });
  } catch (err: any) {
    // Falls requireAdmin oder anderes fehlschlägt
    return NextResponse.json({ error: err?.message || "unauthorized" }, { status: 401 });
  }
}
