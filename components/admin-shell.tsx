'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Icon = {
  orders: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12l2 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7z" />
      <path d="M4 7h16M9 11h6M9 15h6" />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15c0-4 3.6-7 8-7s8 3 8 7" />
      <path d="M2 15h20M12 5v3M6 19h12" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  ),
  site: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3h7v7M10 14 21 3M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6" />
    </svg>
  ),
  out: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  ),
};

export function AdminShell({ children, title, right, badge }: { children: React.ReactNode; title: string; right?: React.ReactNode; badge?: number }) {
  const p = usePathname();
  const tabs = [
    { href: '/admin', label: 'Orders', icon: Icon.orders, badge },
    { href: '/admin/menu', label: 'Menu', icon: Icon.menu },
    { href: '/admin/settings', label: 'Settings', icon: Icon.settings },
  ];
  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  }
  return (
    <div className="adm">
      <aside className="adm-side">
        <Link href="/admin" className="adm-brand">
          <span className="adm-logo">MV</span>
          <span>
            Miss Viet&rsquo;s
            <small>Kitchen dashboard</small>
          </span>
        </Link>
        <nav className="adm-nav">
          {tabs.map((t) => (
            <Link key={t.href} href={t.href} className={p === t.href ? 'active' : ''}>
              {t.icon}
              <span>{t.label}</span>
              {!!t.badge && <em className="adm-badge">{t.badge}</em>}
            </Link>
          ))}
        </nav>
        <div className="adm-side-foot">
          <a href="/" target="_blank" rel="noreferrer">
            {Icon.site}
            <span>View website</span>
          </a>
          <button onClick={logout}>
            {Icon.out}
            <span>Sign out</span>
          </button>
        </div>
      </aside>
      <div className="adm-main">
        <header className="adm-top">
          <h1>{title}</h1>
          <div className="adm-top-right">{right}</div>
        </header>
        <main className="adm-content">{children}</main>
      </div>
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="switch" title={label}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span />
    </label>
  );
}
