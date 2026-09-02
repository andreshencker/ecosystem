import { BrandMark } from './BrandMark';

export function AdminSidebar({ active }: { active: 'users' | 'applications' | 'access' | 'roles' | 'organizations' }) {
  return <aside className="employee-sidebar">
    <a className="brand" href="/home"><BrandMark /> Grapifly</a>
    <div className="employee-product"><span>Platform</span><strong>Grapifly Admin</strong></div>
    <nav>
      <a className={active === 'users' ? 'active' : ''} href="/admin/users"><span>◎</span> Users</a>
      <a className={active === 'organizations' ? 'active' : ''} href="/admin/organizations"><span>▣</span> Organizations</a>
      <a className={active === 'applications' ? 'active' : ''} href="/admin/applications"><span>◇</span> Applications</a>
      <a className={active === 'access' ? 'active' : ''} href="/admin/access"><span>⌘</span> Access</a>
      <a className={active === 'roles' ? 'active' : ''} href="/admin/roles"><span>⚑</span> Roles</a>
    </nav>
    <a className="back-to-account" href="/home">← Personal portal</a>
  </aside>;
}
