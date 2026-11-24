'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/site';
import { CartPanel } from '@/components/cart-panel';
import { useCart } from '@/components/cart';
import { aud } from '@/lib/money';

type Store = {
  acceptingOrders: boolean;
  statusLabel: string;
  notice: string;
  slots: string[];
  paymentMethods: ('CARD' | 'PICKUP')[];
};

export default function Checkout() {
  const { lines, totalCents, clear, ready } = useCart();
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '', pickupTime: '', paymentMethod: 'CARD' as 'CARD' | 'PICKUP' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    setCancelled(new URLSearchParams(location.search).has('cancelled'));
    try {
      const saved = JSON.parse(localStorage.getItem('missviet-me') || '{}');
      setForm((f) => ({ ...f, name: saved.name ?? '', phone: saved.phone ?? '', email: saved.email ?? '' }));
    } catch {}
    fetch('/api/store')
      .then((r) => r.json())
      .then((s: Store) => {
        setStore(s);
        let saved = '';
        try {
          saved = localStorage.getItem('missviet-pickup') || '';
        } catch {}
        setForm((f) => ({ ...f, pickupTime: s.slots.includes(saved) ? saved : s.slots[0] ?? '', paymentMethod: s.paymentMethods[0] }));
      })
      .catch(() => setErr('We couldn’t load pickup times. Refresh the page to try again.'));
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      localStorage.setItem('missviet-me', JSON.stringify({ name: form.name, phone: form.phone, email: form.email }));
    } catch {}
    try {
      const r = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          lines: lines.map((l) => ({ itemId: l.itemId, qty: l.qty, note: l.note, choices: l.choices.map((c) => ({ group: c.group, label: c.label })) })),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Something went wrong placing your order.');
      clear();
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
      else router.push(`/order/${data.orderId}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  const closed = store && (!store.acceptingOrders || store.slots.length === 0);

  return (
    <>
      <SiteHeader />
      <main className="wrap checkout">
        <form onSubmit={placeOrder} noValidate>
          <h1>Checkout</h1>
          {cancelled && <p className="notice" style={{ marginBottom: 16 }}>Payment was cancelled, so we haven’t sent your order to the kitchen. Your cart is below if you want to try again.</p>}
          {store?.notice && <p className="notice" style={{ marginBottom: 16 }}>{store.notice}</p>}
          {closed && (
            <p className="error">
              {store!.acceptingOrders ? `We’re not taking online orders right now. ${store!.statusLabel}.` : 'Online ordering is paused right now.'} Call{' '}
              <a href="tel:0426808016">0426 808 016</a> if you need us.
            </p>
          )}

          <h2>Your details</h2>
          <div className="field">
            <label htmlFor="name">Name for the order</label>
            <input id="name" className="input" autoComplete="given-name" required value={form.name} onChange={set('name')} />
          </div>
          <div className="field">
            <label htmlFor="phone">Mobile number <span className="hint">We’ll only call if there’s a problem</span></label>
            <input id="phone" className="input" type="tel" autoComplete="tel" required value={form.phone} onChange={set('phone')} />
          </div>
          <div className="field">
            <label htmlFor="email">Email <span className="hint">Optional, for your receipt and a ready-to-collect message</span></label>
            <input id="email" className="input" type="email" autoComplete="email" value={form.email} onChange={set('email')} />
          </div>

          <h2>Pickup</h2>
          <div className="field">
            <label htmlFor="pickup">Pickup time</label>
            <select id="pickup" className="input" value={form.pickupTime} onChange={set('pickupTime')} disabled={!store || !!closed}>
              {store?.slots.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="notes">Note for the kitchen <span className="hint">Optional</span></label>
            <textarea id="notes" className="input" maxLength={300} value={form.notes} onChange={set('notes')} placeholder="Allergies, or anything else we should know" />
          </div>

          <h2>Payment</h2>
          <div className="pay-choice" role="radiogroup">
            {store?.paymentMethods.includes('CARD') && (
              <label className="opt">
                <input type="radio" name="pay" checked={form.paymentMethod === 'CARD'} onChange={() => setForm((f) => ({ ...f, paymentMethod: 'CARD' }))} />
                <span>Pay now by card, Apple Pay or Google Pay</span>
                <span />
              </label>
            )}
            <label className="opt">
              <input type="radio" name="pay" checked={form.paymentMethod === 'PICKUP'} onChange={() => setForm((f) => ({ ...f, paymentMethod: 'PICKUP' }))} />
              <span>Pay at the counter when you pick up</span>
              <span />
            </label>
          </div>

          {err && <p className="error" role="alert" style={{ marginTop: 18 }}>{err}</p>}

          <button className="btn btn-red btn-block" style={{ marginTop: 24 }} disabled={busy || !ready || lines.length === 0 || !store || !!closed}>
            {busy
              ? 'Placing your order…'
              : form.paymentMethod === 'CARD'
                ? `Pay ${aud(totalCents)} and place order`
                : `Place order, pay ${aud(totalCents)} at pickup`}
          </button>
          {ready && lines.length === 0 && (
            <p style={{ marginTop: 12 }}>
              Your cart is empty. <Link href="/menu">Add something from the menu</Link>.
            </p>
          )}
        </form>
        <CartPanel checkout />
      </main>
    </>
  );
}
