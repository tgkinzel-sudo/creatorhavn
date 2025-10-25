// app/nextjs/app/lib/admin-auth.ts
export function requireAdmin(req: Request) {
  const got = req.headers.get("x-admin-key");
  const need = process.env.ADMIN_API_KEY;

  if (!need) {
    throw new Error("Missing ADMIN_API_KEY env variable");
  }
  if (!got || got !== need) {
    const err = new Error("Unauthorized");
    // @ts-ignore attach status for Next.js error handling
    (err as any).status = 401;
    throw err;
  }
}
