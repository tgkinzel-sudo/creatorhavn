import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Next 14 Hinweis: statt "export const config = { api:{ bodyParser:false } }"
// nutzen wir den Text-Body direkt (siehe unten)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

export async function POST(req: Request) {
  const sig = headers().get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return new NextResponse("Missing Stripe signature or webhook secret", { status: 400 });
  }

  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        // TODO: Fulfillment/DB-Update
        break;
      default:
        // andere Events ignorieren
        break;
    }
  } catch (e: any) {
    return new NextResponse(`Handler error: ${e.message ?? "unknown"}`, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

export function GET() {
  return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
}
