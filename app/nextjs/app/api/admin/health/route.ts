// app/nextjs/app/api/admin/health/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

function requireAdmin(req: NextRequest) {
  const header = req.headers.get("x-admin-key");
  const expected = process.env.ADMIN_API_KEY;
  if (!expected || header !== expected) {
    throw new Error("unauthorized");
  }
}

function resolveBaseUrl(req: NextRequest): string {
  // 1) explizit gesetzte Public-URL bevorzugen
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.VERCEL_BRANCH_URL ||
    process.env.VERCEL_URL;

  if (fromEnv) {
    // VERCEL_URL ist oft ohne Schema -> Schema ergänzen
    if (/^https?:\/\//i.test(fromEnv)) return fromEnv.replace(/\/$/, "");
    return `https://${fromEnv}`.replace(/\/$/, "");
  }

  // 2) Fallback: Origin aus der aktuellen Request ableiten
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (process.env.NODE_ENV === "production" ? "https" : "http");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (host) return `${proto}://${host}`.replace(/\/$/, "");

  // 3) letzter Fallback: absoluter Fehler, aber nicht crashen
  return "http://localhost:3000";
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Admin prüfen
    try {
      requireAdmin(req);
    } catch {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Env-Check
    const env = {
      DATABASE_URL: Boolean(process.env.DATABASE_URL),
      STRIPE_SECRET_KEY: Boolean(process.env.STRIPE_SECRET_KEY),
      STRIPE_WEBHOOK_SECRET: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      ADMIN_API_KEY: Boolean(process.env.ADMIN_API_KEY),
      NEXT_PUBLIC_STRIPE_PRICE_ID: Boolean(
        process.env.NEXT_PUBLIC_STRIPE_PRICE_ID
      ),
    };

    // DB-Check
    let db = { connected: false, stripe_events_rows: 0 as number | null };
    try {
      const client = await pool.connect();
      db.connected = true;
      try {
        const res = await client.query(
          "select count(*)::int as n from stripe_events"
        );
        db.stripe_events_rows = res.rows?.[0]?.n ?? 0;
      } catch {
        db.stripe_events_rows = 0;
      } finally {
        client.release();
      }
    } catch {
      db.connected = false;
    }

    // Webhook-GET über absolute URL prüfen
    const base = resolveBaseUrl(req);
    let webhook = { get_ok: false, status: 0 };
    try {
      const r = await fetch(`${base}/api/stripe/webhook`, {
        method: "GET",
        // wichtig: keine Admin-Header mitsenden, das ist öffentlicher Ping
        // next: { revalidate: 0 }  // optional
      });
      webhook = { get_ok: r.ok, status: r.status };
    } catch {
      webhook = { get_ok: false, status: 0 };
    }

    const ok = env.DATABASE_URL && env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && db.connected && webhook.get_ok;

    return NextResponse.json({ env, db, webhook, ok }, { status: ok ? 200 : 500 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown" }, { status: 500 });
  }
}
