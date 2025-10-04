export const metadata = {
  title: 'creatorhavn — Discover Hub',
  description: 'Täglich automatisch kuratierte Creator-Profile.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body style={{fontFamily:'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', margin:0}}>
        <header style={{padding:'16px 24px', borderBottom:'1px solid #eee'}}>
          <strong>creatorhavn</strong> — Discover Hub
        </header>
        <main style={{padding:'24px', maxWidth:960, margin:'0 auto'}}>
          {children}
        </main>
        <footer style={{padding:'24px', borderTop:'1px solid #eee', marginTop:48, color:'#666'}}>
          © {new Date().getFullYear()} creatorhavn
        </footer>
      </body>
    </html>
  );
}
