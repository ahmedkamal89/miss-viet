'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useCart } from './cart';
import { CartPanel } from './cart-panel';
import { aud } from '@/lib/money';

export function SiteHeader() {
  const { count, setDrawerOpen, ready } = useCart();
  const [bump, setBump] = useState(false);
  useEffect(() => {
    const on = () => {
      setBump(false);
      requestAnimationFrame(() => setBump(true));
    };
    window.addEventListener('cart:bump', on);
    return () => window.removeEventListener('cart:bump', on);
  }, []);
  return (
    <>
      <header className="site-head">
        <div className="wrap">
          <Link href="/" className="wordmark">
            Miss Viet&rsquo;s
            <small>Lunch Bar, Eastwood</small>
          </Link>
          <nav className="site-nav" aria-label="Main">
            <Link href="/menu">Menu</Link>
            <Link href="/#visit" className="hide-sm">
              Find us
            </Link>
          </nav>
          <button className={`btn cart-btn${bump ? ' bump' : ''}`} onAnimationEnd={() => setBump(false)} onClick={() => setDrawerOpen(true)} aria-label={`Open cart, ${count} items`}>
            Cart <span className="count">{ready ? count : 0}</span>
          </button>
        </div>
      </header>
      <CartDrawer />
    </>
  );
}

function CartDrawer() {
  const { drawerOpen, setDrawerOpen } = useCart();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (drawerOpen && !d.open) d.showModal();
    if (!drawerOpen && d.open) d.close();
  }, [drawerOpen]);
  return (
    <dialog
      ref={ref}
      className="drawer"
      onClose={() => setDrawerOpen(false)}
      onClick={(e) => e.target === ref.current && setDrawerOpen(false)}
      aria-label="Your order"
    >
      <button className="dlg-close" onClick={() => setDrawerOpen(false)} aria-label="Close cart">
        ✕
      </button>
      <CartPanel onNavigate={() => setDrawerOpen(false)} />
    </dialog>
  );
}

export function MobileCartBar() {
  const { count, totalCents, setDrawerOpen, ready } = useCart();
  if (!ready || count === 0) return null;
  return (
    <div className="cart-bar">
      <button className="btn btn-red" onClick={() => setDrawerOpen(true)}>
        <span>View order ({count})</span>
        <span>{aud(totalCents)}</span>
      </button>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-foot2">
      <div className="wrap foot-grid">
        <div>
          <Link href="/" className="wordmark">
            Miss Viet&rsquo;s
          </Link>
          <p style={{ marginTop: 10, maxWidth: '34ch' }}>Vietnamese lunch bar on Glen Osmond Road. Bánh mì, bún, phở and cold rolls, made fresh every day.</p>
        </div>
        <div>
          <h3>Visit</h3>
          <ul>
            <li>91 Glen Osmond Rd</li>
            <li>Eastwood SA 5063</li>
            <li>
              <a href="tel:0426808016">0426 808 016</a>
            </li>
          </ul>
        </div>
        <div>
          <h3>Explore</h3>
          <ul>
            <li>
              <Link href="/menu">Order online</Link>
            </li>
            <li>
              <Link href="/#visit">Opening hours</Link>
            </li>
            <li>
              <a href="https://www.facebook.com/profile.php?id=100089241500616">Facebook</a>
            </li>
          </ul>
        </div>
      </div>
      <div className="wrap foot-base">
        <span>© {new Date().getFullYear()} Miss Viet&rsquo;s Lunch Bar</span>
        <Link href="/admin">Staff login</Link>
      </div>
    </footer>
  );
}
