// app/nextjs/app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { pool } from "@/lib/db";

// Stripe SDK ohne fest verdrahtete apiVersion, um TS-Mismatches zu vermeiden
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// WICHTIG: Der Webhook darf NIE gecacht werden
export const dynamic = "force-dynamic";

// ✅ Öffentlicher Selftest: Health-Check erwartet 200 auf GET
export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/stripe/webhook" }, { status: 200 });
}

// ✅ Stripe Webhook (POST)
export async function POST(req: Request) {
  try {
    if (!webhookSecret) {
      return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
    }

    // Stripe sendet Raw-Body – den holen wir uns als Buffer
    const buf = Buffer.from(await req.arrayBuffer());
    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
    }

    // Ereignis validieren
    const event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);

    // Optional: Ereignis in DB protokollieren (jsonb Spalte 'payload' in 'stripe_events')
    try {
      await pool.query(
        `insert into stripe_events (event_id, type, payload) values ($1, $2, $3::jsonb)
         on conflict (event_id) do nothing`,
        [event.id, event.type, JSON.stringify(event)]
      );
    } catch (dbErr) {
      // Nicht fatal fürs Webhook-Antwortverhalten, aber nützlich für Logging
      console.error("DB insert error for stripe_events:", dbErr);
    }

    // Beispielhafte, minimale Reaktion auf wichtige Events
    switch (event.type) {
      case "checkout.session.completed": {
        // const session = event.data.object as Stripe.Checkout.Session;
        // TODO: Zugriff gewähren / Abo verknüpfen etc.
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        // const sub = event.data.object as Stripe.Subscription;
        // TODO: Subscription-Status synchronisieren
        break;
      }
      default:
        // andere Events ignorieren wir hier still
        break;
    }

    // Stripe erwartet 2xx
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    // Bei Signaturfehlern meldet stripe.webhooks.constructEvent einen Fehler => 400 zurückgeben
    const msg = err?.message || "Unhandled error";
    const status = msg.toLowerCase().includes("signature") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
