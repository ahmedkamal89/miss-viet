import { sql } from '@/lib/db';
import { body, fail, json } from '@/lib/http';
import { priceLines, type IncomingLine } from '@/lib/menu';
import { getSettings } from '@/lib/settings';
import { pickupSlots } from '@/lib/hours';
import { stripe, stripeEnabled, siteUrl } from '@/lib/stripe';
import { notifyNewOrder } from '@/lib/notify';

export const dynamic = 'force-dynamic';

type Incoming = {
  name?: string;
  phone?: string;
  email?: string;
  notes?: string;
  pickupTime?: string;
  paymentMethod?: 'CARD' | 'PICKUP';
  lines?: IncomingLine[];
};

const clean = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

export async function POST(req: Request) {
  const b = await body<Incoming>(req);
  const name = clean(b.name, 60);
  const phone = clean(b.phone, 20);
  const email = clean(b.email, 120);
  const notes = clean(b.notes, 300);
  const method = b.paymentMethod === 'CARD' ? 'CARD' : 'PICKUP';

  if (name.length < 2) return fail('Enter your name so we can call it out at pickup.');
  if (!/^[+\d][\d\s()-]{7,}$/.test(phone)) return fail('Enter a phone number we can reach you on.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('That email address doesn’t look right.');

  const settings = await getSettings();
  if (!settings.acceptingOrders) return fail('Online ordering is paused right now. Please call 0426 808 016.', 409);
  const slots = pickupSlots(settings.hours, settings.prepMinutes);
  if (slots.length === 0) return fail('We’re closed for online orders today. Check our opening hours.', 409);
  const pickupTime = slots.includes(String(b.pickupTime)) ? String(b.pickupTime) : null;
  if (!pickupTime) return fail('That pickup time is no longer available. Pick another one.');

  if (method === 'CARD' && !stripeEnabled()) return fail('Card payment isn’t available. Choose pay at pickup.');

  let priced;
  try {
    priced = await priceLines(b.lines ?? []);
  } catch (e) {
    return fail((e as Error).message);
  }

  const [order] = await sql<{ id: string; number: number }[]>`
    insert into orders (customer_name, phone, email, notes, pickup_time, items, subtotal_cents, status, payment_method)
    values (${name}, ${phone}, ${email || null}, ${notes || null}, ${pickupTime}, ${sql.json(priced.lines)},
            ${priced.subtotalCents}, ${method === 'CARD' ? 'PENDING_PAYMENT' : 'NEW'}, ${method})
    returning id, number`;

  if (method === 'PICKUP') {
    await notifyNewOrder(order.id);
    return json({ orderId: order.id });
  }

  const base = siteUrl(req);
  try {
    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      currency: 'aud',
      customer_email: email || undefined,
      client_reference_id: order.id,
      metadata: { orderId: order.id, orderNumber: String(order.number) },
      line_items: priced.lines.map((l) => ({
        quantity: l.qty,
        price_data: {
          currency: 'aud',
          unit_amount: l.unitCents,
          product_data: {
            name: l.name,
            ...(l.choices.length ? { description: l.choices.map((c) => c.label).join(', ') } : {}),
          },
        },
      })),
      success_url: `${base}/order/${order.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/checkout?cancelled=${order.id}`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });
    await sql`update orders set stripe_session_id = ${session.id} where id = ${order.id}`;
    return json({ orderId: order.id, checkoutUrl: session.url });
  } catch (e) {
    console.error('[stripe] session failed', e);
    await sql`update orders set status = 'CANCELLED' where id = ${order.id}`;
    return fail('Card payment couldn’t be started. Try again or choose pay at pickup.', 502);
  }
}
