import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';

export default function AboutPage() {
  return (
    <main className="about-page">
      <nav className="nav shell relay-nav">
        <Link className="brand" href="/"><BrandMark /> Grapifly</Link>
        <div className="relay-nav-links"><Link href="/#ecosystem">Ecosystem</Link><Link className="relay-home-link" href="/home">My apps</Link></div>
      </nav>

      <section className="about-hero shell">
        <span className="section-kicker">The meaning behind our name</span>
        <h1>A solution is a grape.<br /><span>Together, ideas fly.</span></h1>
        <p>Grapifly is an ecosystem built on a simple belief: focused solutions become more powerful when they work together.</p>
        <div className="word-story">
          <article><strong>Grap</strong><span>A grape</span><p>One focused solution designed to solve one real problem.</p></article>
          <i>+</i>
          <article><strong>Fly</strong><span>Forward motion</span><p>What becomes possible when connected solutions help an idea grow.</p></article>
          <i>=</i>
          <article className="word-result"><strong>Grapifly</strong><span>The ecosystem</span><p>Multiple solutions connected around your identity and your goals.</p></article>
        </div>
      </section>

      <section className="cluster-story shell">
        <div className="story-cluster" aria-hidden="true"><b/><i/><i/><i/><i/><i/><i/><i/><i/></div>
        <div><span className="section-kicker">The cluster</span><h2>Every grape has a purpose.</h2><p>JTrade, Business and Relay each solve a distinct set of problems. Like grapes in a cluster, they retain their own identity while sharing a connection that makes the whole ecosystem stronger.</p><p>You choose the solutions your idea needs. Grapifly connects them without forcing you into everything else.</p></div>
      </section>

      <section className="stem-story shell">
        <span className="section-kicker">The stem</span>
        <h2>Identity is the connection.</h2>
        <div className="stem-grid">
          <article><span>01</span><h3>One Grapifly ID</h3><p>A single, secure identity across every solution in your ecosystem.</p></article>
          <article><span>02</span><h3>Your permissions</h3><p>You decide which applications and external services can act for you.</p></article>
          <article><span>03</span><h3>Solutions in sync</h3><p>Applications collaborate through clear boundaries and trusted connections.</p></article>
        </div>
      </section>

      <section className="manifesto shell">
        <span>Our belief</span>
        <blockquote>“One solution helps.<br />Connected solutions make ideas fly.”</blockquote>
        <p>An idea does not need one enormous platform. It needs the right solutions, thoughtfully connected.</p>
      </section>

      <section className="about-products shell">
        <span className="section-kicker">The first grapes</span><h2>Our ecosystem is taking shape.</h2>
        <div><article className="violet"><strong>JTrade</strong><span>Trading and investment</span></article><article className="blue"><strong>Business</strong><span>Business operations</span></article><article className="orange"><strong>Relay</strong><span>Connections and automation</span><Link href="/apps/relay">Learn more →</Link></article></div>
      </section>

      <footer className="shell"><div className="brand"><BrandMark /> Grapifly</div><span>Solutions connected. Ideas in flight.</span></footer>
    </main>
  );
}
