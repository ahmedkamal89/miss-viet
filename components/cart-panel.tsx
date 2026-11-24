'use client';

import Link from 'next/link';
import { useCart } from './cart';
import { aud } from '@/lib/money';
import { DishPhoto, FoodPhoto } from '@/components/food';

export function CartPanel({ onNavigate, checkout = false }: { onNavigate?: () => void; checkout?: boolean }) {
  const { lines, setQty, totalCents, ready } = useCart();
  return (
    <section className="cart-panel" aria-label="Your order">
      <h2>Your order</h2>
      {!ready ? null : lines.length === 0 ? (
        <>
          <FoodPhoto kind="banhmi" className="cart-empty-art bob" />
          <p className="cart-empty">Nothing here yet. Tap + next to a dish to add it.</p>
        </>
      ) : (
        <>
          <ul className="cart-lines">
            {lines.map((l) => (
              <li key={l.key} className="cart-line">
                <div>
                  <div>{l.name}</div>
                  {l.choices.length > 0 && <div className="opts">{l.choices.map((c) => c.label).join(', ')}</div>}
                  {l.note && <div className="opts">“{l.note}”</div>}
                  <div className="qty">
                    <button onClick={() => setQty(l.key, l.qty - 1)} aria-label={`Remove one ${l.name}`}>
                      −
                    </button>
                    <span aria-live="polite">{l.qty}</span>
                    <button onClick={() => setQty(l.key, l.qty + 1)} aria-label={`Add one more ${l.name}`}>
                      +
                    </button>
                  </div>
                </div>
                <div className="price">{aud(l.unitCents * l.qty)}</div>
              </li>
            ))}
          </ul>
          <div className="total-row">
            <span>
              Total <span className="gst">incl. GST</span>
            </span>
            <span>{aud(totalCents)}</span>
          </div>
          {!checkout && (
            <Link href="/checkout" className="btn btn-red btn-block" onClick={onNavigate}>
              Go to checkout
            </Link>
          )}
        </>
      )}
      {!checkout && ready && lines.length === 0 && (
        <Link href="/menu" className="btn btn-quiet btn-block" onClick={onNavigate} style={{ marginTop: 12 }}>
          Browse the menu
        </Link>
      )}
    </section>
  );
}
