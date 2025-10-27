// app/nextjs/app/creators/page.tsx
"use client";

import { useEffect, useState } from "react";

type Creator = {
  id: string;
  handle: string;
  display_name: string;
  avatar_url?: string;
  followers_estimate?: number;
  country?: string;
  platforms?: string[];
};

export default function CreatorsPage() {
  const [items, setItems] = useState<Creator[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const url = new URL("/api/admin/creators", window.location.origin);
      if (q) url.searchParams.set("q", q);
      const res = await fetch(url.toString(), {
        headers: { "x-admin-key": process.env.NEXT_PUBLIC_ADMIN_BEARER || "" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(data.items || []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>Creators</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Suche handle oder name…"
          style={{ padding: 8, minWidth: 280 }}
        />
        <button onClick={load} disabled={loading}>
          {loading ? "Lade…" : "Suchen"}
        </button>
        {error && <span style={{ color: "crimson" }}>{error}</span>}
      </div>

      <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th align="left">Name</th>
            <th align="left">Handle</th>
            <th align="left">Follower</th>
            <th align="left">Land</th>
            <th align="left">Plattformen</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id} style={{ borderTop: "1px solid #eee" }}>
              <td>{c.display_name}</td>
              <td>@{c.handle}</td>
              <td>{c.followers_estimate ?? "-"}</td>
              <td>{c.country ?? "-"}</td>
              <td>{(c.platforms || []).join(", ")}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={5} style={{ color: "#777" }}>
                Keine Einträge
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
