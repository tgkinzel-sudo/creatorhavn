// app/nextjs/app/api/checkout/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  try {
    // Body lesen
    const body = await req.json().catch(() => ({}));
    const priceId =
      body?.priceId ||
      process.env.STRIPE_PRICE_ID; // optionaler Fallback über Env

    if (!priceId) {
      return NextResponse.json(
        { error: "Missing priceId (in body) or STRIPE_PRICE_ID (env)" },
        { status: 400 }
      );
    }

    // Optional: Creator-ID o.ä. aus Body übernehmen
    const { creatorId } = body ?? {};

    // Stripe Checkout Session erzeugen
    const session = await stripe.checkout.sessions.create({
      mode: "subscription", // oder "payment" — je nach Use-Case
      line_items: [{ price: priceId, quantity: 1 }],
      // Passe die URLs an deine Domain an:
      success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://creatorhavn.vercel.app"}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://creatorhavn.vercel.app"}/cancel`,
      metadata: creatorId ? { creatorId: String(creatorId) } : undefined,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Checkout failed" },
      { status: 500 }
    );
  }
}

// Für alle anderen Methoden 405
export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
export async function PUT() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
export async function DELETE() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
