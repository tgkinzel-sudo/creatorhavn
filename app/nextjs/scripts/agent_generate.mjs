// app/nextjs/scripts/agent_generate.mjs
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const names = [
  "Luca Tech", "Sara Films", "Mona Fitness", "Tim Coding",
  "Jonas Travel", "Lena Art", "Miko Music", "Nora Science",
  "Ben Finance", "Ava Comedy", "Kai Gaming", "Emma Beauty",
  "Leo Food", "Mara Books", "Oli Sports"
];
const platforms = [["youtube"], ["tiktok"], ["instagram"], ["youtube", "tiktok"]];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function upsertCreator(handle, displayName) {
  const avatar = `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(displayName)}`;
  const plats = pick(platforms);
  const followers = 1000 + Math.floor(Math.random() * 200000);

  await pool.query(
    `insert into creators (handle, display_name, avatar_url, platforms, followers_estimate, last_seen_at)
     values ($1,$2,$3,$4,$5, now())
     on conflict (handle) do update set
       display_name = excluded.display_name,
       avatar_url = excluded.avatar_url,
       platforms = excluded.platforms,
       followers_estimate = excluded.followers_estimate,
       last_seen_at = now()`,
    [handle, displayName, avatar, plats, followers]
  );
}

async function main() {
  let created = 0;
  for (let i = 0; i < 12; i++) {
    const display = pick(names);
    const handle = display.toLowerCase().replace(/\s+/g, "_") + "_" + (i + 1);
    await upsertCreator(handle, display);
    created++;
  }
  await pool.end();
  console.log(JSON.stringify({ ok: true, created }, null, 2));
}

main().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch {}
  process.exit(1);
});
