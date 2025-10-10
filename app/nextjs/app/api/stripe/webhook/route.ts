// app/nextjs/app/api/stripe/webhook/route.ts

import { NextResponse } from 'next/server';

// ✅ App Router-konform: statt "export const config = { api: { bodyParser: false } }"
export const runtime = 'nodejs';          // Vercel/Node Runtime
export const dynamic = 'force-dynamic';   // Webhooks sind nie statisch
export const preferredRegion = 'auto';    // oder z.B. 'fra1' wenn du möchtest

// HINWEIS:
// Wenn du später Stripe wirklich verifizieren willst, brauchst du die rohe Request-Body-Bytes,
// um die Signatur zu prüfen. Im App Router geht das so:
//   const rawBody = await req.text();   // oder req.arrayBuffer(), je nach Stripe SDK
// und dann die Signatur aus dem Header "Stripe-Signature" auslesen und prüfen.
// Für jetzt antworten wir 200, damit der Build fertig wird und kein 405/500 kommt.

export async function POST(req: Request) {
  try {
    // Platzhalter: Nur minimal einlesbar, damit nichts crasht.
    const text = await req.text().catch(() => '');
    const sig = (req.headers.get('stripe-signature') ?? '').toString();

    // TODO: Hier später Stripe-Signatur verifizieren:
    // const event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)

    // Temporäre, harmlose Antwort – Build & Deploy gehen durch:
    return NextResponse.json(
      { ok: true, receivedBytes: text.length, hasSignatureHeader: Boolean(sig) },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 });
  }
}

// Optional: Handle GET sauber (sonst 405)
export async function GET() {
  return NextResponse.json({ ok: true, info: 'Stripe webhook endpoint. Use POST.' }, { status: 200 });
}
