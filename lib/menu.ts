import { sql } from './db';
import type { Category, MenuItem, OptionGroup, OrderLine, PickedChoice } from './types';

export async function getMenu(opts: { includeHidden?: boolean } = {}) {
  const categories = await sql<Category[]>`
    select id, name, blurb, sort_order from categories order by sort_order, name`;
  const items = await sql<MenuItem[]>`
    select id, category_id, name, subtitle, description, price_cents, image_url,
           available, popular, sort_order, options
    from menu_items
    ${opts.includeHidden ? sql`` : sql`where available = true`}
    order by sort_order, name`;
  return { categories: [...categories], items: [...items] };
}

export type IncomingLine = {
  itemId: string;
  qty: number;
  choices?: { group: string; label: string }[];
  note?: string;
};

/**
 * Re-prices a cart on the server from database prices, so the browser
 * can never decide what an order costs.
 */
export async function priceLines(lines: IncomingLine[]) {
  if (!Array.isArray(lines) || lines.length === 0) throw new Error('Your cart is empty.');
  if (lines.length > 50) throw new Error('That order is too large to place online. Please call the shop.');
  const ids = [...new Set(lines.map((l) => String(l.itemId)))];
  const rows = await sql<MenuItem[]>`
    select id, name, price_cents, available, options from menu_items where id in ${sql(ids)}`;
  const byId = new Map(rows.map((r) => [r.id, r]));

  const out: OrderLine[] = [];
  let subtotal = 0;
  for (const l of lines) {
    const item = byId.get(String(l.itemId));
    if (!item) throw new Error('An item in your cart is no longer on the menu. Remove it and try again.');
    if (!item.available) throw new Error(`${item.name} is sold out right now. Remove it to continue.`);
    const qty = Math.floor(Number(l.qty));
    if (!(qty >= 1 && qty <= 30)) throw new Error(`Check the quantity for ${item.name}.`);

    const groups = (item.options ?? []) as OptionGroup[];
    const picked: PickedChoice[] = [];
    for (const g of groups) {
      const mine = (l.choices ?? []).filter((c) => c.group === g.name);
      if (g.required && mine.length === 0) throw new Error(`Choose a ${g.name.toLowerCase()} for ${item.name}.`);
      if (!g.multi && mine.length > 1) throw new Error(`Choose only one ${g.name.toLowerCase()} for ${item.name}.`);
      for (const m of mine) {
        const c = g.choices.find((x) => x.label === m.label);
        if (!c) throw new Error(`An option for ${item.name} has changed. Remove it and add it again.`);
        picked.push({ group: g.name, label: c.label, priceCents: c.priceCents });
      }
    }
    const unit = item.priceCents + picked.reduce((s, c) => s + c.priceCents, 0);
    subtotal += unit * qty;
    out.push({
      itemId: item.id,
      name: item.name,
      qty,
      unitCents: unit,
      choices: picked,
      note: l.note ? String(l.note).slice(0, 140) : undefined,
    });
  }
  return { lines: out, subtotalCents: subtotal };
}
