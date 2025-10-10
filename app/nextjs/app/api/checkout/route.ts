import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const price_id = body?.price_id as string | undefined;
    const creator_id = body?.creator_id as string | undefined;

    if (!price_id) {
      return NextResponse.json({ error: "price_id is required" }, { status: 400 });
    }

    const base = process.env.APP_DOMAIN ?? "https://creatorhavn.com";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription", // falls Einmalzahlung: "payment"
      line_items: [{ price: price_id, quantity: 1 }],
      success_url: `${base}/?success=1`,
      cancel_url: `${base}/?canceled=1`,
      client_reference_id: creator_id,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
  }
}

export function GET() {
  // 405 für GET – wichtig, damit dein Test per POST funktioniert
  return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
}
