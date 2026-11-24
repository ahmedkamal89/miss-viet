'use client';

import { useState } from 'react';
import { DishPhoto, FoodPhoto } from '@/components/food';

export default function Login() {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
    if (r.ok) window.location.href = '/admin';
    else {
      setErr((await r.json()).error || 'Sign in failed.');
      setBusy(false);
    }
  }
  return (
    <main className="login2">
      <div className="login-art" aria-hidden>
        <div className="bob"><FoodPhoto kind="pho" /></div>
        <div className="bob b2"><FoodPhoto kind="banhmi" /></div>
        <p>Every order, the moment it lands.</p>
      </div>
      <form onSubmit={go}>
        <span className="adm-logo big">MV</span>
        <h1>Kitchen dashboard</h1>
        <p className="muted" style={{ marginBottom: 20 }}>Sign in to see orders and manage the menu.</p>
        <div className="field">
          <label htmlFor="pw">Password</label>
          <input id="pw" type="password" className="input" autoFocus autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
        {err && <p className="error">{err}</p>}
        <button className="btn btn-red btn-block" disabled={busy || !pw}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
