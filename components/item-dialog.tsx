'use client';

import { useEffect, useRef, useState } from 'react';
import type { MenuItem, PickedChoice } from '@/lib/types';
import { aud } from '@/lib/money';
import { useCart } from './cart';
import { flyToCart } from './fly';
import { DishPhoto, FoodPhoto } from '@/components/food';

export function ItemDialog({ item, onClose }: { item: MenuItem | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { add } = useCart();
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const addRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (item) {
      const init: Record<string, string[]> = {};
      for (const g of item.options) if (g.required && !g.multi && g.choices[0]) init[g.name] = [g.choices[0].label];
      setPicked(init);
      setQty(1);
      setNote('');
      setErr('');
      if (!d.open) d.showModal();
    } else if (d.open) d.close();
  }, [item]);

  if (!item) return <dialog ref={ref} />;

  const choices: PickedChoice[] = item.options.flatMap((g) =>
    (picked[g.name] ?? []).map((label) => ({
      group: g.name,
      label,
      priceCents: g.choices.find((c) => c.label === label)?.priceCents ?? 0,
    })),
  );
  const unit = item.priceCents + choices.reduce((s, c) => s + c.priceCents, 0);

  function toggle(group: string, label: string, multi: boolean) {
    setPicked((p) => {
      const cur = p[group] ?? [];
      if (!multi) return { ...p, [group]: [label] };
      return { ...p, [group]: cur.includes(label) ? cur.filter((x) => x !== label) : [...cur, label] };
    });
  }

  function submit() {
    for (const g of item!.options)
      if (g.required && !(picked[g.name]?.length)) return setErr(`Choose a ${g.name.toLowerCase()}.`);
    add({ itemId: item!.id, name: item!.name, imageUrl: item!.imageUrl, qty, unitCents: unit, choices, note: note.trim() || undefined });
    const from = addRef.current?.getBoundingClientRect();
    onClose();
    if (from) {
      const ghost = document.createElement('div');
      Object.assign(ghost.style, { position: 'fixed', left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
      document.body.appendChild(ghost);
      flyToCart(ghost, item!.imageUrl);
      ghost.remove();
    }
  }

  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-labelledby="dlg-title">
      <button className="dlg-close" onClick={onClose} aria-label="Close">
        ✕
      </button>
      {item.imageUrl ? (
        <img className="dlg-img" src={item.imageUrl} alt="" />
      ) : (
        <div className="dlg-art">
          <DishPhoto name={item.name} />
        </div>
      )}
      <div className="dlg-body">
        <h2 id="dlg-title">{item.name}</h2>
        {item.subtitle && <p style={{ color: 'var(--muted)', marginTop: 6 }}>{item.subtitle}</p>}
        {item.description && <p style={{ marginTop: 10 }}>{item.description}</p>}
        <p className="price" style={{ marginTop: 10 }}>{aud(item.priceCents)}</p>

        {item.options.map((g) => (
          <fieldset className="opt-group" key={g.name}>
            <legend>
              {g.name} <small>{g.required ? 'Required' : g.multi ? 'Optional, choose any' : 'Optional'}</small>
            </legend>
            {g.choices.map((c) => (
              <label className="opt" key={c.label}>
                <input
                  type={g.multi ? 'checkbox' : 'radio'}
                  name={g.name}
                  checked={(picked[g.name] ?? []).includes(c.label)}
                  onChange={() => toggle(g.name, c.label, g.multi)}
                />
                <span>{c.label}</span>
                <span>{c.priceCents ? `+${aud(c.priceCents)}` : ''}</span>
              </label>
            ))}
          </fieldset>
        ))}

        <div className="field" style={{ marginTop: 22 }}>
          <label htmlFor="item-note">
            Anything we should know? <span className="hint">Optional</span>
          </label>
          <input id="item-note" className="input" maxLength={140} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. extra pickles" />
        </div>
        {err && <p className="error">{err}</p>}
      </div>
      <div className="dlg-foot">
        <div className="qty" style={{ marginTop: 0 }}>
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="One fewer">
            −
          </button>
          <span>{qty}</span>
          <button onClick={() => setQty((q) => Math.min(30, q + 1))} aria-label="One more">
            +
          </button>
        </div>
        <button ref={addRef} className="btn btn-red" style={{ flex: 1, justifyContent: 'space-between' }} onClick={submit}>
          <span>Add to order</span>
          <span>{aud(unit * qty)}</span>
        </button>
      </div>
    </dialog>
  );
}
