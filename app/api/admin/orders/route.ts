import { sql } from '@/lib/db';
import { json } from '@/lib/http';
import { ORDER_COLUMNS } from '@/lib/orders';
import type { Order } from '@/lib/types';

export const dynamic = 'force-dynamic';

const LOCAL = () => sql`(now() at time zone 'Australia/Adelaide')`;
const LIVE = () => sql`status not in ('PENDING_PAYMENT','CANCELLED')`;

export async function GET(req: Request) {
  const scope = new URL(req.url).searchParams.get('scope') ?? 'active';
  const orders =
    scope === 'active'
      ? await sql<Order[]>`
          select ${ORDER_COLUMNS()} from orders
          where status in ('NEW','PREPARING','READY')
          order by created_at asc`
      : await sql<Order[]>`
          select ${ORDER_COLUMNS()} from orders
          where status <> 'PENDING_PAYMENT' and created_at > now() - interval '14 days'
          order by created_at desc limit 300`;

  const [days, hours, top] = await Promise.all([
    sql<{ label: string; count: number; cents: number }[]>`
      select to_char(d, 'Dy') as label,
             count(o.id)::int as count,
             coalesce(sum(o.subtotal_cents), 0)::int as cents
      from generate_series(${LOCAL()}::date - 6, ${LOCAL()}::date, interval '1 day') d
      left join orders o on ${LIVE()}
        and (o.created_at at time zone 'Australia/Adelaide')::date = d::date
      group by d order by d`,
    sql<{ hour: number; count: number; cents: number }[]>`
      select extract(hour from created_at at time zone 'Australia/Adelaide')::int as hour,
             count(*)::int as count, sum(subtotal_cents)::int as cents
      from orders
      where ${LIVE()} and (created_at at time zone 'Australia/Adelaide')::date = ${LOCAL()}::date
      group by 1 order by 1`,
    sql<{ name: string; qty: number; cents: number }[]>`
      select li->>'name' as name,
             sum((li->>'qty')::int)::int as qty,
             sum((li->>'qty')::int * (li->>'unitCents')::int)::int as cents
      from orders, jsonb_array_elements(items) li
      where ${LIVE()} and created_at > now() - interval '7 days'
      group by 1 order by qty desc, cents desc limit 5`,
  ]);

  const today = days[days.length - 1] ?? { count: 0, cents: 0 };
  const yesterday = days[days.length - 2] ?? { count: 0, cents: 0 };

  return json({
    orders,
    today: { count: today.count, total: today.cents },
    stats: { days, hours, top, yesterday: { count: yesterday.count, total: yesterday.cents } },
  });
}
