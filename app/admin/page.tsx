'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AdminShell } from '@/components/admin-shell';
import { HourChart, Kpi, TopDishes } from '@/components/admin-widgets';
import { DishPhoto, FoodPhoto } from '@/components/food';
import { aud } from '@/lib/money';
import type { Order, OrderStatus } from '@/lib/types';

const POLL_MS = 4000;

type Stats = {
  days: { label: string; count: number; cents: number }[];
  hours: { hour: number; count: number; cents: number }[];
  top: { name: string; qty: number; cents: number }[];
  yesterday: { count: number; total: number };
};

function b64ToUint8(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Three-note chime made with Web Audio, so there's no sound file to host. */
function chime(ctx: AudioContext) {
  const now = ctx.currentTime;
  [880, 1175, 1568].forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, now + i * 0.18);
    g.gain.exponentialRampToValueAtTime(0.5, now + i * 0.18 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.5);
    o.connect(g).connect(ctx.destination);
    o.start(now + i * 0.18);
    o.stop(now + i * 0.18 + 0.55);
  });
}

const time = (iso: string) => new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Adelaide' });
const mins = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 60000);

function greeting() {
  const h = Number(new Intl.DateTimeFormat('en-AU', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Australia/Adelaide' }).format(new Date()));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function delta(now: number, before: number, money = false) {
  if (!before && !now) return 'No orders yet';
  if (!before) return 'First orders today';
  const d = now - before;
  const v = money ? aud(Math.abs(d)) : Math.abs(d);
  return d === 0 ? 'Same as yesterday' : `${d > 0 ? '▲' : '▼'} ${v} vs yesterday`;
}

export default function OrdersBoard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [today, setToday] = useState({ count: 0, total: 0 });
  const [stats, setStats] = useState<Stats | null>(null);
  const [scope, setScope] = useState<'active' | 'history'>('active');
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [popup, setPopup] = useState<Order | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [pushState, setPushState] = useState<'unsupported' | 'off' | 'on' | 'denied'>('off');
  const [err, setErr] = useState('');
  const [, tick] = useState(0);
  const seen = useRef<Set<string> | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const titleTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const popTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const alertNew = useCallback(
    (newOnes: Order[]) => {
      if (soundOn && audio.current) {
        chime(audio.current);
        setTimeout(() => audio.current && chime(audio.current), 1400);
      }
      setPopup(newOnes[newOnes.length - 1]);
      if (popTimer.current) clearTimeout(popTimer.current);
      popTimer.current = setTimeout(() => setPopup(null), 12000);
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden && pushState !== 'on') {
        for (const o of newOnes) new Notification(`New order #${o.number}, ${aud(o.subtotalCents)}`, { body: `${o.customerName}, ${o.pickupTime}`, tag: o.id });
      }
      if (titleTimer.current) clearInterval(titleTimer.current);
      let on = false;
      titleTimer.current = setInterval(() => {
        document.title = (on = !on) ? `🔴 ${newOnes.length} new order${newOnes.length > 1 ? 's' : ''}` : 'Orders | Miss Viet’s';
      }, 900);
    },
    [soundOn, pushState],
  );

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/orders?scope=${scope === 'active' ? 'active' : 'all'}`, { cache: 'no-store' });
      if (r.status === 401) return (window.location.href = '/admin/login');
      const d = await r.json();
      setOrders(d.orders);
      setToday(d.today);
      setStats(d.stats);
      setErr('');
      const ids = new Set<string>(d.orders.map((o: Order) => o.id));
      if (seen.current) {
        const newOnes = (d.orders as Order[]).filter((o) => o.status === 'NEW' && !seen.current!.has(o.id));
        if (newOnes.length) {
          setFresh((f) => new Set([...f, ...newOnes.map((o) => o.id)]));
          alertNew(newOnes);
        }
        ids.forEach((id) => seen.current!.add(id));
      } else seen.current = ids;
    } catch {
      setErr('Lost connection. Retrying…');
    }
  }, [scope, alertNew]);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 30000);
    const stop = () => {
      if (titleTimer.current) clearInterval(titleTimer.current);
      document.title = 'Orders | Miss Viet’s';
    };
    window.addEventListener('focus', stop);
    return () => {
      clearInterval(t);
      window.removeEventListener('focus', stop);
    };
  }, []);

  useEffect(() => {
    // Sound needs one click per visit: browsers block audio until the page is interacted with.
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return setPushState('unsupported');
    if (Notification.permission === 'denied') return setPushState('denied');
    navigator.serviceWorker.getRegistration('/sw.js').then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription();
      setPushState(sub ? 'on' : 'off');
    });
  }, []);

  function enableSound() {
    audio.current ??= new AudioContext();
    audio.current.resume();
    chime(audio.current);
    setSoundOn(true);
  }

  async function enablePush() {
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return setPushState('denied');
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const { publicKey } = await fetch('/api/admin/push').then((r) => r.json());
      if (!publicKey) throw new Error('push keys are not set up');
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(publicKey) }));
      await fetch('/api/admin/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) });
      setPushState('on');
    } catch (e) {
      setErr(`Couldn’t turn on notifications: ${(e as Error).message}`);
    }
  }

  async function setStatus(o: Order, status: OrderStatus, extra: Record<string, unknown> = {}) {
    if (status === 'CANCELLED' && !confirm(`Cancel order #${o.number}?${o.paymentStatus === 'PAID' ? ' It was paid online, so refund it in your Stripe dashboard.' : ''}`)) return;
    setFresh((f) => {
      const n = new Set(f);
      n.delete(o.id);
      return n;
    });
    if (popup?.id === o.id) setPopup(null);
    setOrders((list) => list.map((x) => (x.id === o.id ? { ...x, status, ...extra } : x)).filter((x) => scope !== 'active' || ['NEW', 'PREPARING', 'READY'].includes(x.status)));
    const r = await fetch(`/api/admin/orders/${o.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, ...extra }) });
    if (!r.ok) setErr('That change didn’t save. Try again.');
    load();
  }

  const active = orders.filter((o) => ['NEW', 'PREPARING', 'READY'].includes(o.status));
  const newCount = active.filter((o) => o.status === 'NEW').length;
  const cols: { key: OrderStatus; title: string; tone: string }[] = [
    { key: 'NEW', title: 'New', tone: 'var(--chili)' },
    { key: 'PREPARING', title: 'Making', tone: 'var(--carrot)' },
    { key: 'READY', title: 'Ready for pickup', tone: 'var(--herb)' },
  ];

  return (
    <AdminShell
      title="Orders"
      badge={newCount}
      right={
        <>
          <span className="live-pill">
            <i /> Live
          </span>
          <button className={`chip-btn${soundOn ? ' on' : ''}`} onClick={enableSound} aria-pressed={soundOn}>
            {soundOn ? '🔔 Sound on' : '🔕 Turn on sound'}
          </button>
          {pushState !== 'unsupported' && (
            <button className={`chip-btn${pushState === 'on' ? ' on' : ''}`} onClick={enablePush} disabled={pushState === 'on' || pushState === 'denied'}>
              {pushState === 'on' ? '✓ Notifications on' : pushState === 'denied' ? 'Notifications blocked' : 'Turn on notifications'}
            </button>
          )}
        </>
      }
    >
      <p className="adm-hello">
        {greeting()}. {newCount ? `You have ${newCount} new order${newCount > 1 ? 's' : ''} waiting.` : active.length ? `${active.length} order${active.length > 1 ? 's' : ''} in the kitchen.` : 'All quiet. New orders will pop up here with a chime.'}
      </p>
      {err && <p className="error">{err}</p>}
      {pushState === 'denied' && <p className="notice" style={{ marginBottom: 16 }}>Notifications are blocked for this site. Allow them in your browser’s site settings to get alerts.</p>}

      <div className="kpis">
        <Kpi
          label="Orders today"
          value={today.count}
          tone="#d62b1f"
          delta={stats ? delta(today.count, stats.yesterday.count) : ''}
          spark={stats?.days.map((d) => d.count)}
          icon={<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3h12l2 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7zM4 7h16M9 11h6M9 15h6" /></svg>}
        />
        <Kpi
          label="Sales today"
          value={today.total}
          money
          tone="#3e8e5a"
          delta={stats ? delta(today.total, stats.yesterday.total, true) : ''}
          spark={stats?.days.map((d) => d.cents)}
          icon={<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
        />
        <Kpi
          label="Average order"
          value={today.count ? Math.round(today.total / today.count) : 0}
          money
          tone="#f28c28"
          delta="Today, incl. GST"
          icon={<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18M7 15l4-4 3 3 6-6" /></svg>}
        />
        <Kpi
          label="In the kitchen"
          value={active.length}
          tone="#2d5da8"
          delta={newCount ? `${newCount} waiting to start` : 'Nothing waiting'}
          icon={<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15c0-4 3.6-7 8-7s8 3 8 7M2 15h20M12 5v3M6 19h12" /></svg>}
        />
      </div>

      <div className="adm-row">
        <section className="panel">
          <header className="panel-head">
            <h2>Today by the hour</h2>
            <span className="muted">{today.count} orders</span>
          </header>
          <HourChart hours={stats?.hours ?? []} />
        </section>
        <section className="panel">
          <header className="panel-head">
            <h2>Best sellers</h2>
            <span className="muted">Last 7 days</span>
          </header>
          <TopDishes top={stats?.top ?? []} />
        </section>
      </div>

      <div className="board-head">
        <h2>Kitchen board</h2>
        <div className="seg" role="tablist">
          <button className={scope === 'active' ? 'on' : ''} onClick={() => setScope('active')}>
            Live
          </button>
          <button className={scope === 'history' ? 'on' : ''} onClick={() => setScope('history')}>
            Last 14 days
          </button>
        </div>
      </div>

      {scope === 'active' ? (
        <div className="board-cols">
          {cols.map((c) => {
            const list = orders.filter((o) => o.status === c.key);
            return (
              <section className="col2" key={c.key} aria-label={c.title} style={{ ['--tone' as string]: c.tone }}>
                <h3>
                  <span className="dot" /> {c.title} <em>{list.length}</em>
                </h3>
                {list.length === 0 && (
                  <div className="empty-col">
                    {c.key === 'NEW' ? (
                      <>
                        <DishPhoto name="banh mi" className="empty-art bob" />
                        New orders appear here with a chime.
                      </>
                    ) : (
                      'Nothing here.'
                    )}
                  </div>
                )}
                {list.map((o) => (
                  <Ticket key={o.id} o={o} fresh={fresh.has(o.id)} onStatus={setStatus} />
                ))}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Placed</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <b>{o.number}</b>
                  </td>
                  <td>{new Date(o.createdAt).toLocaleString('en-AU', { timeZone: 'Australia/Adelaide', dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td>
                    {o.customerName}
                    <br />
                    <small>{o.phone}</small>
                  </td>
                  <td>{o.items.map((l) => `${l.qty}× ${l.name}`).join(', ')}</td>
                  <td className="price">{aud(o.subtotalCents)}</td>
                  <td>
                    <span className={`badge ${o.paymentStatus === 'PAID' ? 'paid' : 'unpaid'}`}>{o.paymentStatus === 'PAID' ? 'Paid' : 'At pickup'}</span>
                  </td>
                  <td>
                    <span className={`status-tag st-${o.status.toLowerCase()}`}>{o.status.toLowerCase()}</span>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7}>No orders in the last 14 days.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {popup && (
        <div className="new-pop" role="alert">
          <div className="np-art">
            <DishPhoto name={popup.items[0]?.name ?? 'banh mi'} />
          </div>
          <div className="np-body">
            <span className="np-kicker">New order</span>
            <b className="np-num">#{popup.number}</b>
            <p>
              {popup.customerName}, {popup.pickupTime}
              <br />
              {popup.items.map((l) => `${l.qty}× ${l.name}`).join(', ')}
            </p>
            <div className="np-acts">
              <button className="btn btn-sm btn-red" onClick={() => setStatus(popup, 'PREPARING')}>
                Start making
              </button>
              <button className="btn btn-sm btn-quiet" onClick={() => setPopup(null)}>
                Later
              </button>
            </div>
          </div>
          <span className="np-total">{aud(popup.subtotalCents)}</span>
        </div>
      )}
    </AdminShell>
  );
}

function Ticket({ o, fresh, onStatus }: { o: Order; fresh: boolean; onStatus: (o: Order, s: OrderStatus, extra?: Record<string, unknown>) => void }) {
  const m = mins(o.createdAt);
  const late = o.status !== 'READY' && m >= 20 ? 'late' : o.status !== 'READY' && m >= 10 ? 'warm' : '';
  return (
    <article className={`ticket2${fresh ? ' fresh' : ''}`}>
      <header>
        <span className="no">#{o.number}</span>
        <span className={`timer ${late}`}>{m < 1 ? 'just now' : m < 60 ? `${m} min` : time(o.createdAt)}</span>
      </header>
      <div className="t-who">
        <b>{o.customerName}</b>
        <a href={`tel:${o.phone}`}>{o.phone}</a>
      </div>
      <div className="t-meta">
        <span className="t-pick">Pickup {o.pickupTime}</span>
        <span className={`badge ${o.paymentStatus === 'PAID' ? 'paid' : 'unpaid'}`}>{o.paymentStatus === 'PAID' ? 'Paid online' : `Collect ${aud(o.subtotalCents)}`}</span>
      </div>
      <ul>
        {o.items.map((l, i) => (
          <li key={i}>
            <span className="q">{l.qty}</span>
            <span>
              {l.name}
              {(l.choices.length > 0 || l.note) && (
                <small>
                  {l.choices.map((c) => c.label).join(', ')}
                  {l.note ? ` “${l.note}”` : ''}
                </small>
              )}
            </span>
          </li>
        ))}
      </ul>
      {o.notes && <p className="t-note">📝 {o.notes}</p>}
      <div className="acts">
        {o.status === 'NEW' && (
          <button className="btn btn-sm btn-red grow" onClick={() => onStatus(o, 'PREPARING')}>
            Start making
          </button>
        )}
        {o.status === 'PREPARING' && (
          <button className="btn btn-sm btn-carrot grow" onClick={() => onStatus(o, 'READY')}>
            Mark ready
          </button>
        )}
        {o.status === 'READY' && (
          <button className="btn btn-sm btn-herb grow" onClick={() => onStatus(o, 'COMPLETED', o.paymentStatus === 'PAID' ? {} : { paid: true })}>
            {o.paymentStatus === 'PAID' ? 'Collected' : 'Paid and collected'}
          </button>
        )}
        <button className="btn btn-sm btn-quiet" onClick={() => onStatus(o, 'CANCELLED')}>
          Cancel
        </button>
      </div>
    </article>
  );
}
