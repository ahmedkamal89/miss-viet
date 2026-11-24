import { sql } from './db';
import type { Order } from './types';

export const ORDER_COLUMNS = () => sql`
  id, number, customer_name, phone, email, notes, pickup_time, items, subtotal_cents,
  status, payment_method, payment_status, stripe_session_id, created_at`;

export async function getOrder(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [o] = await sql<Order[]>`select ${ORDER_COLUMNS()} from orders where id = ${id}`;
  return o ?? null;
}

/** Marks a card order paid exactly once. Returns true if this call did it. */
export async function markPaid(id: string) {
  const r = await sql`
    update orders set payment_status = 'PAID', status = 'NEW', updated_at = now()
    where id = ${id} and payment_status <> 'PAID' and status = 'PENDING_PAYMENT'
    returning id`;
  return r.length === 1;
}

export function publicOrder(o: Order) {
  return {
    id: o.id,
    number: o.number,
    customerName: o.customerName,
    pickupTime: o.pickupTime,
    items: o.items,
    subtotalCents: o.subtotalCents,
    status: o.status,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    createdAt: o.createdAt,
  };
}
