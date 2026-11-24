'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { SiteHeader } from '@/components/site';
import { aud } from '@/lib/money';
import type { OrderLine, OrderStatus } from '@/lib/types';
import { DishPhoto, FoodPhoto } from '@/components/food';

const COLORS = ['#d62b1f', '#f28c28', '#ffd27a', '#3e8e5a', '#7cc35b', '#ffffff'];

function Confetti() {
  const bits = Array.from({ length: 90 }, (_, i) => ({
    left: `${(i * 37) % 100}%`,
    delay: `${((i * 13) % 30) / 30}s`,
    color: COLORS[i % COLORS.length],
    rot: `${(i * 47) % 360}deg`,
    dur: `${2.2 + ((i * 7) % 10) / 10}s`,
  }));
  return (
    <div className="confetti" aria-hidden>
      {bits.map((b, i) => (
        <i key={i} style={{ left: b.left, background: b.color, animationDelay: b.delay, animationDuration: b.dur, transform: `rotate(${b.rot})` }} />
      ))}
    </div>
  );
}

type PublicOrder = {
  id: string;
  number: number;
  customerName: string;
  pickupTime: string;
  items: OrderLine[];
  subtotalCents: number;
  status: OrderStatus;
  paymentMethod: 'CARD' | 'PICKUP';
  paymentStatus: string;
};

const STEP: Record<OrderStatus, number> = { PENDING_PAYMENT: 0, NEW: 1, PREPARING: 2, READY: 3, COMPLETED: 3, CANCELLED: 0 };

const HEADLINE: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Confirming your payment…',
  NEW: 'We’ve got your order',
  PREPARING: 'We’re making it now',
  READY: 'Ready to collect',
  COMPLETED: 'Collected. Enjoy!',
  CANCELLED: 'This order was cancelled',
};

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [o, setO] = useState<PublicOrder | null>(null);
  const [err, setErr] = useState('');
  const [party, setParty] = useState(false);

  useEffect(() => {
    let stop = false;
    const sid = new URLSearchParams(location.search).get('session_id');
    async function load() {
      try {
        const r = await fetch(`/api/orders/${id}${sid ? `?session_id=${encodeURIComponent(sid)}` : ''}`, { cache: 'no-store' });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        if (!stop) {
          setO(d);
          const k = `mv-party-${d.id}`;
          try {
            if (d.status !== 'PENDING_PAYMENT' && d.status !== 'CANCELLED' && !sessionStorage.getItem(k) && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
              sessionStorage.setItem(k, '1');
              setParty(true);
              setTimeout(() => setParty(false), 4000);
            }
          } catch {}
        }
        return d as PublicOrder;
      } catch (e) {
        if (!stop) setErr((e as Error).message || 'We couldn’t load this order.');
      }
    }
    load();
    const t = setInterval(async () => {
      const d = await load();
      if (d && (d.status === 'COMPLETED' || d.status === 'CANCELLED')) clearInterval(t);
    }, 8000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [id]);

  return (
    <>
      <SiteHeader />
      {party && <Confetti />}
      <main className="wrap">
        {err && !o && <p className="error" style={{ marginTop: 40 }}>{err}</p>}
        {o && (
          <article className="ticket" aria-live="polite">
            <div className="ticket-top">
              <FoodPhoto kind="banhmi" className="ticket-art bob" />
              <p>Order number</p>
              <div className="num">#{o.number}</div>
              <h1 style={{ fontSize: '2.2rem', marginTop: 14 }}>{HEADLINE[o.status]}</h1>
              {o.status !== 'CANCELLED' && (
                <>
                  <div className="steps" aria-hidden>
                    {[1, 2, 3].map((n) => (
                      <div key={n} className={STEP[o.status] >= n ? 'on' : ''} />
                    ))}
                  </div>
                  <div className="steps-labels">
                    <span className={STEP[o.status] >= 1 ? 'on' : ''}>Received</span>
                    <span className={STEP[o.status] >= 2 ? 'on' : ''}>Making</span>
                    <span className={STEP[o.status] >= 3 ? 'on' : ''}>Ready</span>
                  </div>
                </>
              )}
            </div>
            <div className="ticket-body">
              <p>
                Pickup <b>{o.pickupTime}</b> at 91 Glen Osmond Rd, Eastwood. Give the name <b>{o.customerName}</b> at the counter.
              </p>
              <p style={{ marginTop: 8 }}>
                {o.paymentStatus === 'PAID'
                  ? 'Paid online.'
                  : o.status === 'PENDING_PAYMENT'
                    ? 'Waiting for the card payment to go through.'
                    : `Pay ${aud(o.subtotalCents)} at the counter.`}
              </p>
              <ul className="cart-lines" style={{ maxHeight: 'none' }}>
                {o.items.map((l, i) => (
                  <li className="cart-line" key={i}>
                    <div>
                      {l.qty} × {l.name}
                      {l.choices.length > 0 && <div className="opts">{l.choices.map((c) => c.label).join(', ')}</div>}
                      {l.note && <div className="opts">“{l.note}”</div>}
                    </div>
                    <div className="price">{aud(l.unitCents * l.qty)}</div>
                  </li>
                ))}
              </ul>
              <div className="total-row">
                <span>Total <span className="gst">incl. GST</span></span>
                <span>{aud(o.subtotalCents)}</span>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: 'var(--step--1)' }}>
                This page updates by itself. Questions? Call <a href="tel:0426808016">0426 808 016</a>.
              </p>
              <Link href="/menu" className="btn btn-quiet" style={{ marginTop: 16 }}>
                Back to the menu
              </Link>
            </div>
          </article>
        )}
      </main>
    </>
  );
}
