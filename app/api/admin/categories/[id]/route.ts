import { sql } from '@/lib/db';
import { body, fail, json } from '@/lib/http';
import { revalidatePath } from 'next/cache';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await body<{ name?: string; blurb?: string; sortOrder?: number }>(req);
  const name = b.name !== undefined ? String(b.name).trim().slice(0, 50) : undefined;
  if (name === '') return fail('Give the section a name.');
  await sql`
    update categories set
      name = coalesce(${name ?? null}, name),
      blurb = case when ${b.blurb !== undefined} then ${String(b.blurb ?? '').trim() || null} else blurb end,
      sort_order = coalesce(${b.sortOrder ?? null}, sort_order)
    where id = ${id}`;
  revalidatePath('/', 'layout');
  return json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ count }] = await sql`select count(*)::int as count from menu_items where category_id = ${id}`;
  if (count > 0) return fail(`Move or delete the ${count} dishes in this section first.`, 409);
  await sql`delete from categories where id = ${id}`;
  revalidatePath('/', 'layout');
  return json({ ok: true });
}
