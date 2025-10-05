// app/nextjs/app/api/checkout/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}
const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" });

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { creator_id, price_id, subscriber_email } = body;

    if (!creator_id || !price_id) {
      return NextResponse.json(
        { error: "creator_id and price_id are required" },
        { status: 400 }
      );
    }

    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://creatorhavn.com"}/checkout/success?creator_id=${encodeURIComponent(creator_id)}`;
    const cancelUrl  = `${process.env.NEXT_PUBLIC_APP_URL || "https://creatorhavn.com"}/checkout/cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: price_id, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: subscriber_email,
      metadata: {
        creator_id
      }
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
