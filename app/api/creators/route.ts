import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@vercel/postgres'; // oder pg; nimm das, was du schon nutzt

const qSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  per: z.coerce.number().min(1).max(50).default(20),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = qSchema.parse(Object.fromEntries(searchParams.entries()));
  const offset = (q.page - 1) * q.per;

  const { rows } = await sql`
    select id, handle, display_name, avatar_url, platforms, categories, followers_estimate, last_seen_at
    from creators
    order by coalesce(last_seen_at, created_at) desc
    limit ${q.per} offset ${offset}
  `;

  return NextResponse.json({ data: rows, page: q.page, per: q.per });
}
