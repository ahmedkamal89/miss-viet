import { sql } from '@/lib/db';
import { body, fail, json } from '@/lib/http';
import { getMenu } from '@/lib/menu';
import { cleanItem } from '@/lib/validate-item';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  return json(await getMenu({ includeHidden: true }));
}

export async function POST(req: Request) {
  const it = cleanItem(await body(req));
  if (!it.name) return fail('Give the dish a name.');
  if (!Number.isFinite(it.priceCents as number) || (it.priceCents as number) < 0) return fail('Enter a price.');
  if (!it.categoryId) return fail('Choose a section.');
  const [row] = await sql`
    insert into menu_items (category_id, name, subtitle, description, price_cents, image_url, available, popular, sort_order, options)
    values (${it.categoryId as string}, ${it.name as string}, ${(it.subtitle as string) ?? null}, ${(it.description as string) ?? null},
            ${it.priceCents as number}, ${(it.imageUrl as string) ?? null}, ${(it.available as boolean) ?? true},
            ${(it.popular as boolean) ?? false},
            ${(it.sortOrder as number) ?? 999}, ${sql.json((it.options ?? []) as never)})
    returning id`;
  revalidatePath('/', 'layout');
  return json(row, 201);
}
