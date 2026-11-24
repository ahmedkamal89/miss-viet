'use client';

/**
 * Cinematic food hero.
 * - Bánh mì is built from separate transparent layers (top bun, salad, pork, bottom bun)
 *   that fly in and assemble, float independently, and press together as you scroll.
 * - Every scene reacts to the mouse with depth-based parallax.
 * - Slides change with a blur/scale "camera cut" timeline.
 * Swap any image in /public/food for a new shot with the same framing and the motion still works.
 */

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

export type HeroSlide = {
  key: 'banhmi' | 'bun' | 'pho' | 'meal';
  tab: string;
  line1: string;
  line2: string;
  body: string;
  price: string | null;
};

export type HeroCategory = { label: string; sub: string; img: string; href: string };

const BG: Record<HeroSlide['key'], string> = {
  banhmi: 'radial-gradient(120% 90% at 55% 40%, #24573f 0%, #143a2b 45%, #0b231a 100%)',
  bun: 'radial-gradient(120% 90% at 55% 40%, #6a2a1c 0%, #401812 50%, #220c08 100%)',
  pho: 'radial-gradient(120% 90% at 55% 40%, #5a3a1f 0%, #34200f 50%, #1a0f07 100%)',
  meal: 'radial-gradient(120% 90% at 55% 40%, #1f5a52 0%, #123a35 50%, #08201c 100%)',
};

const INTERVAL = 8000;

/* sandwich layers, back to front; `tight` = how far each drops when the sandwich closes (% of stage height) */
const LAYERS = [
  { id: 'bottom', src: '/food/banhmi-bottom.webp', tight: 0, depth: 0.35 },
  { id: 'meat', src: '/food/banhmi-meat.webp', tight: 3.3, depth: 0.55 },
  { id: 'salad', src: '/food/banhmi-salad.webp', tight: 8.4, depth: 0.8 },
  { id: 'top', src: '/food/banhmi-top.webp', tight: 17.4, depth: 0.65 },
];

const CRUMBS = Array.from({ length: 26 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  top: (i * 53 + 7) % 100,
  size: 3 + ((i * 7) % 6),
  hue: ['#f6c46b', '#e9a23b', '#c9741f', '#f3dfb0', '#d9442b'][i % 5],
  depth: 0.4 + ((i * 3) % 10) / 10,
}));

function Garnish({ kind, style, depth, flip }: { kind: 'chilli' | 'coriander'; style: React.CSSProperties; depth: number; flip?: boolean }) {
  return (
    <div className="g-sprite px" data-depth={depth} style={style}>
      <div className="g-in">
        <img src={`/food/${kind}.webp`} alt="" className="g-float" draggable={false} style={flip ? { scale: '-1 1' } : undefined} />
      </div>
    </div>
  );
}

function Steam({ big = false }: { big?: boolean }) {
  return (
    <svg className={`steam3${big ? ' big' : ''}`} viewBox="0 0 300 300" aria-hidden>
      <defs>
        <filter id="steamblur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <linearGradient id="steamfade" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity=".0" />
          <stop offset=".3" stopColor="#fff" stopOpacity=".55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g filter="url(#steamblur)" stroke="url(#steamfade)" strokeWidth="18" fill="none" strokeLinecap="round">
        <path className="w1" d="M110 290 C80 240 140 210 110 160 C80 110 140 80 110 20" />
        <path className="w2" d="M160 290 C190 240 130 200 160 150 C190 100 130 70 160 10" />
        <path className="w3" d="M205 290 C180 245 230 215 205 170 C180 125 225 95 200 40" />
      </g>
    </svg>
  );
}

function Swoosh() {
  return (
    <svg className="swoosh" viewBox="0 0 600 500" aria-hidden>
      <defs>
        <linearGradient id="sw" x1="0" x2="1">
          <stop offset="0" stopColor="#ffb347" stopOpacity="0" />
          <stop offset=".5" stopColor="#ffd27a" />
          <stop offset="1" stopColor="#ff7a1a" stopOpacity="0" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#glow)" fill="none" stroke="url(#sw)" strokeLinecap="round">
        <path className="sw1" strokeWidth="3" d="M40 330 C120 470 470 460 560 300" />
        <path className="sw2" strokeWidth="2" d="M70 170 C150 30 470 40 545 190" />
      </g>
    </svg>
  );
}

export function FoodHero({
  slides,
  categories,
  status,
}: {
  slides: HeroSlide[];
  categories: HeroCategory[];
  status: { open: boolean; label: string };
}) {
  const root = useRef<HTMLElement>(null);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [assembling, setAssembling] = useState(false);
  const prev = useRef<number | null>(null);
  const startX = useRef<number | null>(null);
  const n = slides.length;
  const go = useCallback((k: number) => setI(((k % n) + n) % n), [n]);

  useEffect(() => setReduced(matchMedia('(prefers-reduced-motion: reduce)').matches), []);

  /* auto-advance */
  useEffect(() => {
    if (paused || reduced || assembling) return;
    const t = setTimeout(() => go(i + 1), INTERVAL);
    return () => clearTimeout(t);
  }, [i, paused, reduced, assembling, go]);

  /* continuous ambient motion + mouse parallax + scroll assembly (set up once) */
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      // each sandwich layer floats on its own rhythm; the pork turns slowly
      gsap.utils.toArray<HTMLElement>('.lay-idle').forEach((node, k) => {
        gsap.to(node, { yPercent: k % 2 ? 1.6 : -1.6, duration: 2.6 + k * 0.45, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: k * 0.2 });
      });
      gsap.to('.lay-meat .lay-idle', { rotation: 2.4, duration: 3.8, ease: 'sine.inOut', yoyo: true, repeat: -1, transformOrigin: '50% 70%' });
      gsap.to('.lay-salad .lay-idle', { rotation: -1.6, scale: 1.015, duration: 3.1, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      gsap.utils.toArray<HTMLElement>('.g-float').forEach((node, k) => {
        gsap.to(node, { y: gsap.utils.random(-22, 22), x: gsap.utils.random(-14, 14), rotation: gsap.utils.random(-40, 40), duration: gsap.utils.random(2.6, 4.6), ease: 'sine.inOut', yoyo: true, repeat: -1, delay: k * 0.15 });
      });
      gsap.utils.toArray<HTMLElement>('.crumb').forEach((node) => {
        gsap.to(node, { y: gsap.utils.random(-60, -20), x: gsap.utils.random(-20, 20), opacity: gsap.utils.random(0.2, 0.9), duration: gsap.utils.random(3, 6), ease: 'sine.inOut', yoyo: true, repeat: -1, delay: gsap.utils.random(0, 3) });
      });
      gsap.utils.toArray<HTMLElement>('.dish-idle').forEach((node) => {
        gsap.to(node, { y: -12, rotation: 0.8, duration: 3.4, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      });

      // scroll: the sandwich presses together as the hero scrolls away
      const tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: 'top top', end: '70% top', scrub: 0.8 },
      });
      LAYERS.forEach((l) => tl.to(`.lay-${l.id} .lay-scroll`, { yPercent: l.tight, ease: 'none' }, 0));
      tl.to('.stage-banhmi .g-sprite', { scale: 0.6, autoAlpha: 0, ease: 'none' }, 0);
      tl.to('.hero3-stage', { scale: 0.92, ease: 'none' }, 0);
    }, el);

    // mouse parallax: every .px element moves by its data-depth
    const movers = gsap.utils.toArray<HTMLElement>('.px', el).map((node) => ({
      node,
      d: Number(node.dataset.depth || 0.5),
      x: gsap.quickTo(node, 'x', { duration: 0.9, ease: 'power3.out' }),
      y: gsap.quickTo(node, 'y', { duration: 0.9, ease: 'power3.out' }),
    }));
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const r = el.getBoundingClientRect();
      const mx = (e.clientX - r.left) / r.width - 0.5;
      const my = (e.clientY - r.top) / r.height - 0.5;
      movers.forEach((m) => {
        m.x(mx * 46 * m.d);
        m.y(my * 30 * m.d);
      });
    };
    const onLeave = () => movers.forEach((m) => (m.x(0), m.y(0)));
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerleave', onLeave);
    }
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      ctx.revert();
    };
  }, []);

  /* slide change: camera-cut out of the old scene, build the new one */
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const scenes = gsap.utils.toArray<HTMLElement>('.scene');
      const copies = gsap.utils.toArray<HTMLElement>('.copy');
      const bgs = gsap.utils.toArray<HTMLElement>('.hero3-bg');
      const next = scenes[i];
      const was = prev.current;

      if (reduced) {
        scenes.forEach((s, k) => gsap.set(s, { autoAlpha: k === i ? 1 : 0 }));
        copies.forEach((c, k) => gsap.set(c, { autoAlpha: k === i ? 1 : 0 }));
        bgs.forEach((b, k) => gsap.set(b, { opacity: k === i ? 1 : 0 }));
        prev.current = i;
        return;
      }

      const tl = gsap.timeline();
      // background crossfade
      bgs.forEach((b, k) => tl.to(b, { opacity: k === i ? 1 : 0, duration: 1.1, ease: 'power2.inOut' }, 0));

      // outgoing scene + copy
      if (was !== null && was !== i) {
        tl.to(scenes[was], { autoAlpha: 0, scale: 1.18, xPercent: -10, filter: 'blur(14px)', duration: 0.7, ease: 'power3.in' }, 0);
        tl.to(copies[was].querySelectorAll('.cw, .copy-fade'), { yPercent: -60, autoAlpha: 0, duration: 0.45, stagger: 0.02, ease: 'power2.in' }, 0);
        tl.set(copies[was], { autoAlpha: 0 });
      } else {
        scenes.forEach((s, k) => k !== i && gsap.set(s, { autoAlpha: 0 }));
        copies.forEach((c, k) => k !== i && gsap.set(c, { autoAlpha: 0 }));
      }

      // incoming copy
      const at = was === null ? 0.1 : 0.55;
      tl.set(copies[i], { autoAlpha: 1 }, at);
      tl.fromTo(copies[i].querySelectorAll('.cw'), { yPercent: 110, rotate: 4, autoAlpha: 0 }, { yPercent: 0, rotate: 0, autoAlpha: 1, duration: 0.8, stagger: 0.06, ease: 'power4.out' }, at);
      tl.fromTo(copies[i].querySelectorAll('.copy-fade'), { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.1, ease: 'power3.out' }, at + 0.35);
      tl.fromTo(copies[i].querySelectorAll('.swash path'), { strokeDashoffset: 420 }, { strokeDashoffset: 0, duration: 1, ease: 'power2.out' }, at + 0.5);

      // incoming scene
      tl.fromTo(next, { autoAlpha: 0, scale: 0.9, xPercent: 8, filter: 'blur(14px)' }, { autoAlpha: 1, scale: 1, xPercent: 0, filter: 'blur(0px)', duration: 1, ease: 'power3.out' }, at - 0.1);

      const key = slides[i].key;
      if (key === 'banhmi') {
        // bottom bun rises, pork drops in turning, salad gathers, top bun descends last
        tl.fromTo(next.querySelector('.lay-bottom .lay-intro'), { yPercent: 45, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1.1, ease: 'power3.out' }, at);
        tl.fromTo(next.querySelector('.lay-meat .lay-intro'), { yPercent: -70, rotation: -18, autoAlpha: 0 }, { yPercent: 0, rotation: 0, autoAlpha: 1, duration: 1.3, ease: 'back.out(1.4)' }, at + 0.2);
        tl.fromTo(next.querySelector('.lay-salad .lay-intro'), { yPercent: -60, scale: 0.55, rotation: 8, autoAlpha: 0 }, { yPercent: 0, scale: 1, rotation: 0, autoAlpha: 1, duration: 1.3, ease: 'expo.out' }, at + 0.4);
        tl.fromTo(next.querySelector('.lay-top .lay-intro'), { yPercent: -90, rotation: -6, autoAlpha: 0 }, { yPercent: 0, rotation: 0, autoAlpha: 1, duration: 1.6, ease: 'power2.out' }, at + 0.6);
      } else {
        tl.fromTo(next.querySelector('.dish-intro'), { yPercent: 18, scale: 0.8, rotation: -4 }, { yPercent: 0, scale: 1, rotation: 0, duration: 1.2, ease: 'back.out(1.3)' }, at);
      }
      // garnish rains in
      tl.fromTo(next.querySelectorAll('.g-in'), { y: -260, autoAlpha: 0, rotation: -120 }, { y: 0, autoAlpha: 1, rotation: 0, duration: 1.2, stagger: 0.08, ease: 'bounce.out' }, at + 0.5);
      tl.fromTo(next.querySelector('.price-burst'), { scale: 0, rotation: -120 }, { scale: 1, rotation: -10, duration: 0.8, ease: 'back.out(2.2)' }, at + 0.9);

      prev.current = i;
    }, el);
    return () => ctx.kill();
  }, [i, reduced, slides]);

  /* "See it assembled": press the layers together, hold, then open again */
  function assemble() {
    if (reduced || assembling) return;
    setAssembling(true);
    const tl = gsap.timeline({ onComplete: () => setAssembling(false) });
    LAYERS.forEach((l, k) =>
      tl.to(`.lay-${l.id} .lay-btn`, { yPercent: l.tight, duration: 0.9, ease: 'power3.inOut' }, k * 0.08),
    );
    tl.to('.stage-banhmi .g-sprite', { autoAlpha: 0, scale: 0.4, duration: 0.5 }, 0);
    tl.to('.stage-banhmi .squish', { scaleY: 0.96, duration: 0.18, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 0.85);
    tl.to({}, { duration: 1.6 });
    LAYERS.forEach((l, k) => tl.to(`.lay-${l.id} .lay-btn`, { yPercent: 0, duration: 1, ease: 'elastic.out(1, 0.6)' }, `>-${k ? 0.9 : 0}`));
    tl.to('.stage-banhmi .g-sprite', { autoAlpha: 1, scale: 1, duration: 0.6 }, '<');
  }

  const s = slides[i];

  return (
    <section
      ref={root}
      className="hero3"
      aria-roledescription="carousel"
      aria-label="Our dishes"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(i + 1);
        if (e.key === 'ArrowLeft') go(i - 1);
      }}
      onPointerDown={(e) => (startX.current = e.clientX)}
      onPointerUp={(e) => {
        if (startX.current === null) return;
        const dx = e.clientX - startX.current;
        if (Math.abs(dx) > 60) go(i + (dx < 0 ? 1 : -1));
        startX.current = null;
      }}
    >
      {slides.map((sl, k) => (
        <div key={sl.key} className="hero3-bg" style={{ background: BG[sl.key], opacity: k === 0 ? 1 : 0 }} aria-hidden />
      ))}
      <div className="hero3-vignette" aria-hidden />
      {/* blurred foreground herbs at the edges, like a shallow depth of field */}
      <img className="fg-leaf fg1 px" data-depth="1.6" src="/food/coriander.webp" alt="" aria-hidden />
      <img className="fg-leaf fg2 px" data-depth="1.9" src="/food/coriander.webp" alt="" aria-hidden />
      <img className="fg-leaf fg3 px" data-depth="1.4" src="/food/chilli.webp" alt="" aria-hidden />

      <div className="crumbs" aria-hidden>
        {CRUMBS.map((c, k) => (
          <span key={k} className="px" data-depth={c.depth} style={{ left: `${c.left}%`, top: `${c.top}%` }}>
            <i className="crumb" style={{ width: c.size, height: c.size * 0.7, background: c.hue }} />
          </span>
        ))}
      </div>

      <div className="wrap hero3-grid">
        {/* copy */}
        <div className="hero3-copy">
          {slides.map((sl, k) => (
            <div key={sl.key} className="copy" aria-hidden={k !== i} style={k === 0 ? undefined : { visibility: 'hidden' }}>
              <h1 className="hero3-title">
                <span className="l1">
                  {sl.line1.split(' ').map((w, wi) => (
                    <span key={wi}>
                      <span className="cwrap">
                        <span className="cw">{w}</span>
                      </span>{' '}
                    </span>
                  ))}
                </span>
                <span className="l2">
                  {sl.line2.split(' ').map((w, wi) => (
                    <span key={wi}>
                      <span className="cwrap">
                        <span className="cw">{w}</span>
                      </span>{' '}
                    </span>
                  ))}
                  <svg className="swash" viewBox="0 0 400 30" preserveAspectRatio="none" aria-hidden>
                    <path d="M6 22 C110 4 260 2 394 14" strokeDasharray="420" />
                  </svg>
                </span>
              </h1>
              <p className="hero3-body copy-fade">{sl.body}</p>
              <div className="hero3-actions copy-fade">
                <Link href="/menu" className="btn hero3-cta" tabIndex={k === i ? 0 : -1}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M6 7h12l-1 13H7z" />
                    <path d="M9 7a3 3 0 0 1 6 0" />
                  </svg>
                  Order now{sl.price ? ` from ${sl.price}` : ''}
                </Link>
                {sl.key === 'banhmi' ? (
                  <button className="btn hero3-ghost" onClick={assemble} disabled={assembling} tabIndex={k === i ? 0 : -1}>
                    <span className="play" aria-hidden>
                      ▶
                    </span>
                    See it assembled
                  </button>
                ) : (
                  <Link href="/menu" className="btn hero3-ghost" tabIndex={k === i ? 0 : -1}>
                    See the menu
                  </Link>
                )}
              </div>
            </div>
          ))}
          <p className={`hero3-status${status.open ? ' open' : ''}`}>
            <i aria-hidden /> {status.label}
          </p>
        </div>

        {/* stage */}
        <div className="hero3-stage" aria-hidden>
          <div className="glow px" data-depth="0.25" />
          {slides.map((sl) => (
            <div key={sl.key} className={`scene stage-${sl.key}`}>
              {sl.key === 'banhmi' ? (
                <>
                  <Swoosh />
                  <Steam />
                  <div className="sandwich squish">
                    {LAYERS.map((l) => (
                      <div key={l.id} className={`lay lay-${l.id}`}>
                        <div className="lay-px px" data-depth={l.depth}>
                          <div className="lay-scroll">
                            <div className="lay-btn">
                              <div className="lay-intro">
                                <img className="lay-idle" src={l.src} alt="" draggable={false} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="shadow" />
                  <Garnish kind="chilli" depth={1.1} style={{ left: '4%', top: '34%', width: '9%' }} />
                  <Garnish kind="coriander" depth={1.3} style={{ left: '0%', top: '52%', width: '15%' }} />
                  <Garnish kind="chilli" depth={0.9} style={{ right: '3%', top: '58%', width: '7%' }} />
                  <Garnish kind="coriander" depth={1.2} style={{ right: '-2%', top: '24%', width: '13%' }} flip />
                </>
              ) : (
                <>
                  {sl.key === 'pho' && <Steam big />}
                  {sl.key === 'bun' && <Steam />}
                  <div className="dish px" data-depth="0.5">
                    <div className="dish-intro">
                      <img className={`dish-idle dish-${sl.key}`} src={`/food/${sl.key}.webp`} alt="" draggable={false} />
                    </div>
                  </div>
                  <div className="shadow" />
                  <Garnish kind="coriander" depth={1.2} style={{ left: '6%', top: '18%', width: '14%' }} />
                  <Garnish kind="chilli" depth={1} style={{ right: '10%', top: '14%', width: '8%' }} />
                  <Garnish kind="chilli" depth={1.4} style={{ left: '14%', bottom: '14%', width: '6%' }} />
                  <Garnish kind="coriander" depth={0.9} style={{ right: '2%', bottom: '22%', width: '12%' }} flip />
                </>
              )}
              {sl.price && (
                <div className="price-burst px" data-depth="0.9">
                  <small>from</small>
                  {sl.price}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* pickup card */}
        <PickupCard status={status} />
      </div>

      <div className="wrap hero3-nav">
        <div className="hero3-dots" role="tablist" aria-label="Choose a dish">
          {slides.map((sl, k) => (
            <button key={sl.key} role="tab" aria-selected={k === i} className={k === i ? 'on' : ''} onClick={() => go(k)} aria-label={sl.tab}>
              <span className="bar">
                <span key={`${i}-${paused}-${assembling}`} className="fill" style={{ animationDuration: `${INTERVAL}ms`, animationPlayState: paused || reduced || assembling ? 'paused' : 'running' }} />
              </span>
              <span className="lbl">{sl.tab}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="hero3-wave" aria-hidden>
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path d="M0 70 C240 20 420 110 720 70 C1000 32 1200 100 1440 60 L1440 120 L0 120Z" fill="#f4f1e8" />
        </svg>
      </div>
      <div className="cat-strip-wrap">
        <div className="wrap cat-strip">
          {categories.map((c, k) => (
            <Link key={c.label} href={c.href} className={`cat-card${k === 0 ? ' first' : ''}`}>
              <span className="cat-img">
                <img src={c.img} alt="" loading="lazy" />
              </span>
              <span className="cat-body">
                <b>{c.label}</b>
                <small>{c.sub}</small>
                <span className="cat-go" aria-hidden>
                  ›
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function PickupCard({ status }: { status: { open: boolean; label: string } }) {
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slot, setSlot] = useState('');
  useEffect(() => {
    fetch('/api/store')
      .then((r) => r.json())
      .then((d) => {
        setSlots(d.slots ?? []);
        let saved = '';
        try {
          saved = localStorage.getItem('missviet-pickup') || '';
        } catch {}
        setSlot(d.slots?.includes(saved) ? saved : d.slots?.[0] ?? '');
      })
      .catch(() => setSlots([]));
  }, []);
  const choose = (v: string) => {
    setSlot(v);
    try {
      localStorage.setItem('missviet-pickup', v);
    } catch {}
  };
  return (
    <aside className="pickup-card px" data-depth="0.15" aria-label="Order for pickup">
      <h2>Order for pickup</h2>
      <p>Pick your dishes, choose a pickup time, and pay online or at the counter.</p>
      <div className="pc-field">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
        <span>91 Glen Osmond Rd, Eastwood</span>
      </div>
      <label className="pc-field">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <span className="sr-only">Pickup time</span>
        {slots && slots.length > 0 ? (
          <select value={slot} onChange={(e) => choose(e.target.value)}>
            {slots.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        ) : (
          <span>{slots === null ? 'Checking times…' : status.label}</span>
        )}
      </label>
      <Link href="/menu" className="btn pc-go">
        Start order
      </Link>
      <ul className="pc-perks">
        <li>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <circle cx="6" cy="17" r="3" />
            <circle cx="18" cy="17" r="3" />
            <path d="M6 17h4l3-7h4l1 7M10 10h3" />
          </svg>
          Quick pickup
        </li>
        <li>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <rect x="3" y="6" width="18" height="13" rx="2" />
            <path d="M3 10h18M7 15h4" />
          </svg>
          Secure payment
        </li>
        <li>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M5 19C5 10 11 5 20 4c0 9-5 15-14 15z" />
            <path d="M5 19 13 11" />
          </svg>
          Made fresh daily
        </li>
      </ul>
    </aside>
  );
}
