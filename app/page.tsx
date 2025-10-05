import React from 'react';

async function getCreators() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/creators?per=24`, { next: { revalidate: 60 } });
  if (!res.ok) return { data: [] };
  return res.json();
}

export default async function Home() {
  const { data } = await getCreators();

  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-semibold mb-6">Aktuelle Creator</h1>

      {data.length === 0 ? (
        <p className="text-zinc-600">
          Noch keine Profile – der Agent legt bald los.
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {data.map((c: any) => (
            <li key={c.id} className="border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <img src={c.avatar_url ?? '/placeholder.svg'} alt="" className="w-12 h-12 rounded-full" />
                <div>
                  <div className="font-medium">{c.display_name}</div>
                  <div className="text-sm text-zinc-500">@{c.handle}</div>
                </div>
              </div>
              <div className="mt-3 text-sm text-zinc-600">
                {c.platforms?.join(' • ') ?? '—'}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
