// app/nextjs/app/api/checkout/route.ts
import Stripe from "stripe";

// Wichtig: Version passend zu deinem installierten Stripe-SDK
// (bei "stripe": ^14.x ist "2024-06-20" korrekt)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

/**
 * Hilfsfunktion: nimmt eine Eingabe (string | undefined) und gibt
 * garantiert eine absolute HTTPS-URL zurück (oder wirft Error).
 */
function asAbsoluteHttpsUrl(input: string | undefined, fallbackPath: string): string {
  // Fallback-Domain: deine produktive Domain
  const fallback = `https://creatorhavn.vercel.app${fallbackPath}`;

  // Wenn nichts übergeben → Fallback
  const candidate = (input && input.trim().length > 0) ? input.trim() : fallback;

  // Wenn nur ein Pfad übergeben wurde ("/x"), absolute URL daraus bauen
  if (candidate.startsWith("/")) {
    return `https://creatorhavn.vercel.app${candidate}`;
  }

  // Validieren, dass ein Schema vorhanden ist und absolut ist
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:") {
      // Stripe verlangt https
      throw new Error("URL must be https");
    }
    return url.toString();
  } catch {
    // Falls z. B. "creatorhavn.vercel.app/path" ohne Schema kam → auf https korrigieren
    return `https://${candidate.replace(/^https?:\/\//, "")}`;
  }
}

export async function POST(req: Request) {
  try {
    // Body lesen
    const body = await req.json().catch(() => ({}));
    const priceId = body?.priceId as string | undefined;

    if (!process.env.STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({ error: "Missing STRIPE_SECRET_KEY" }), { status: 500 });
    }
    if (!priceId) {
      return new Response(JSON.stringify({ error: "Missing priceId" }), { status: 400 });
    }

    // success/cancel aus Body oder Fallbacks
    const successUrl = asAbsoluteHttpsUrl(
      body?.successUrl,
      "/checkout/success",
    );
    const cancelUrl = asAbsoluteHttpsUrl(
      body?.cancelUrl,
      "/checkout/cancel",
    );

    // Stripe Checkout-Session erstellen
    const session = await stripe.checkout.sessions.create({
      mode: "subscription", // ändere bei einmaligen Käufen auf "payment"
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      // Optional: Kunden-E-Mail übernehmen, Metadata etc.
      // customer_email: body?.email,
      // metadata: { ... }
    });

    // Session-URL zurück
    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Unknown error" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}

// Optional: GET blocken, damit 405 statt 404 kommt
export function GET() {
  return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
    status: 405,
    headers: { "Allow": "POST", "content-type": "application/json" },
  });
}
