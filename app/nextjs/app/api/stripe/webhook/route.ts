// app/nextjs/app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: Request) {
  try {
    const sig = req.headers.get("stripe-signature");
    if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

    const buf = Buffer.from(await req.arrayBuffer());
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: "2024-06-20",
    });

    const event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );

    // TODO: Reagiere auf relevante Events
    // if (event.type === "checkout.session.completed") { ... }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error("Stripe webhook error:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
