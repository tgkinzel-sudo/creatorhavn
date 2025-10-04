import fs from 'fs';
import path from 'path';

function getCreator(slug) {
  const p = path.join(process.cwd(), 'data', 'creators', `${slug}.json`);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return null; }
}

export default function CreatorPage({ params }) {
  const c = getCreator(params.slug);
  if (!c) return <div>Profil nicht gefunden.</div>;
  return (
    <article>
      <a href="/" style={{fontSize:14}}>&larr; zurück</a>
      <h1 style={{marginTop:8}}>{c.name}</h1>
      <img src={c.image_url || '/placeholder.jpg'} alt={c.name} style={{width:'100%', maxWidth:880, height:360, objectFit:'cover', borderRadius:12, background:'#fafafa'}} />
      <p style={{marginTop:16, fontSize:18}}>{c.bio}</p>
      {c.platforms?.length ? (
        <>
          <h3>Plattformen</h3>
          <ul>
            {c.platforms.map(p => <li key={p.type}><a href={p.url} target="_blank">{p.type}</a></li>)}
          </ul>
        </>
      ) : null}
      {c.tags?.length ? (
        <>
          <h3>Tags</h3>
          <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            {c.tags.map(t => <span key={t} style={{background:'#f3f4f6', padding:'4px 10px', borderRadius:999}}>{t}</span>)}
          </div>
        </>
      ): null}
      <hr style={{margin:'24px 0'}} />
      <small style={{color:'#666'}}>Automatisch erstellt am {new Date(c.generated_at || Date.now()).toLocaleString('de-DE')}</small>
    </article>
  );
}
