export default function Home() {
  return (
    <main style={{ display:'grid', placeItems:'center', minHeight:'60vh', fontFamily:'sans-serif' }}>
      <div>
        <h1>creatorhavn</h1>
        <p>Launch läuft – Backend erreichbar?</p>
        <ul>
          <li><a href="/api/ping" style={{ textDecoration:'underline' }}>GET /api/ping</a></li>
        </ul>
      </div>
    </main>
  );
}
