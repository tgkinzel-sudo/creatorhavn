// app/nextjs/app/api/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  try {
    const { price_id, creator_id } = await req.json();

    if (!price_id) {
      return NextResponse.json({ error: "price_id is required" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription", // oder "payment", je nach Preis
      line_items: [{ price: price_id, quantity: 1 }],
      success_url: `${process.env.APP_DOMAIN ?? "https://creatorhavn.com"}/?success=1`,
      cancel_url: `${process.env.APP_DOMAIN ?? "https://creatorhavn.com"}/?canceled=1`,
      // Optional: deine eigene Referenz speichern
      client_reference_id: creator_id ?? undefined,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
  }
}

export function GET() {
  return new NextResponse("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
}
