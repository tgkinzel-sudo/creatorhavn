import { NextResponse } from "next/server";
import Stripe from "stripe";
import { pool } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// ✅ Public Selftest erlaubt GET:
export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/stripe/webhook" });
}

// ✅ Webhook: Stripe schickt POST + Signatur-Header
export async function POST(req: NextRequest) {
  try {
    if (!webhookSecret) {
      return NextResponse.json(
        { error: "STRIPE_WEBHOOK_SECRET not set" },
        { status: 500 }
      );
    }

    const sig = req.headers.get("stripe-signature") || "";
    const buf = Buffer.from(await req.arrayBuffer());

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    } catch (err: any) {
      console.error("❌ Invalid signature:", err?.message);
      return NextResponse.json({ error: "invalid signature" }, { status: 400 });
    }

    // 💾 Event in DB schreiben (id, type, raw payload)
    try {
      await pool.query(
        `insert into stripe_events (id, type, payload) values ($1, $2, $3)
         on conflict (id) do nothing`,
        [event.id, event.type, event as any]
      );
    } catch (dbErr: any) {
      console.error("❌ DB insert failed", dbErr);
      // Nicht 500 geben (Stripe würde retrys machen) – nur loggen und 200 OK zurück,
      // oder 202 Accepted, je nach Wunsch. Hier 200, damit kein Retry-Sturm entsteht.
    }

    // 🎯 Minimal-Handler – erweitere nach Bedarf
    switch (event.type) {
      case "checkout.session.completed": {
        // const session = event.data.object as Stripe.Checkout.Session;
        console.log("✅ checkout.session.completed", event.id);
        break;
      }
      default:
        console.log("ℹ️ unhandled event", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error("❌ Webhook error", e);
    return NextResponse.json({ error: "webhook handler error" }, { status: 500 });
  }
}
