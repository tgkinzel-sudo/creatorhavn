// app/nextjs/app/api/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY) {
  // Beim Build/Runtime warnen – hilft beim Debuggen in Vercel Logs
  console.error("Missing STRIPE_SECRET_KEY env var");
}
const stripe = new Stripe(STRIPE_KEY || "", {
  apiVersion: "2024-06-20",
});

function getBaseUrl() {
  // Bevorzugt eine explizite URL aus den Env Vars
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  // Fallback für lokale Devs
  return "http://localhost:3000";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { price_id, creator_id, success_url, cancel_url, email } = body || {};

    if (!price_id) {
      return NextResponse.json(
        { error: "Missing required field: price_id" },
        { status: 400 }
      );
    }

    const base = getBaseUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription", // oder "payment", je nach Preis-Art
      line_items: [{ price: price_id, quantity: 1 }],
      success_url:
        (success_url || `${base}/thank-you`) +
        "?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: cancel_url || `${base}/?cancelled=1`,
      allow_promotion_codes: true,
      payment_method_types: ["card"],
      customer_email: email, // optional
      metadata: {
        creator_id: creator_id || "",
        app_domain: process.env.NEXT_PUBLIC_APP_URL || "",
      },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

// Für alles andere sauber 405 zurückgeben
export function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}

export function PUT() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
export const dynamic = "force-dynamic"; // vermeidet Edge-Caching auf Vercel
