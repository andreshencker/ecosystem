import { BrandMark } from './BrandMark';

export function AdminSidebar({ active }: { active: 'users' | 'applications' }) {
  return <aside className="employee-sidebar">
    <a className="brand" href="/home"><BrandMark /> Grapifly</a>
    <div className="employee-product"><span>Platform</span><strong>Grapifly Admin</strong></div>
    <nav>
      <a className={active === 'users' ? 'active' : ''} href="/admin/users"><span>◎</span> Users</a>
      <a className={active === 'applications' ? 'active' : ''} href="/admin/applications"><span>◇</span> Applications</a>
      <span className="future-item"><span>⌘</span> Access <small>Coming next</small></span>
    </nav>
    <a className="back-to-account" href="/home">← Personal portal</a>
  </aside>;
}
