import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';

const solutions = [
  { icon: '✉', name: 'Email', text: 'Connect Gmail, Outlook or SMTP and send communications from authorized accounts.' },
  { icon: '▣', name: 'Calendars', text: 'Read, create and synchronize events across Google Calendar, Outlook and CalDAV.' },
  { icon: '$', name: 'Payments', text: 'Connect payment providers and enable authorized financial processes.' },
  { icon: '≡', name: 'Accounting', text: 'Integrate accounting platforms and automate the secure flow of information.' },
  { icon: '◫', name: 'Files', text: 'Manage the documents and resources that support your processes and communications.' },
  { icon: '+', name: 'More', text: 'Relay is ready for new solutions, channels and providers.' },
];

export default function RelayPage() {
  return (
    <main className="relay-page">
      <nav className="nav shell relay-nav">
        <Link className="brand" href="/"><BrandMark /> Grapifly</Link>
        <div className="relay-nav-links"><Link href="/">Ecosystem</Link><Link href="/about">Our story</Link><Link className="relay-home-link" href="/home">My apps</Link></div>
      </nav>

      <section className="relay-hero shell">
        <div className="relay-badge"><span>✦</span> Relay by Grapifly</div>
        <h1>Connect once.<br /><span>Relay handles the rest.</span></h1>
        <p>Authorize your services and let the applications you use send, synchronize and automate processes securely.</p>
        <a className="relay-primary" href="http://localhost:3000">Open Relay <span>↗</span></a>
        <div className="relay-visual" aria-hidden="true">
          <div className="relay-center"><span>✦</span><strong>Relay</strong><small>Securely connected</small></div>
          {['Email','Calendar','Payments','Accounting'].map((label, index) => <div className={`relay-node node-${index + 1}`} key={label}><i />{label}</div>)}
        </div>
      </section>

      <section className="relay-purpose shell">
        <span className="section-kicker">A Grapifly solution</span>
        <h2>Your permissions.<br />Your services. In motion.</h2>
        <div className="purpose-grid">
          <p>Relay is Grapifly&apos;s connection and automation platform. You decide what to connect and which permissions to grant.</p>
          <p>When an application needs to act, Relay uses the authorized connection without sharing your credentials.</p>
        </div>
      </section>

      <section className="relay-solutions shell">
        <div className="relay-section-heading"><div><span className="section-kicker">Modular solutions</span><h2>One grape for every need.</h2></div><p>Activate only what you need. Every solution works on its own and becomes more valuable when connected to the others.</p></div>
        <div className="solution-grid">
          {solutions.map((solution, index) => <article className={`solution-card solution-${index + 1}`} key={solution.name}><span className="solution-icon">{solution.icon}</span><div><h3>{solution.name}</h3><p>{solution.text}</p></div></article>)}
        </div>
      </section>

      <section className="relay-flow shell">
        <span className="section-kicker">Simple by design</span>
        <h2>You authorize.<br />Relay acts for you.</h2>
        <div className="flow-steps">
          <article><span>01</span><h3>Connect</h3><p>Choose an external service and authenticate directly with its provider.</p></article>
          <article><span>02</span><h3>Authorize</h3><p>Grant only the permissions you need and revoke them whenever you choose.</p></article>
          <article><span>03</span><h3>Automate</h3><p>The applications in your ecosystem use Relay to complete the process.</p></article>
        </div>
      </section>

      <section className="relay-philosophy shell">
        <div className="grape-cluster" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/></div>
        <div><span className="section-kicker">The Grapifly philosophy</span><h2>Connected solutions.<br />Ideas in flight.</h2><p>Every solution is a grape that solves a specific need. Grapifly is the stem connecting the cluster, so multiple solutions can work together and make your idea fly.</p><Link className="philosophy-link" href="/about">Read the Grapifly story →</Link></div>
      </section>

      <section className="relay-cta shell"><span>Relay by Grapifly</span><h2>Complexity stays behind.<br />You keep moving forward.</h2><a href="http://localhost:3000">Explore Relay <span>↗</span></a></section>
      <footer className="shell"><div className="brand"><BrandMark /> Grapifly</div><span>Relay is part of the Grapifly ecosystem.</span></footer>
    </main>
  );
}
