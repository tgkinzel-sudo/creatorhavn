// app/nextjs/app/api/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: Request) {
  try {
    const { priceId, successUrl, cancelUrl } = await req.json();

    const appBase = process.env.APP_BASE_URL || "https://creatorhavn.vercel.app";
    const sUrl = successUrl || `${appBase}/checkout/success`;
    const cUrl = cancelUrl || `${appBase}/checkout/cancel`;

    // Fallback: falls priceId nicht geschickt wird, aus Env nehmen
    const finalPriceId = priceId || process.env.STRIPE_PRICE_ID_STARTER;
    if (!finalPriceId) {
      return NextResponse.json({ error: "priceId fehlt (weder im Body noch in STRIPE_PRICE_ID_STARTER)" }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",       // oder "payment", je nachdem was du nutzt
      line_items: [{ price: finalPriceId, quantity: 1 }],
      success_url: sUrl,
      cancel_url: cUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Unknown error" }, { status: 400 });
  }
}
