import { fail, json } from '@/lib/http';
import { getOrder, markPaid, publicOrder } from '@/lib/orders';
import { notifyNewOrder } from '@/lib/notify';
import { stripe, stripeEnabled } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let order = await getOrder(id);
  if (!order) return fail('We couldn’t find that order.', 404);

  // Returning from Stripe: confirm payment directly in case the webhook is slow or not set up.
  const sessionId = new URL(req.url).searchParams.get('session_id');
  if (
    sessionId &&
    stripeEnabled() &&
    order.status === 'PENDING_PAYMENT' &&
    order.stripeSessionId === sessionId
  ) {
    try {
      const s = await stripe().checkout.sessions.retrieve(sessionId);
      if (s.payment_status === 'paid' && s.metadata?.orderId === order.id) {
        if (await markPaid(order.id)) await notifyNewOrder(order.id);
        order = (await getOrder(id))!;
      }
    } catch (e) {
      console.error('[stripe] retrieve failed', e);
    }
  }
  return json(publicOrder(order));
}
