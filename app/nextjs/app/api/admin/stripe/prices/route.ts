// app/nextjs/app/api/admin/stripe/prices/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAdmin } from "@/app/lib/admin-auth";

export async function POST(req: Request) {
  try {
    requireAdmin(req);

    const body = await req.json();
    const {
      productName,              // z.B. "Starter Plan"
      currency = "eur",         // "eur", "usd", ...
      unitAmount,               // in Cent (z.B. 990 = 9,90 €)
      interval,                 // optional: "month" | "year" für Abo
      intervalCount = 1,        // optional: 1
      productId                 // optional: vorhandenes Stripe Product ID
    } = body;

    if (!unitAmount || !productName && !productId) {
      return NextResponse.json(
        { error: "unitAmount und (productName oder productId) sind erforderlich" },
        { status: 400 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

    // Falls kein Produkt angegeben, neues erstellen
    const product =
      productId
        ? await stripe.products.retrieve(productId)
        : await stripe.products.create({ name: productName });

    // Einmaliger Preis oder Abo?
    const priceParams: Stripe.PriceCreateParams = {
      currency,
      unit_amount: unitAmount,
      product: product.id,
    };

    if (interval) {
      priceParams.recurring = {
        interval: interval as "day" | "week" | "month" | "year",
        interval_count: intervalCount
      };
    }

    const price = await stripe.prices.create(priceParams);

    return NextResponse.json({
      ok: true,
      product: { id: product.id, name: product.name },
      price: { id: price.id, currency: price.currency, unit_amount: price.unit_amount, recurring: price.recurring ?? null }
    });
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json({ ok: false, error: err.message ?? "Unknown error" }, { status });
  }
}
