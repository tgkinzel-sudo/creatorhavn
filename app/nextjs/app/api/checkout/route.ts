import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { priceId } = body;

    if (!priceId) {
      return new Response(JSON.stringify({ error: "Missing priceId" }), { status: 400 });
    }

    const successUrl = body.successUrl || "https://creatorhavn.vercel.app/checkout/success";
    const cancelUrl = body.cancelUrl || "https://creatorhavn.vercel.app/checkout/cancel";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        { price: priceId, quantity: 1 },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return new Response(JSON.stringify({ url: session.url }), { status: 200 });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
