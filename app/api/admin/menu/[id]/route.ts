import { sql } from '@/lib/db';
import { body, fail, json } from '@/lib/http';
import { cleanItem } from '@/lib/validate-item';
import { revalidatePath } from 'next/cache';

const COLS: Record<string, string> = {
  name: 'name', subtitle: 'subtitle', description: 'description', priceCents: 'price_cents',
  imageUrl: 'image_url', available: 'available', popular: 'popular', sortOrder: 'sort_order',
  categoryId: 'category_id', options: 'options',
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const it = cleanItem(await body(req));
  if ('name' in it && !it.name) return fail('Give the dish a name.');
  if ('priceCents' in it && !(Number.isFinite(it.priceCents as number) && (it.priceCents as number) >= 0))
    return fail('Enter a price.');
  const entries = Object.entries(it).filter(([k]) => k in COLS);
  if (!entries.length) return fail('Nothing to change.');
  const patch: Record<string, unknown> = {};
  for (const [k, v] of entries) patch[COLS[k]] = k === 'options' ? sql.json(v as never) : v;
  const r = await sql`update menu_items set ${sql(patch as never)}, updated_at = now() where id = ${id} returning id`;
  if (!r.length) return fail('Dish not found.', 404);
  revalidatePath('/', 'layout');
  return json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await sql`delete from menu_items where id = ${id}`;
  revalidatePath('/', 'layout');
  return json({ ok: true });
}
