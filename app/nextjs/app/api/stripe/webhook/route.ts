// app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  try {
    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      return NextResponse.json({ error: "Missing Stripe-Signature header" }, { status: 400 });
    }

    const buf = Buffer.from(await req.arrayBuffer());
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
    }

    const event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);

   switch (event.type) {
  case "checkout.session.completed": {
    const session: any = event.data.object;
    console.log("✅ checkout.session.completed", session.id);
    break;
  }
  case "customer.subscription.created":
  case "customer.subscription.updated":
  case "customer.subscription.deleted": {
    const sub: any = event.data.object;
    console.log(`ℹ️ ${event.type}`, sub.id, sub.status);
    break;
  }
  default:
    console.log("➡️ Unhandled event type:", event.type);
}
    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Stripe Webhook Error:", err?.message || err);
    return NextResponse.json({ error: err?.message || "Invalid payload" }, { status: 400 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
