'use client';

import { useEffect, useRef, useState } from 'react';
import { aud } from '@/lib/money';
import { DishPhoto, FoodPhoto } from '@/components/food';

/** Tweens from the previous value to the new one. */
export function Ticker({ value, money = false, decimals = 0 }: { value: number; money?: boolean; decimals?: number }) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = from.current;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 900);
      const cur = start + (value - start) * (1 - Math.pow(1 - p, 3));
      setV(cur);
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value]);
  return <>{money ? aud(Math.round(v)) : v.toFixed(decimals)}</>;
}

export function Spark({ values, color = 'var(--herb)' }: { values: number[]; color?: string }) {
  const max = Math.max(1, ...values);
  const w = 120;
  const h = 36;
  const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * w, h - (v / max) * (h - 4) - 2]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="spark" aria-hidden>
      <path d={`${line} L${w} ${h} L0 ${h}Z`} fill={color} opacity=".12" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="spark-line" />
      {pts.length > 0 && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.5" fill={color} />}
    </svg>
  );
}

export function Kpi({ label, value, money, delta, spark, tone, icon }: { label: string; value: number; money?: boolean; delta?: string; spark?: number[]; tone: string; icon: React.ReactNode }) {
  return (
    <div className="kpi" style={{ ['--tone' as string]: tone }}>
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">
        <Ticker value={value} money={money} />
      </div>
      <div className="kpi-foot">
        {delta && <span className="kpi-delta">{delta}</span>}
        {spark && <Spark values={spark} color={tone} />}
      </div>
    </div>
  );
}

export function HourChart({ hours, open = 9, close = 16 }: { hours: { hour: number; count: number; cents: number }[]; open?: number; close?: number }) {
  const lo = Math.min(open, ...hours.map((h) => h.hour));
  const hi = Math.max(close, ...hours.map((h) => h.hour + 1));
  const slots = Array.from({ length: hi - lo }, (_, i) => {
    const h = lo + i;
    const hit = hours.find((x) => x.hour === h);
    return { h, count: hit?.count ?? 0, cents: hit?.cents ?? 0 };
  });
  const max = Math.max(1, ...slots.map((s) => s.count));
  const label = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'a' : 'p'}`;
  return (
    <div className="hour-chart" role="img" aria-label="Orders by hour today">
      {slots.map((s, i) => (
        <div className="hc-col" key={s.h} title={`${label(s.h)}: ${s.count} orders, ${aud(s.cents)}`}>
          <span className="hc-num">{s.count || ''}</span>
          <div className="hc-bar" style={{ height: `${(s.count / max) * 100}%`, animationDelay: `${i * 50}ms` }} />
          <span className="hc-lbl">{label(s.h)}</span>
        </div>
      ))}
    </div>
  );
}

export function TopDishes({ top }: { top: { name: string; qty: number; cents: number }[] }) {
  const max = Math.max(1, ...top.map((t) => t.qty));
  if (!top.length) return <p className="muted">No sales yet this week. They’ll show up here.</p>;
  return (
    <ol className="top-dishes">
      {top.map((t, i) => (
        <li key={t.name}>
          <span className="td-art">
            <DishPhoto name={t.name} />
          </span>
          <div className="td-body">
            <div className="td-row">
              <b>{t.name}</b>
              <span>{t.qty} sold</span>
            </div>
            <div className="td-bar">
              <i style={{ width: `${(t.qty / max) * 100}%`, animationDelay: `${i * 90}ms` }} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
