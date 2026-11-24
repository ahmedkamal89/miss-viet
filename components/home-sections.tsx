'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { MenuItem } from '@/lib/types';
import { aud } from '@/lib/money';
import { ItemDialog } from './item-dialog';
import { DishPhoto, FoodPhoto } from '@/components/food';

export function Favourites({ items }: { items: (MenuItem & { section: string })[] }) {
  const [open, setOpen] = useState<MenuItem | null>(null);
  return (
    <>
      <div className="fav-track">
        {items.map((it, k) => (
          <article className="fav-card reveal" key={it.id} style={{ transitionDelay: `${k * 80}ms` }}>
            <button className="fav-media" onClick={() => setOpen(it)} aria-label={`Add ${it.name}`}>
              {it.imageUrl ? <img src={it.imageUrl} alt="" loading="lazy" /> : <DishPhoto name={it.name} section={it.section} className="fav-art" />}
              <span className="fav-plus" aria-hidden>
                +
              </span>
            </button>
            <div className="fav-body">
              <span className="fav-sec">{it.section}</span>
              <h3>{it.name}</h3>
              <div className="fav-row">
                <span className="price">{aud(it.priceCents)}</span>
                <button className="btn btn-sm btn-red" onClick={() => setOpen(it)}>
                  Add to order
                </button>
              </div>
            </div>
          </article>
        ))}
        <Link href="/menu" className="fav-card fav-more reveal">
          <span>See all {''}dishes</span>
          <span className="arrow-circle" aria-hidden>
            ›
          </span>
        </Link>
      </div>
      <ItemDialog item={open} onClose={() => setOpen(null)} />
    </>
  );
}
