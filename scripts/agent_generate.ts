/**
 * Minimaler Seed-Agent:
 * - Nutzt ENV SEED_MODE=dummy | live
 * - Dummy: erzeugt 15 Beispiel-Creator
 * - Live (Platzhalter): todo – YouTube/TikTok/X APIs integrieren
 */

import { Client } from 'pg';

function pick<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }

async function main() {
  const dbUrl = process.env.DATABASE_URL!;
  const mode = process.env.SEED_MODE ?? 'dummy';

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let created = 0, updated = 0;

  if (mode === 'dummy') {
    const names = ['Luca Tech', 'Sara Films', 'Mona Fitness', 'Tim Coding', 'Jonas Travel', 'Lena Art', 'Miko Music'];
    for (let i = 0; i < 15; i++) {
      const handle = `creator_${i}_${Date.now()}`;
      const display = pick(names);
      const platforms = ['youtube', 'tiktok', 'instagram'];
      const res = await client.query(
        `insert into creators (handle, display_name, avatar_url, platforms, followers_estimate, last_seen_at)
         values ($1,$2,$3,$4,$5, now())
         on conflict (handle)
         do update set display_name=excluded.display_name,
                       avatar_url=excluded.avatar_url,
                       platforms=excluded.platforms,
                       followers_estimate=excluded.followers_estimate,
                       last_seen_at=now()
         returning (xmax = 0) as inserted`,
        [handle, display, `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(display)}`, platforms, 1000 + Math.floor(Math.random()*100000)]
      );
      if (res.rows[0].inserted) created++; else updated++;
    }
  } else {
    // TODO: echte Feeds integrieren (YouTube API, etc.)
  }

  await client.end();
  console.log(JSON.stringify({ created, updated, mode }));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
