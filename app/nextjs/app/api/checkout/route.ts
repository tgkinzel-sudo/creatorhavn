// app/nextjs/app/api/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

// Stripe braucht Node-Runtime (nicht Edge):
export const runtime = "nodejs";

// 1) Secrets prüfen
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.warn("⚠️ STRIPE_SECRET_KEY ist nicht gesetzt!");
}

// 2) Stripe-Client initialisieren (nur wenn Key vorhanden)
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" })
  : (null as unknown as Stripe);

// 3) POST-Handler
export async function POST(req: Request) {
  try {
    // JSON-Body robust einlesen
    let payload: any = {};
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Request-Body ist kein gültiges JSON." },
        { status: 400 }
      );
    }

    // Price-ID: aus Body oder aus ENV (NEXT_PUBLIC_STRIPE_PRICE_ID)
    const priceId =
      payload?.price_id || process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || "";

    if (!stripe) {
      return NextResponse.json(
        { error: "Server-Config: STRIPE_SECRET_KEY fehlt." },
        { status: 500 }
      );
    }
    if (!priceId || typeof priceId !== "string") {
      return NextResponse.json(
        { error: "Fehlende oder ungültige price_id." },
        { status: 400 }
      );
    }

    // Basis-URL für success/cancel ermitteln
    const origin =
      req.headers.get("origin") ||
      `https://${req.headers.get("x-forwarded-host")}` ||
      "http://localhost:3000";

    // Optional: creator_id aus Body übernehmen (für spätere Auswertung)
    const creatorId =
      typeof payload?.creator_id === "string" ? payload.creator_id : undefined;

    // Stripe-Checkout-Session erstellen (Abo-Beispiel)
    const session = await stripe.checkout.sessions.create({
      mode: "subscription", // für Einmalzahlung: "payment"
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: creatorId ? { creator_id: creatorId } : undefined,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel`,
      customer_creation: "always",
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    console.error("Checkout-Fehler:", err);
    return NextResponse.json(
      { error: err?.message || "Unbekannter Fehler beim Checkout." },
      { status: 500 }
    );
  }
}

// 4) GET explizit verbieten → liefert 405 & korrekten Allow-Header
export function GET() {
  return new NextResponse("Method Not Allowed", {
    status: 405,
    headers: { Allow: "POST" },
  });
}
