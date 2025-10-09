// app/nextjs/app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";

// App Router: Runtime & Caching korrekt setzen
export const runtime = "nodejs";          // nicht Edge – Stripe braucht Node
export const dynamic = "force-dynamic";   // kein Static/Caching für Webhooks

// Stripe SDK initialisieren (achte auf die API-Version zu deinem Account)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20", // falls nötig, auf deine Stripe-Version anpassen
});

export async function POST(req: Request) {
  // Stripe sendet Signatur im Header
  const sig = headers().get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return new NextResponse("Missing Stripe signature or webhook secret", { status: 400 });
  }

  // WICHTIG: Im App Router selbst den RAW Body lesen
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    // Verifizierungsfehler → sofort 400
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Business-Logik (vereinfacht – passe an deine App an)
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // TODO: hier deine Erfüllung/DB-Update/Access-Freischaltung
        // z.B. session.client_reference_id, session.customer_email, ...
        break;
      }

      // weitere Events nach Bedarf
      // case "invoice.paid":
      // case "customer.subscription.created":
      // ...

      default:
        // Unbehandelte Events sind ok – wir bestätigen nur den Empfang
        break;
    }
  } catch (e: any) {
    // Eigene Handler-Fehler → 500
    return new NextResponse(`Handler error: ${e?.message ?? "unknown"}`, { status: 500 });
  }

  // Stripe erwartet eine 2xx-Antwort (JSON oder leer)
  return NextResponse.json({ received: true });
}

// GET (und andere) nicht erlaubt – hilft beim Debuggen
export function GET() {
  return new NextResponse("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
}
