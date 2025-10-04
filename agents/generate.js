// Minimaler Content-Agent (Node 20, kein extra Package nötig)
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY fehlt (GitHub Secret setzen!)");
  process.exit(1);
}

const ROOT = process.cwd();
const SEEDS = path.join(ROOT, 'data', 'seeds.txt');
const OUTDIR = path.join(ROOT, 'data', 'creators');
if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

// Hilfsfunktionen
const slugify = s => (s || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g,'-')
  .replace(/(^-|-$)/g,'');

async function llm(prompt) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: "Du bist ein strenger Research- und Redaktionsagent. Antworte ausschliesslich mit JSON." },
        { role: "user", content: prompt }
      ]
    })
  });
  if (!res.ok) {
    console.error("LLM HTTP Error:", res.status, await res.text());
    throw new Error("LLM call failed");
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

function readSeeds() {
  if (!fs.existsSync(SEEDS)) return [];
  return fs.readFileSync(SEEDS, 'utf8')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 10); // Safety
}

async function generateFromSeed(seed) {
  const prompt = `
Erzeuge ein Creator-Profil als JSON mit diesem Schema (keine Kommentare, keine Erklärungen):

{
  "name": string,               // Max 60 chars
  "slug": string,               // URL-freundlich, aus dem Namen abgeleitet
  "bio": string,                // 1-3 Sätze, clean, keine Erwachsenen-Inhalte
  "image_url": string,          // Platzhalter oder neutrale Bild-URL, KEINE sensiblen Inhalte
  "tags": string[],             // 3-7 kurze Tags
  "platforms": [                // 0-4 Links, nur wenn generisch plausibel
    { "type": "instagram"|"tiktok"|"youtube"|"twitch"|"x"|"website", "url": string }
  ]
}

Seed: "${seed}"
Beachte Policy: keine NSFW/Adult- oder 18+ Inhalte. Wenn seed riskant -> neutrale, allgemein gehaltene Beschreibung ohne Verlinkung.
  `.trim();

  let json = "{}";
  try {
    json = await llm(prompt);
    // Versuche robust zu parsen
    const cleaned = json.trim().replace(/^```(json)?/i,'').replace(/```$/,'');
    const obj = JSON.parse(cleaned);

    // Validate & sanitize
    obj.name = String(obj.name || 'Creator');
    obj.slug = slugify(obj.slug || obj.name || crypto.randomUUID().slice(0,8));
    obj.bio = String(obj.bio || 'Kein Profiltext verfügbar.');
    obj.image_url = String(obj.image_url || '/placeholder.jpg');
    obj.tags = Array.isArray(obj.tags) ? obj.tags.slice(0,7).map(t => String(t).toLowerCase()) : [];
    obj.platforms = Array.isArray(obj.platforms) ? obj.platforms.filter(p => p?.type && p?.url).slice(0,4) : [];
    obj.generated_at = new Date().toISOString();

    const file = path.join(OUTDIR, `${obj.slug}.json`);
    fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
    return obj.slug;
  } catch (e) {
    console.error("Seed fehlgeschlagen:", seed, e?.message);
    return null;
  }
}

(async () => {
  const seeds = readSeeds();
  if (seeds.length === 0) {
    console.log("Keine Seeds gefunden. Bitte data/seeds.txt befüllen.");
    process.exit(0);
  }
  console.log(`Starte Generierung für ${seeds.length} Seeds...`);
  const made = [];
  for (const s of seeds) {
    const slug = await generateFromSeed(s);
    if (slug) made.push(slug);
  }
  console.log("Fertig. Neue/aktualisierte Slugs:", made);
})();
