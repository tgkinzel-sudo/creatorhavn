// app/nextjs/lib/admin-auth.ts
export function requireAdmin(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || token !== expected) {
    const err = new Error("Unauthorized");
    // @ts-ignore
    err.status = 401;
    throw err;
  }
}
