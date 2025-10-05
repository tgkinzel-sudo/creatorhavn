// app/nextjs/app/page.jsx
export const revalidate = 0; // kein Caching -> immer frisch

import { Pool } from "pg";

// globalen Pool wiederverwenden (vermeidet zu viele Verbindungen)
let _pool;
function getPool() {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false } // funktioniert mit Neon etc.
    });
  }
  return _pool;
}

async function loadCreators() {
  const pool = getPool();
  const { rows } = await pool.query(
    `select id, handle, display_name, avatar_url, platforms, followers_estimate, last_seen_at
     from creators
     order by coalesce(last_seen_at, created_at) desc
     limit 24`
  );
  return rows;
}

export default async function Home() {
  const data = await loadCreators();

  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-semibold mb-6">Aktuelle Creator</h1>

      {data.length === 0 ? (
        <p className="text-zinc-600">
          Noch keine Profile – der Agent legt bald los.
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {data.map((c) => (
            <li key={c.id} className="border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <img
                  src={c.avatar_url || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(c.display_name)}`}
                  alt=""
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <div className="font-medium">{c.display_name}</div>
                  <div className="text-sm text-zinc-500">@{c.handle}</div>
                </div>
              </div>
              <div className="mt-3 text-sm text-zinc-600">
                {(c.platforms || []).join(" • ") || "—"}
              </div>
              {c.followers_estimate ? (
                <div className="mt-1 text-xs text-zinc-500">
                  ~{c.followers_estimate.toLocaleString()} Follower
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
