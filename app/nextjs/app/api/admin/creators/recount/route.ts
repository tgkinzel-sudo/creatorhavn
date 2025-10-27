// app/nextjs/app/api/admin/creators/recount/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-auth";
import { pool } from "@/app/lib/db";

export async function POST(req: NextRequest) {
  try {
    requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(parseInt(body.limit || "50", 10), 500);

    // 🔧 Dummy: Erhöhe followers_estimate leicht, setze last_seen_at
    // (später hier echte Fetcher/Agents einhängen)
    const client = await pool.connect();
    try {
      await client.query("begin");
      const { rows } = await client.query(
        `select id, coalesce(followers_estimate,0) as f from creators order by updated_at asc limit $1`,
        [limit]
      );

      for (const r of rows) {
        const bump = Math.floor(Math.random() * 50); // +0..49
        await client.query(
          `update creators
             set followers_estimate = $1,
                 last_seen_at = now(),
                 updated_at = now()
           where id = $2`,
          [r.f + bump, r.id]
        );
      }
      await client.query("commit");
      return NextResponse.json({ updated: rows.length });
    } catch (e) {
      await client.query("rollback");
      throw e;
    } finally {
      client.release();
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "error" }, { status: 400 });
  }
}
