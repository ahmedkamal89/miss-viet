import type Stripe from 'stripe';
import { sql } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { markPaid } from '@/lib/orders';
import { notifyNewOrder } from '@/lib/notify';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response('Webhook secret not set', { status: 500 });
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, req.headers.get('stripe-signature') ?? '', secret);
  } catch {
    return new Response('Bad signature', { status: 400 });
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const s = event.data.object as Stripe.Checkout.Session;
    const orderId = s.metadata?.orderId;
    if (orderId && s.payment_status === 'paid') {
      if (await markPaid(orderId)) await notifyNewOrder(orderId);
    }
  }
  if (event.type === 'checkout.session.expired') {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.metadata?.orderId)
      await sql`update orders set status = 'CANCELLED', updated_at = now()
                where id = ${s.metadata.orderId} and status = 'PENDING_PAYMENT'`;
  }
  return new Response('ok');
}
