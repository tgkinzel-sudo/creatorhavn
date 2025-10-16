import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.STRIPE_SECRET_KEY || "";
  const mode = key.startsWith("sk_live_")
    ? "LIVE"
    : key.startsWith("sk_test_")
    ? "TEST"
    : "UNKNOWN";

  return NextResponse.json({
    vercelEnv: process.env.VERCEL_ENV || "(unknown)",
    mode,
    stripeKeyPrefix: key.slice(0, 10) + "...",
    priceIdStarter: process.env.STRIPE_PRICE_ID_STARTER || "(unset)",
    appBaseUrl: process.env.APP_BASE_URL || "(unset)",
  });
}
