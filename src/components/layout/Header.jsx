export default function Header() {
  return (
    <header className="app-header">
      <div>
        <h1>Daedabyte LLC</h1>
        <p>Finance &amp; Budget Tracker</p>
      </div>
      <div style={{ textAlign: 'right', fontSize: '0.85rem', opacity: 0.85 }}>
        <div>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>
    </header>
  );
}
