// app/nextjs/app/api/stripe/webhook/route.ts
import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const config = {
  api: { bodyParser: false }
};

function bufferToString(buf: ArrayBuffer) {
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(buf);
}

export async function POST(req: NextRequest) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecret || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe secrets not configured" },
      { status: 500 }
    );
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" });

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.arrayBuffer();
    const payload = bufferToString(rawBody);
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const creatorId = session.metadata?.creator_id || null;
      const customerId = session.customer?.toString() || null;
      const subscriptionId = session.subscription?.toString() || null;

      const priceId =
        (session as any).line_items?.data?.[0]?.price?.id ||
        (session as any).display_items?.[0]?.plan?.id ||
        null;

      const amountTotal = (session as any).amount_total ?? 0;
      const currency = (session as any).currency
        ? String((session as any).currency).toUpperCase()
        : "EUR";

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          `
          INSERT INTO subscriptions (
            id, creator_id, subscriber_email, plan, status,
            amount_cents, currency, started_at, stripe_customer_id,
            stripe_subscription_id, stripe_price_id, created_at, updated_at
          )
          VALUES (
            gen_random_uuid(),
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            NOW(),
            $7,
            $8,
            $9,
            NOW(),
            NOW()
          )
          ON CONFLICT (stripe_subscription_id) DO NOTHING
          `,
          [
            creatorId,
            session.customer_details?.email || null,
            "default",
            "active",
            amountTotal ?? 0,
            currency,
            customerId,
            subscriptionId,
            priceId
          ]
        );
        await client.query("COMMIT");
      } catch (dbErr) {
        await client.query("ROLLBACK");
        throw dbErr;
      } finally {
        client.release();
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
