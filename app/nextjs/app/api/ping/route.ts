// app/nextjs/app/api/ping/route.ts
import { NextResponse } from "next/server";

// Node-Runtime aktivieren (nicht Edge)
export const runtime = "nodejs";

// POST-Methode: gibt einfach den Body zurück
export async function POST(req: Request) {
  try {
    const json = await req.json();
    return NextResponse.json(
      { ok: true, method: "POST", received: json },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Request body is not valid JSON" },
      { status: 400 }
    );
  }
}

// GET explizit verbieten
export function GET() {
  return new NextResponse("Method Not Allowed", {
    status: 405,
    headers: { Allow: "POST" },
  });
}
