'use client';

import { useEffect, useState } from 'react';
import type { Category, MenuItem } from '@/lib/types';
import { aud } from '@/lib/money';
import { ItemDialog } from './item-dialog';
import { CartPanel } from './cart-panel';
import { MobileCartBar } from './site';
import { DishPhoto, FoodPhoto } from '@/components/food';

export function MenuBoard({ categories, items, notice, statusLabel }: { categories: Category[]; items: MenuItem[]; notice: string; statusLabel: string }) {
  const [open, setOpen] = useState<MenuItem | null>(null);
  const [active, setActive] = useState(categories[0]?.id);
  const sections = categories.map((c) => ({ ...c, items: items.filter((i) => i.categoryId === c.id) })).filter((c) => c.items.length);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id.replace('sec-', ''));
      },
      { rootMargin: '-120px 0px -60% 0px' },
    );
    document.querySelectorAll('.menu-section').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="wrap menu-page">
      <nav className="menu-nav" aria-label="Menu sections">
        {sections.map((s) => (
          <a key={s.id} href={`#sec-${s.id}`} className={active === s.id ? 'active' : ''}>
            {s.name}
          </a>
        ))}
      </nav>

      <div>
        <p className="menu-status">{statusLabel}. Collect from 91 Glen Osmond Rd, Eastwood.</p>
        {notice && <p className="notice">{notice}</p>}

        {sections.map((s) => (
          <section key={s.id} id={`sec-${s.id}`} className="menu-section" aria-labelledby={`h-${s.id}`}>
            <h2 id={`h-${s.id}`}>{s.name}</h2>
            {s.blurb && <p>{s.blurb}</p>}
            <ul className="menu-list">
              {s.items.map((it) => (
                <li key={it.id} className="menu-row">
                  {it.imageUrl ? (
                    <img src={it.imageUrl} alt="" loading="lazy" />
                  ) : (
                    <div className="art-thumb">
                      <DishPhoto name={it.name} section={s.name} />
                    </div>
                  )}
                  <div>
                    <div className="name">
                      <span>
                        {it.name} {it.subtitle && <em>{it.subtitle}</em>}
                      </span>
                      <span className="price">{aud(it.priceCents)}</span>
                    </div>
                    {it.description && <p className="desc">{it.description}</p>}
                    {it.popular && <span className="tag">Customer favourite</span>}
                  </div>
                  <button className="add-btn" onClick={() => setOpen(it)} aria-label={`Add ${it.name}`}>
                    +
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <CartPanel />
      <MobileCartBar />
      <ItemDialog item={open} onClose={() => setOpen(null)} />
    </div>
  );
}
