// app/nextjs/app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic"; // nicht cachen

// Öffentlicher Health-GET: muss 200 liefern
export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/stripe/webhook" }, { status: 200 });
}

// Stripe Webhook (POST)
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!secret || !key) {
    return NextResponse.json({ error: "Missing Stripe secrets" }, { status: 500 });
  }

  try {
    const buf = Buffer.from(await req.arrayBuffer());
    const sig = req.headers.get("stripe-signature");
    if (!sig) return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });

    // Stripe-Client ohne hart verdrahtete apiVersion (vermeidet TS-Mismatches)
    const stripe = new Stripe(key);
    const event = stripe.webhooks.constructEvent(buf, sig, secret);

    // optional: Event protokollieren (falls Tabelle stripe_events existiert)
    try {
      await pool.query(
        `insert into stripe_events (event_id, type, payload)
         values ($1, $2, $3::jsonb)
         on conflict (event_id) do nothing`,
        [event.id, event.type, JSON.stringify(event)]
      );
    } catch (e) {
      console.error("DB insert error:", e);
    }

    // einfache Fallunterscheidung
    switch (event.type) {
      case "checkout.session.completed":
        // const session = event.data.object as Stripe.Checkout.Session;
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    const msg = err?.message || "Unhandled error";
    const isSig = msg.toLowerCase().includes("signature");
    return NextResponse.json({ error: msg }, { status: isSig ? 400 : 500 });
  }
}
