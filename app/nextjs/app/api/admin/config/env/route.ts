// app/nextjs/app/api/admin/config/env/route.ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-auth";

type EnvTarget = "production" | "preview" | "development";

export async function POST(req: Request) {
  try {
    requireAdmin(req);
    const { VERCEL_API_TOKEN, VERCEL_PROJECT_ID } = process.env;
    if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) {
      return NextResponse.json({ ok: false, error: "Vercel API Token oder Project ID fehlen" }, { status: 500 });
    }

    const body = await req.json();
    // Beispiel body:
    // { "vars": [{ "key":"STRIPE_PRICE_ID_STARTER", "value":"price_123", "targets":["production","preview","development"] }] }
    const vars: Array<{ key: string; value: string; targets?: EnvTarget[] }> = body.vars ?? [];
    if (!Array.isArray(vars) || vars.length === 0) {
      return NextResponse.json({ ok: false, error: "Feld 'vars' ist leer" }, { status: 400 });
    }

    // Für jedes Var: ggf. existente Version holen & löschen, dann neu anlegen (upsert)
    const created: any[] = [];
    for (const v of vars) {
      const targets = v.targets ?? ["production"];

      // 1) vorhandene Env-Einträge (gleicher key) holen
      const getRes = await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/env?key=${encodeURIComponent(v.key)}`, {
        headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` },
        cache: "no-store",
      });
      if (!getRes.ok) {
        throw new Error(`Vercel GET env failed for key=${v.key} (${getRes.status})`);
      }
      const getJson = await getRes.json();
      // 2) ggf. löschen (alle Versionen des Keys)
      for (const envVar of getJson.envs ?? []) {
        await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/env/${envVar.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` },
        });
      }

      // 3) neu anlegen
      const postRes = await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/env`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${VERCEL_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "encrypted",
          key: v.key,
          value: v.value,
          target: targets,
        }),
      });
      const postJson = await postRes.json();
      if (!postRes.ok) {
        throw new Error(`Vercel POST env failed for key=${v.key}: ${postJson?.error?.message ?? postJson?.message ?? postRes.status}`);
      }
      created.push({ key: v.key, targets });
    }

    return NextResponse.json({ ok: true, created });
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json({ ok: false, error: err.message ?? "Unknown error" }, { status });
  }
}
