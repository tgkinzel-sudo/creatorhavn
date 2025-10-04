import fs from 'fs';
import path from 'path';

function readCreators() {
  const dir = path.join(process.cwd(), 'data', 'creators');
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  return files.map(f => {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8');
    try { return JSON.parse(raw); } catch { return null; }
  }).filter(Boolean);
}

export default function HomePage() {
  const creators = readCreators();

  return (
    <>
      <h1 style={{marginTop:0}}>Aktuelle Creator</h1>
      <p>Diese Liste wird täglich automatisch von unserem Content-Agent aktualisiert.</p>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px,1fr))', gap:16}}>
        {creators.length === 0 && <div>Noch keine Profile — der Agent legt bald los.</div>}
        {creators.map(c => (
          <a key={c.slug} href={`/creators/${c.slug}`} style={{display:'block', padding:16, border:'1px solid #eee', borderRadius:12, textDecoration:'none', color:'inherit'}}>
            <img src={c.image_url || '/placeholder.jpg'} alt={c.name} style={{width:'100%', height:160, objectFit:'cover', borderRadius:8, background:'#fafafa'}} />
            <h3 style={{margin:'12px 0 6px'}}>{c.name}</h3>
            <div style={{fontSize:14, color:'#666'}}>{c.bio?.slice(0,120)}{(c.bio||'').length>120?'…':''}</div>
            {c.tags?.length ? (
              <div style={{marginTop:8, display:'flex', gap:6, flexWrap:'wrap'}}>
                {c.tags.slice(0,5).map(t => <span key={t} style={{fontSize:12, background:'#f3f4f6', padding:'4px 8px', borderRadius:999}}>{t}</span>)}
              </div>
            ):null}
          </a>
        ))}
      </div>
    </>
  );
}
