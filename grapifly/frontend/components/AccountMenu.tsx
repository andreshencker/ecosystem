'use client';

import { useEffect, useRef, useState } from 'react';
import { useGrapiflyThemeMode } from './GrapiflyThemeProvider';

interface AccountMenuUser {
  displayName: string;
  email: string;
  avatarUrl: string | null;
}

export function AccountMenu({ user, onSignOut }: { user: AccountMenuUser | null; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { mode, toggleMode } = useGrapiflyThemeMode();

  useEffect(() => {
    if (!open) return;
    function onClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div className="account-menu" ref={rootRef}>
      <button type="button" className="shell-profile" onClick={() => setOpen(current => !current)} aria-haspopup="menu" aria-expanded={open}>
        {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span>{user?.displayName?.[0] ?? 'G'}</span>}
        <div><strong>{user?.displayName ?? 'Grapifly'}</strong><small>{user?.email ?? 'Loading identity…'}</small></div>
      </button>
      {open && (
        <div className="account-menu-panel" role="menu">
          <button type="button" role="menuitem" className="account-menu-item" onClick={() => { toggleMode(); }}>
            <i aria-hidden="true">{mode === 'dark' ? '☀' : '☽'}</i>
            <span>{mode === 'dark' ? 'Light theme' : 'Dark theme'}</span>
          </button>
          <div className="account-menu-divider" />
          <button type="button" role="menuitem" className="account-menu-item danger" onClick={() => { setOpen(false); onSignOut(); }}>
            <i aria-hidden="true">↪</i>
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}
