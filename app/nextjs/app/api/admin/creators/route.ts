// app/nextjs/app/api/admin/creators/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-auth";
import { pool } from "@/app/lib/db";

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const country = (searchParams.get("country") || "").trim();
    const minFollowers = parseInt(searchParams.get("min") || "0", 10);
    const maxFollowers = parseInt(searchParams.get("max") || "2147483647", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const conds: string[] = [];
    const args: any[] = [];
    let k = 1;

    if (q) {
      conds.push(`(lower(handle) like $${k} or lower(display_name) like $${k})`);
      args.push(`%${q}%`);
      k++;
    }
    if (country) {
      conds.push(`country = $${k}`);
      args.push(country);
      k++;
    }
    conds.push(`coalesce(followers_estimate,0) between $${k} and $${k + 1}`);
    args.push(isFinite(minFollowers) ? minFollowers : 0);
    args.push(isFinite(maxFollowers) ? maxFollowers : 2147483647);
    k += 2;

    const where = conds.length ? `where ${conds.join(" and ")}` : "";

    const sql = `
      select id, handle, display_name, avatar_url, platforms, categories,
             followers_estimate, language, country, last_seen_at, updated_at, created_at
      from creators
      ${where}
      order by coalesce(followers_estimate,0) desc, handle asc
      limit $${k} offset $${k + 1}
    `;
    args.push(limit, offset);

    const { rows } = await pool.query(sql, args);
    return NextResponse.json({ items: rows, limit, offset, count: rows.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "error" }, { status: 400 });
  }
}
