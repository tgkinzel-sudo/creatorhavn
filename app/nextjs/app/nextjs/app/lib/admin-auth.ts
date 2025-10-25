// app/nextjs/app/lib/admin-auth.ts

/**
 * Einfacher Admin-Check per Header:
 *   Header: x-admin-key: <GEHEIM>
 *   Vergleich mit process.env.ADMIN_API_KEY
 */
export function requireAdmin(req: Request) {
  const provided = req.headers.get("x-admin-key") ?? "";
  const expected = process.env.ADMIN_API_KEY ?? "";

  if (!expected) {
    const err = new Error("ADMIN_API_KEY not configured");
    (err as any).status = 500;
    throw err;
  }

  if (provided !== expected) {
    const err = new Error("Unauthorized");
    (err as any).status = 401;
    throw err;
  }
}
