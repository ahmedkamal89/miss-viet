'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CartLine } from '@/lib/types';

type Ctx = {
  lines: CartLine[];
  count: number;
  totalCents: number;
  add: (l: Omit<CartLine, 'key'>) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
  ready: boolean;
};

const CartCtx = createContext<Ctx | null>(null);
const KEY = 'missviet-cart-v1';

function lineKey(l: Omit<CartLine, 'key'>) {
  return [l.itemId, ...l.choices.map((c) => `${c.group}:${c.label}`).sort(), l.note ?? ''].join('|');
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      /* storage unavailable */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines, ready]);

  const add = useCallback((l: Omit<CartLine, 'key'>) => {
    const key = lineKey(l);
    setLines((prev) => {
      const hit = prev.find((p) => p.key === key);
      if (hit) return prev.map((p) => (p.key === key ? { ...p, qty: Math.min(30, p.qty + l.qty) } : p));
      return [...prev, { ...l, key }];
    });
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setLines((prev) => (qty <= 0 ? prev.filter((p) => p.key !== key) : prev.map((p) => (p.key === key ? { ...p, qty: Math.min(30, qty) } : p))));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<Ctx>(
    () => ({
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      totalCents: lines.reduce((s, l) => s + l.qty * l.unitCents, 0),
      add,
      setQty,
      clear,
      drawerOpen,
      setDrawerOpen,
      ready,
    }),
    [lines, add, setQty, clear, drawerOpen, ready],
  );

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error('useCart outside CartProvider');
  return c;
}
