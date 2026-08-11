import Link from 'next/link';
import { BrandMark } from '@/components/BrandMark';

const solutions = [
  { icon: '✉', name: 'Email', text: 'Conecta Gmail, Outlook o SMTP y envía comunicaciones desde las cuentas autorizadas.' },
  { icon: '▣', name: 'Calendars', text: 'Consulta, crea y sincroniza eventos en Google Calendar, Outlook y CalDAV.' },
  { icon: '$', name: 'Payments', text: 'Conecta proveedores de pago y facilita procesos financieros autorizados.' },
  { icon: '≡', name: 'Accounting', text: 'Integra plataformas contables y automatiza el movimiento seguro de información.' },
  { icon: '◫', name: 'Files', text: 'Gestiona documentos y recursos que acompañan tus procesos y comunicaciones.' },
  { icon: '+', name: 'More', text: 'Relay está preparado para incorporar nuevas soluciones y proveedores.' },
];

export default function RelayPage() {
  return (
    <main className="relay-page">
      <nav className="nav shell relay-nav">
        <Link className="brand" href="/"><BrandMark /> Grapifly</Link>
        <div className="relay-nav-links"><Link href="/">Ecosistema</Link><Link className="relay-home-link" href="/home">Mis apps</Link></div>
      </nav>

      <section className="relay-hero shell">
        <div className="relay-badge"><span>✦</span> Relay by Grapifly</div>
        <h1>Conecta una vez.<br /><span>Relay hace el resto.</span></h1>
        <p>Autoriza tus servicios y permite que las aplicaciones que utilizas envíen, sincronicen y automaticen procesos de forma segura.</p>
        <a className="relay-primary" href="http://localhost:3000">Abrir Relay <span>↗</span></a>
        <div className="relay-visual" aria-hidden="true">
          <div className="relay-center"><span>✦</span><strong>Relay</strong><small>Securely connected</small></div>
          {['Email','Calendar','Payments','Accounting'].map((label, index) => <div className={`relay-node node-${index + 1}`} key={label}><i />{label}</div>)}
        </div>
      </section>

      <section className="relay-purpose shell">
        <span className="section-kicker">Una solución de Grapifly</span>
        <h2>Tus permisos.<br />Tus servicios. En movimiento.</h2>
        <div className="purpose-grid">
          <p>Relay es la plataforma de conexiones y automatización de Grapifly. Tú decides qué conectar y qué permisos conceder.</p>
          <p>Cuando una aplicación necesita realizar una acción, Relay utiliza la conexión autorizada sin compartir tus credenciales.</p>
        </div>
      </section>

      <section className="relay-solutions shell">
        <div className="relay-section-heading"><div><span className="section-kicker">Soluciones modulares</span><h2>Una uva para cada necesidad.</h2></div><p>Activa solamente lo que necesitas. Cada solución funciona individualmente y aumenta su valor cuando se conecta con las demás.</p></div>
        <div className="solution-grid">
          {solutions.map((solution, index) => <article className={`solution-card solution-${index + 1}`} key={solution.name}><span className="solution-icon">{solution.icon}</span><div><h3>{solution.name}</h3><p>{solution.text}</p></div></article>)}
        </div>
      </section>

      <section className="relay-flow shell">
        <span className="section-kicker">Simple por diseño</span>
        <h2>Tú autorizas.<br />Relay actúa por ti.</h2>
        <div className="flow-steps">
          <article><span>01</span><h3>Conecta</h3><p>Elige un servicio externo y autentícate directamente con su proveedor.</p></article>
          <article><span>02</span><h3>Autoriza</h3><p>Concede solamente los permisos necesarios y revócalos cuando quieras.</p></article>
          <article><span>03</span><h3>Automatiza</h3><p>Las aplicaciones de tu ecosistema utilizan Relay para completar el proceso.</p></article>
        </div>
      </section>

      <section className="relay-philosophy shell">
        <div className="grape-cluster" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/></div>
        <div><span className="section-kicker">La filosofía Grapifly</span><h2>Soluciones conectadas.<br />Ideas que vuelan.</h2><p>Cada solución es una uva que resuelve una necesidad. Grapifly es el tallo que conecta el racimo para que múltiples soluciones trabajen juntas y hagan volar tu idea.</p></div>
      </section>

      <section className="relay-cta shell"><span>Relay by Grapifly</span><h2>Lo complejo sucede detrás.<br />Tú solo sigues adelante.</h2><a href="http://localhost:3000">Explorar Relay <span>↗</span></a></section>
      <footer className="shell"><div className="brand"><BrandMark /> Grapifly</div><span>Relay is part of the Grapifly ecosystem.</span></footer>
    </main>
  );
}
