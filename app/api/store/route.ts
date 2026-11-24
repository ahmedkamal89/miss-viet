import { json } from '@/lib/http';
import { getSettings } from '@/lib/settings';
import { openStatus, pickupSlots } from '@/lib/hours';
import { stripeEnabled } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

/** What the checkout page needs to know right now. */
export async function GET() {
  const s = await getSettings();
  const status = openStatus(s.hours);
  return json({
    acceptingOrders: s.acceptingOrders,
    open: status.open,
    statusLabel: status.label,
    notice: s.notice,
    slots: s.acceptingOrders ? pickupSlots(s.hours, s.prepMinutes) : [],
    paymentMethods: stripeEnabled() ? ['CARD', 'PICKUP'] : ['PICKUP'],
  });
}
