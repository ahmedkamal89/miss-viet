import { sql } from '@/lib/db';
import { body, fail, json } from '@/lib/http';
import { revalidatePath } from 'next/cache';

export async function POST(req: Request) {
  const b = await body<{ name?: string; blurb?: string }>(req);
  const name = String(b.name ?? '').trim().slice(0, 50);
  if (!name) return fail('Give the section a name.');
  const [row] = await sql`
    insert into categories (name, blurb, sort_order)
    values (${name}, ${String(b.blurb ?? '').trim() || null}, (select coalesce(max(sort_order),0)+1 from categories))
    returning id, name, blurb, sort_order`;
  revalidatePath('/', 'layout');
  return json(row, 201);
}
