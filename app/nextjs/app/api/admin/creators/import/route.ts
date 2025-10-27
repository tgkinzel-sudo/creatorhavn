// app/nextjs/app/api/admin/creators/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-auth";
import { pool } from "@/app/lib/db";

type CreatorInput = {
  handle: string;
  display_name: string;
  avatar_url?: string;
  platforms?: string[];   // z.B. ["instagram","tiktok"]
  categories?: string[];  // z.B. ["fashion","beauty"]
  followers_estimate?: number;
  language?: string;
  country?: string;
};

export async function POST(req: NextRequest) {
  try {
    requireAdmin(req);

    const contentType = req.headers.get("content-type") || "";
    let rows: CreatorInput[] = [];

    if (contentType.includes("application/json")) {
      const body = await req.json();
      rows = Array.isArray(body) ? body : [body];
    } else if (contentType.includes("text/csv")) {
      const text = await req.text();
      rows = parseCsv(text);
    } else {
      return NextResponse.json(
        { error: "Use application/json (array or single) or text/csv" },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json({ inserted: 0, upserted: 0 });
    }

    const client = await pool.connect();
    try {
      await client.query("begin");
      let upserted = 0;

      for (const r of rows) {
        if (!r.handle || !r.display_name) continue;

        await client.query(
          `
          insert into creators (handle, display_name, avatar_url, platforms, categories, followers_estimate, language, country, last_seen_at)
          values ($1,$2,$3,$4,$5,$6, coalesce($7,'de'), $8, now())
          on conflict (handle) do update set
            display_name = excluded.display_name,
            avatar_url = excluded.avatar_url,
            platforms = excluded.platforms,
            categories = excluded.categories,
            followers_estimate = excluded.followers_estimate,
            language = excluded.language,
            country = excluded.country,
            updated_at = now(),
            last_seen_at = now()
          `,
          [
            r.handle,
            r.display_name,
            r.avatar_url || null,
            r.platforms || [],
            r.categories || [],
            r.followers_estimate ?? null,
            r.language || "de",
            r.country || null,
          ]
        );
        upserted++;
      }

      await client.query("commit");
      return NextResponse.json({ upserted });
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

function parseCsv(csv: string): CreatorInput[] {
  // Minimaler CSV-Parser (Kommas, keine Quotes/escapes)
  // Header: handle,display_name,avatar_url,platforms,categories,followers_estimate,language,country
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim());
  const idx = (name: string) => header.indexOf(name);

  const out: CreatorInput[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = lines[i].split(",").map((c) => c.trim());
    const platforms = cols[idx("platforms")]?.split("|").filter(Boolean) || [];
    const categories = cols[idx("categories")]?.split("|").filter(Boolean) || [];

    out.push({
      handle: cols[idx("handle")] || "",
      display_name: cols[idx("display_name")] || "",
      avatar_url: cols[idx("avatar_url")] || undefined,
      platforms,
      categories,
      followers_estimate: toInt(cols[idx("followers_estimate")]),
      language: cols[idx("language")] || undefined,
      country: cols[idx("country")] || undefined,
    });
  }
  return out;
}

function toInt(s?: string) {
  const n = s ? parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : undefined;
}
