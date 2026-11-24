'use client';

import { useEffect, useState } from 'react';
import { AdminShell, Switch } from '@/components/admin-shell';
import { DAY_NAMES } from '@/lib/hours';
import type { StoreSettings } from '@/lib/types';

export default function SettingsPage() {
  const [s, setS] = useState<StoreSettings | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/admin/settings', { cache: 'no-store' }).then(async (r) => {
      if (r.status === 401) return (window.location.href = '/admin/login');
      setS(await r.json());
    });
  }, []);

  async function save(patch: Partial<StoreSettings>) {
    setErr('');
    const r = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    const d = await r.json();
    if (!r.ok) return setErr(d.error);
    setS(d);
    setMsg('Saved');
    setTimeout(() => setMsg(''), 2000);
  }

  async function testAlert() {
    const r = await fetch('/api/admin/test-alert', { method: 'POST' });
    const d = await r.json();
    setMsg(`Test sent. Push ${d.push ? 'is set up' : 'isn’t set up'}, email ${d.email ? 'is set up' : 'isn’t set up'}.`);
    setTimeout(() => setMsg(''), 5000);
  }

  if (!s) return <AdminShell title="Settings"><p>Loading…</p></AdminShell>;
  const order = [1, 2, 3, 4, 5, 6, 0];

  return (
    <AdminShell title="Settings" right={msg ? <span className="badge paid">{msg}</span> : null}>
      {err && <p className="error" style={{ maxWidth: 760 }}>{err}</p>}

      <section className="card panel">
        <h2>Online ordering</h2>
        <label style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Switch checked={s.acceptingOrders} onChange={(v) => save({ acceptingOrders: v })} label="Accept online orders" />
          {s.acceptingOrders ? 'Taking online orders' : 'Online orders are paused'}
        </label>
        <p style={{ color: 'var(--muted)', marginTop: 8, fontSize: 14 }}>Pause this when the kitchen is slammed or you’re closing early.</p>
        <div className="field" style={{ marginTop: 18, maxWidth: 260 }}>
          <label htmlFor="prep">Usual prep time (minutes)</label>
          <input id="prep" className="input" type="number" min={5} max={120} defaultValue={s.prepMinutes} onBlur={(e) => save({ prepMinutes: Number(e.target.value) })} />
        </div>
        <div className="field">
          <label htmlFor="notice">Message at the top of the menu <span className="hint">Optional, e.g. “Closed Monday for the public holiday”</span></label>
          <input id="notice" className="input" defaultValue={s.notice} onBlur={(e) => save({ notice: e.target.value })} maxLength={200} />
        </div>
      </section>

      <section className="card panel">
        <h2>Opening hours</h2>
        <div className="hours-edit">
          {order.map((d) => {
            const h = s.hours[d];
            const setDay = (v: StoreSettings['hours'][number]) => setS({ ...s, hours: s.hours.map((x, i) => (i === d ? v : x)) });
            return (
              <div key={d} style={{ display: 'contents' }}>
                <span>{DAY_NAMES[d]}</span>
                <Switch checked={!!h} onChange={(v) => setDay(v ? { open: '09:00', close: '16:00' } : null)} label={`Open on ${DAY_NAMES[d]}`} />
                {h ? (
                  <>
                    <input className="input" type="time" value={h.open} onChange={(e) => setDay({ ...h, open: e.target.value })} aria-label={`${DAY_NAMES[d]} opens`} />
                    <input className="input" type="time" value={h.close} onChange={(e) => setDay({ ...h, close: e.target.value })} aria-label={`${DAY_NAMES[d]} closes`} />
                  </>
                ) : (
                  <span style={{ gridColumn: 'span 2', color: 'var(--muted)' }}>Closed</span>
                )}
              </div>
            );
          })}
        </div>
        <button className="btn btn-red" style={{ marginTop: 18 }} onClick={() => save({ hours: s.hours })}>Save hours</button>
      </section>

      <section className="card panel">
        <h2>New-order alerts</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 14, fontSize: 14 }}>
          Turn on sound and notifications from the Orders screen on each device you want alerted (the counter tablet, your phone, the office computer). Email alerts go to the address set in the hosting settings.
        </p>
        <button className="btn btn-quiet" onClick={testAlert}>Send a test alert</button>
      </section>
    </AdminShell>
  );
}
