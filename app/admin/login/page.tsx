'use client';

import { useEffect, useState } from 'react';
import { FoodPhoto } from '@/components/food';

export default function Login() {
  const [mode, setMode] = useState<'loading' | 'login' | 'setup'>('loading');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/admin/setup')
      .then((r) => r.json())
      .then((d) => setMode(d.configured ? 'login' : 'setup'))
      .catch(() => setMode('login'));
  }, []);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (mode === 'setup' && pw !== pw2) return setErr('The two passwords don’t match.');
    setBusy(true);
    const r = await fetch(mode === 'setup' ? '/api/admin/setup' : '/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mode === 'setup' ? { code, password: pw } : { password: pw }),
    });
    if (r.ok) window.location.href = '/admin';
    else {
      setErr((await r.json()).error || 'That didn’t work. Try again.');
      setBusy(false);
    }
  }

  return (
    <main className="login2">
      <div className="login-art" aria-hidden>
        <div className="bob">
          <FoodPhoto kind="pho" />
        </div>
        <div className="bob b2">
          <FoodPhoto kind="banhmi" />
        </div>
        <p>Every order, the moment it lands.</p>
      </div>
      <form onSubmit={go}>
        <span className="adm-logo big">MV</span>
        {mode === 'setup' ? (
          <>
            <h1>Set up your dashboard</h1>
            <p className="muted" style={{ marginBottom: 20 }}>
              Create the staff password. You’ll need the one-time setup code from your latest Vercel build log (search the log for “ADMIN SETUP CODE”).
            </p>
            <div className="field">
              <label htmlFor="code">Setup code</label>
              <input id="code" className="input" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} style={{ textTransform: 'uppercase', letterSpacing: '0.15em' }} />
            </div>
            <div className="field">
              <label htmlFor="pw">New password <span className="hint">At least 8 characters</span></label>
              <input id="pw" type="password" className="input" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="pw2">Type it again</label>
              <input id="pw2" type="password" className="input" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </div>
          </>
        ) : (
          <>
            <h1>Kitchen dashboard</h1>
            <p className="muted" style={{ marginBottom: 20 }}>Sign in to see orders and manage the menu.</p>
            <div className="field">
              <label htmlFor="pw">Password</label>
              <input id="pw" type="password" className="input" autoFocus autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
          </>
        )}
        {err && <p className="error">{err}</p>}
        <button className="btn btn-red btn-block" disabled={busy || mode === 'loading' || !pw || (mode === 'setup' && (!code || !pw2))}>
          {busy ? 'One moment…' : mode === 'setup' ? 'Create password and sign in' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
