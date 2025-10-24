// app/nextjs/app/lib/admin-auth.ts
import type { NextRequest } from "next/server";

export function requireAdmin(req: NextRequest) {
  const header = req.headers.get("x-admin-key");
  const expected = process.env.ADMIN_API_KEY;
  if (!expected || header !== expected) {
    throw new Error("Unauthorized");
  }
}
