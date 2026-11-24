'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AdminShell, Switch } from '@/components/admin-shell';
import { aud } from '@/lib/money';
import { DishPhoto, FoodPhoto } from '@/components/food';
import type { Category, MenuItem, OptionGroup } from '@/lib/types';

type Draft = Omit<MenuItem, 'id' | 'priceCents' | 'sortOrder'> & { id?: string; price: string; sortOrder: number };

const blank = (categoryId: string): Draft => ({
  categoryId,
  name: '',
  subtitle: '',
  description: '',
  price: '',
  imageUrl: '',
  available: true,
  popular: false,
  sortOrder: 999,
  options: [],
});

export default function MenuAdmin() {
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [toast, setToast] = useState('');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/menu', { cache: 'no-store' });
    if (r.status === 401) return (window.location.href = '/admin/login');
    const d = await r.json();
    setCats(d.categories);
    setItems(d.items);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const say = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 2500);
  };

  async function patch(id: string, data: Partial<MenuItem>) {
    setItems((l) => l.map((i) => (i.id === id ? { ...i, ...data } : i)));
    const r = await fetch(`/api/admin/menu/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!r.ok) say((await r.json()).error || 'Didn’t save.');
  }

  async function remove(it: MenuItem) {
    if (!confirm(`Delete “${it.name}” from the menu? To hide it for today, switch it off instead.`)) return;
    await fetch(`/api/admin/menu/${it.id}`, { method: 'DELETE' });
    say(`Deleted ${it.name}`);
    load();
  }

  async function addCategory() {
    const name = prompt('Name of the new section (e.g. Drinks)');
    if (!name) return;
    const r = await fetch('/api/admin/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    if (!r.ok) return say((await r.json()).error);
    say(`Added ${name}`);
    load();
  }

  async function renameCategory(c: Category) {
    const name = prompt('Section name', c.name);
    if (name === null) return;
    const blurb = prompt('Short description shown under the heading (optional)', c.blurb ?? '');
    await fetch(`/api/admin/categories/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, blurb: blurb ?? c.blurb }) });
    load();
  }

  async function deleteCategory(c: Category) {
    if (!confirm(`Delete the section “${c.name}”?`)) return;
    const r = await fetch(`/api/admin/categories/${c.id}`, { method: 'DELETE' });
    if (!r.ok) return say((await r.json()).error);
    load();
  }

  async function moveCategory(c: Category, dir: -1 | 1) {
    const i = cats.findIndex((x) => x.id === c.id);
    const j = i + dir;
    if (j < 0 || j >= cats.length) return;
    const a = cats[i], b = cats[j];
    await Promise.all([
      fetch(`/api/admin/categories/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sortOrder: j }) }),
      fetch(`/api/admin/categories/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sortOrder: i }) }),
    ]);
    load();
  }

  return (
    <AdminShell
      title="Menu"
      right={
        <>
          <button className="btn btn-sm btn-quiet" onClick={addCategory}>Add section</button>
          <button className="btn btn-sm btn-red" onClick={() => cats[0] && setDraft(blank(cats[0].id))}>Add dish</button>
        </>
      }
    >
      <div className="kpis kpis-sm">
        <div className="mini-stat"><b>{items.length}</b><span>Dishes</span></div>
        <div className="mini-stat"><b>{items.filter((i) => i.available).length}</b><span>On sale now</span></div>
        <div className="mini-stat"><b>{items.filter((i) => !i.available).length}</b><span>Sold out / hidden</span></div>
        <div className="mini-stat"><b>{cats.length}</b><span>Sections</span></div>
      </div>
      <div className="menu-tools">
        <input className="input search" placeholder="Search dishes…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search dishes" />
      </div>
      <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
        Switch a dish off to mark it sold out; it disappears from the website until you switch it back on. Changes show on the website straight away.
      </p>

      {cats.map((c, ci) => {
        const list = items.filter((i) => i.categoryId === c.id && (!q || i.name.toLowerCase().includes(q.toLowerCase())));
        if (q && !list.length) return null;
        return (
          <section className="cat-block panel" key={c.id}>
            <h2>
              {c.name}
              <button className="btn btn-sm btn-quiet" onClick={() => renameCategory(c)}>Edit</button>
              <button className="btn btn-sm btn-quiet" onClick={() => moveCategory(c, -1)} disabled={ci === 0} aria-label="Move section up">↑</button>
              <button className="btn btn-sm btn-quiet" onClick={() => moveCategory(c, 1)} disabled={ci === cats.length - 1} aria-label="Move section down">↓</button>
              {list.length === 0 && <button className="btn btn-sm btn-quiet" onClick={() => deleteCategory(c)}>Delete section</button>}
              <button className="btn btn-sm btn-quiet" style={{ marginLeft: 'auto' }} onClick={() => setDraft(blank(c.id))}>Add dish here</button>
            </h2>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 64 }}>Photo</th>
                  <th>Dish</th>
                  <th style={{ width: 120 }}>Price</th>
                  <th style={{ width: 90 }}>On sale</th>
                  <th style={{ width: 90 }}>Favourite</th>
                  <th style={{ width: 170 }} />
                </tr>
              </thead>
              <tbody>
                {list.map((it) => (
                  <tr key={it.id} style={{ opacity: it.available ? 1 : 0.55 }}>
                    <td>{it.imageUrl ? <img src={it.imageUrl} alt="" /> : <div className="thumb-art"><DishPhoto name={it.name} section={c.name} /></div>}</td>
                    <td>
                      <b>{it.name}</b> {it.subtitle && <small style={{ color: 'var(--muted)' }}>{it.subtitle}</small>}
                      {it.options.length > 0 && <div style={{ color: 'var(--muted)', fontSize: 13 }}>Options: {it.options.map((g) => g.name).join(', ')}</div>}
                    </td>
                    <td><PriceCell cents={it.priceCents} onSave={(priceCents) => patch(it.id, { priceCents })} /></td>
                    <td><Switch checked={it.available} onChange={(v) => patch(it.id, { available: v })} label={`${it.name} on sale`} /></td>
                    <td><Switch checked={it.popular} onChange={(v) => patch(it.id, { popular: v })} label={`${it.name} is a favourite`} /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-sm btn-quiet" onClick={() => setDraft({ ...it, price: (it.priceCents / 100).toFixed(2) })}>Edit</button>{' '}
                      <button className="btn btn-sm btn-quiet" onClick={() => remove(it)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr><td colSpan={6} style={{ color: 'var(--muted)' }}>No dishes in this section yet.</td></tr>
                )}
              </tbody>
            </table>
          </section>
        );
      })}

      <ItemEditor
        draft={draft}
        cats={cats}
        onClose={() => setDraft(null)}
        onSaved={(m) => {
          setDraft(null);
          say(m);
          load();
        }}
      />
      {toast && <div className="toast" role="status">{toast}</div>}
    </AdminShell>
  );
}

function PriceCell({ cents, onSave }: { cents: number; onSave: (c: number) => void }) {
  const [v, setV] = useState((cents / 100).toFixed(2));
  useEffect(() => setV((cents / 100).toFixed(2)), [cents]);
  const commit = () => {
    const n = Math.round(parseFloat(v) * 100);
    if (Number.isFinite(n) && n >= 0 && n !== cents) onSave(n);
    else setV((cents / 100).toFixed(2));
  };
  return (
    <input
      className="input"
      style={{ padding: '6px 8px', width: 90 }}
      inputMode="decimal"
      value={v}
      aria-label="Price in dollars"
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}

function ItemEditor({ draft, cats, onClose, onSaved }: { draft: Draft | null; cats: Category[]; onClose: () => void; onSaved: (msg: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [d, setD] = useState<Draft | null>(draft);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setD(draft ? structuredClone(draft) : null);
    setErr('');
    const dlg = ref.current;
    if (!dlg) return;
    if (draft && !dlg.open) dlg.showModal();
    if (!draft && dlg.open) dlg.close();
  }, [draft]);

  if (!d) return <dialog ref={ref} />;
  const up = (patch: Partial<Draft>) => setD({ ...d, ...patch });
  const setGroup = (i: number, g: Partial<OptionGroup>) => up({ options: d.options.map((x, j) => (j === i ? { ...x, ...g } : x)) });

  async function upload(f: File) {
    const fd = new FormData();
    fd.append('file', f);
    setBusy(true);
    const r = await fetch('/api/admin/upload', { method: 'POST', body: fd });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setErr(j.error);
    up({ imageUrl: j.url });
  }

  async function save() {
    const priceCents = Math.round(parseFloat(d!.price) * 100);
    if (!d!.name.trim()) return setErr('Give the dish a name.');
    if (!Number.isFinite(priceCents) || priceCents < 0) return setErr('Enter a price, like 12.50.');
    setBusy(true);
    const payload = { ...d, priceCents, price: undefined };
    const r = await fetch(d!.id ? `/api/admin/menu/${d!.id}` : '/api/admin/menu', {
      method: d!.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!r.ok) return setErr((await r.json()).error || 'Didn’t save.');
    onSaved(d!.id ? `Saved ${d!.name}` : `Added ${d!.name}`);
  }

  return (
    <dialog ref={ref} onClose={onClose} style={{ width: 'min(640px, calc(100vw - 24px))' }}>
      <button className="dlg-close" onClick={onClose} aria-label="Close">✕</button>
      <div className="dlg-body">
        <h2 style={{ fontFamily: 'var(--body)', fontSize: '1.4rem', fontWeight: 700, marginBottom: 18 }}>{d.id ? `Edit ${d.name}` : 'Add a dish'}</h2>
        <div className="field">
          <label htmlFor="e-name">Name</label>
          <input id="e-name" className="input" value={d.name} onChange={(e) => up({ name: e.target.value })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 12 }}>
          <div className="field">
            <label htmlFor="e-sub">Small print <span className="hint">e.g. Nem nướng, 3 pieces</span></label>
            <input id="e-sub" className="input" value={d.subtitle ?? ''} onChange={(e) => up({ subtitle: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="e-price">Price ($)</label>
            <input id="e-price" className="input" inputMode="decimal" value={d.price} onChange={(e) => up({ price: e.target.value })} placeholder="12.50" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="e-desc">Description <span className="hint">Optional</span></label>
          <textarea id="e-desc" className="input" value={d.description ?? ''} onChange={(e) => up({ description: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="e-cat">Section</label>
          <select id="e-cat" className="input" value={d.categoryId} onChange={(e) => up({ categoryId: e.target.value })}>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Photo</label>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {d.imageUrl ? <img src={d.imageUrl} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6 }} /> : <div className="thumb-ph" style={{ width: 72, height: 72 }} />}
            <div style={{ display: 'grid', gap: 8, flex: 1 }}>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              <input className="input" placeholder="…or paste an image link" value={d.imageUrl ?? ''} onChange={(e) => up({ imageUrl: e.target.value })} />
            </div>
          </div>
        </div>

        <h3 style={{ fontFamily: 'var(--body)', fontSize: '1rem', fontWeight: 700, margin: '20px 0 10px' }}>Choices for customers</h3>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 10 }}>For things like “Side: spring roll or dim sim” or “Extras: extra meat +$3”.</p>
        {d.options.map((g, i) => (
          <div className="og-edit" key={i}>
            <div className="row">
              <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder="Group name, e.g. Side" value={g.name} onChange={(e) => setGroup(i, { name: e.target.value })} />
              <label><input type="checkbox" checked={g.required} onChange={(e) => setGroup(i, { required: e.target.checked })} /> Required</label>
              <label><input type="checkbox" checked={g.multi} onChange={(e) => setGroup(i, { multi: e.target.checked })} /> Can pick several</label>
              <button className="btn btn-sm btn-quiet" onClick={() => up({ options: d.options.filter((_, j) => j !== i) })}>Remove</button>
            </div>
            {g.choices.map((c, k) => (
              <div className="row" key={k}>
                <input className="input" style={{ flex: 1 }} placeholder="Choice" value={c.label} onChange={(e) => setGroup(i, { choices: g.choices.map((x, m) => (m === k ? { ...x, label: e.target.value } : x)) })} />
                <span>+$</span>
                <input
                  className="input"
                  style={{ width: 80 }}
                  inputMode="decimal"
                  defaultValue={(c.priceCents / 100).toFixed(2)}
                  onBlur={(e) => setGroup(i, { choices: g.choices.map((x, m) => (m === k ? { ...x, priceCents: Math.max(0, Math.round((parseFloat(e.target.value) || 0) * 100)) } : x)) })}
                />
                <button className="btn btn-sm btn-quiet" aria-label="Remove choice" onClick={() => setGroup(i, { choices: g.choices.filter((_, m) => m !== k) })}>✕</button>
              </div>
            ))}
            <button className="btn btn-sm btn-quiet" onClick={() => setGroup(i, { choices: [...g.choices, { label: '', priceCents: 0 }] })}>Add choice</button>
          </div>
        ))}
        <button className="btn btn-sm btn-quiet" onClick={() => up({ options: [...d.options, { name: '', required: false, multi: false, choices: [{ label: '', priceCents: 0 }] }] })}>
          Add a choice group
        </button>

        <div style={{ display: 'flex', gap: 24, marginTop: 20 }}>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Switch checked={d.available} onChange={(v) => up({ available: v })} label="On sale" /> On sale</label>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Switch checked={d.popular} onChange={(v) => up({ popular: v })} label="Favourite" /> Show on home page</label>
        </div>
        {err && <p className="error" style={{ marginTop: 16 }}>{err}</p>}
      </div>
      <div className="dlg-foot">
        <button className="btn btn-quiet" onClick={onClose}>Cancel</button>
        <button className="btn btn-red" style={{ flex: 1 }} disabled={busy} onClick={save}>
          {busy ? 'Saving…' : d.id ? 'Save changes' : `Add dish${d.price ? `, ${aud(Math.round(parseFloat(d.price) * 100) || 0)}` : ''}`}
        </button>
      </div>
    </dialog>
  );
}
