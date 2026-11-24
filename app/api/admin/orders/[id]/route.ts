import { sql } from '@/lib/db';
import { body, fail, json } from '@/lib/http';
import { ORDER_COLUMNS } from '@/lib/orders';
import { notifyReady } from '@/lib/notify';
import type { Order, OrderStatus } from '@/lib/types';

const ALLOWED: OrderStatus[] = ['NEW', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await body<{ status?: OrderStatus; paid?: boolean }>(req);
  if (b.status && !ALLOWED.includes(b.status)) return fail('Unknown status.');

  const [o] = await sql<Order[]>`
    update orders set
      status = coalesce(${b.status ?? null}, status),
      payment_status = case when ${b.paid === true} then 'PAID' else payment_status end,
      updated_at = now()
    where id = ${id} and status <> 'PENDING_PAYMENT'
    returning ${ORDER_COLUMNS()}`;
  if (!o) return fail('Order not found.', 404);
  if (b.status === 'READY') notifyReady(o).catch(console.error);
  return json(o);
}
