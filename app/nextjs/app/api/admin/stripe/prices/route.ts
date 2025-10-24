// app/nextjs/app/api/admin/stripe/prices/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAdmin } from "@/app/lib/admin-auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20", // kompatibel mit deinem Setup
});

export async function POST(req: NextRequest) {
  try {
    requireAdmin(req);

    const body = (await req.json().catch(() => ({}))) as {
      product_id?: string;
      product_name?: string;
      currency?: string;
      unit_amount?: number;   // in Cent
      interval?: "day" | "week" | "month" | "year";
    };

    if (!body.product_id && !body.product_name) {
      return NextResponse.json(
        { error: "product_id ODER product_name ist erforderlich" },
        { status: 400 }
      );
    }
    if (!body.unit_amount || !body.currency) {
      return NextResponse.json(
        { error: "unit_amount (Cent) und currency sind erforderlich" },
        { status: 400 }
      );
    }

    // Produkt holen oder anlegen
    let productId = body.product_id;
    if (!productId) {
      const product = await stripe.products.create({
        name: body.product_name!,
      });
      productId = product.id;
    }

    // Wiederkehrender Preis (Subscription). Für One-time statt recurring: auskommentieren.
    const price = await stripe.prices.create({
      product: productId!,
      currency: body.currency,
      unit_amount: body.unit_amount,
      recurring: body.interval ? { interval: body.interval } : { interval: "month" },
    });

    return NextResponse.json({ price }, { status: 200 });
  } catch (err: any) {
    // Unauthorized etc.
    return NextResponse.json(
      { error: err?.message ?? "unknown error" },
      { status: err?.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
