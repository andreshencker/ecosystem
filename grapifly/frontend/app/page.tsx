import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';
import { GoogleButton } from '@/components/GoogleButton';

const products = [
  { name: 'JTrade', detail: 'Markets, decisions and performance in one place.', tone: 'violet', glyph: '↗' },
  { name: 'Business', detail: 'Run your company with clarity and confidence.', tone: 'blue', glyph: 'B' },
  { name: 'Relay', detail: 'Connect your services. Relay handles the rest.', tone: 'orange', glyph: '✦', href: '/apps/relay' },
];

export default function LandingPage() {
  return (
    <main>
      <nav className="nav shell">
        <Link className="brand" href="/"><BrandMark /> Grapifly</Link>
        <div className="nav-links"><a href="#ecosystem">Ecosystem</a><a href="#privacy">Privacy</a><GoogleButton label="Sign in" /></div>
      </nav>

      <section className="hero shell">
        <div className="eyebrow">One account. Your entire digital world.</div>
        <h1>Everything works<br />better together.</h1>
        <p>One secure Grapifly ID brings your work, communication and trading experiences together—simply.</p>
        <GoogleButton />
        <span className="microcopy">No new password. Your Google account is all you need.</span>
        <div className="orb-stage" aria-hidden="true">
          <div className="orb orb-one" /><div className="orb orb-two" /><div className="orb orb-three" />
          <div className="glass-core"><BrandMark /><strong>Your Grapifly ID</strong><span>One identity, securely connected.</span></div>
        </div>
      </section>

      <section className="ecosystem shell" id="ecosystem">
        <span className="section-kicker">The Grapifly ecosystem</span>
        <h2>Made for each other.<br />Designed around you.</h2>
        <div className="product-grid">
          {products.map((product) => (
            <article className={`product-card ${product.tone}`} key={product.name}>
              <div className="app-icon">{product.glyph}</div>
              <div><h3>{product.name}</h3><p>{product.detail}</p></div>
              {product.href ? <Link className="card-more" href={product.href}>Ver más <span>→</span></Link> : <span className="card-arrow">→</span>}
            </article>
          ))}
        </div>
      </section>

      <section className="privacy shell" id="privacy">
        <div className="privacy-symbol">◎</div>
        <div><span className="section-kicker">Privacy, built in</span><h2>Your identity belongs to you.</h2><p>Grapifly uses Google to confirm who you are. We never receive your Google password, and every application gets only the access it needs.</p></div>
      </section>

      <footer className="shell"><div className="brand"><BrandMark /> Grapifly</div><span>© 2026 Grapifly. Built thoughtfully.</span></footer>
    </main>
  );
}
