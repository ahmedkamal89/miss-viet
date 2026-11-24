import { sql } from './db';
import { aud } from './money';
import { siteUrl } from './stripe';
import type { Order } from './types';
import { ORDER_COLUMNS } from './orders';

/* ---------------- email ---------------- */

async function sendEmail(to: string, subject: string, html: string, text: string) {
  const from = process.env.EMAIL_FROM || "Miss Viet's Lunch Bar <onboarding@resend.dev>";
  try {
    if (process.env.RESEND_API_KEY) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, subject, html, text }),
      });
      if (!r.ok) console.error('[email] Resend error', r.status, await r.text());
      return;
    }
    if (process.env.SMTP_HOST) {
      const nodemailer = await import('nodemailer');
      const t = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await t.sendMail({ from: process.env.EMAIL_FROM || process.env.SMTP_USER, to, subject, html, text });
    }
  } catch (e) {
    console.error('[email] failed', e);
  }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function orderText(o: Order) {
  return o.items
    .map((l) => {
      const opts = l.choices.map((c) => c.label).join(', ');
      return `${l.qty} x ${l.name}${opts ? ` (${opts})` : ''}${l.note ? ` [${l.note}]` : ''}  ${aud(l.unitCents * l.qty)}`;
    })
    .join('\n');
}

function orderHtml(o: Order) {
  const rows = o.items
    .map((l) => {
      const opts = l.choices.map((c) => c.label).join(', ');
      return `<tr><td style="padding:6px 12px 6px 0;vertical-align:top"><b>${l.qty} ×</b></td>
      <td style="padding:6px 12px 6px 0">${esc(l.name)}${opts ? `<br><small>${esc(opts)}</small>` : ''}${
        l.note ? `<br><small><i>${esc(l.note)}</i></small>` : ''
      }</td><td style="padding:6px 0;text-align:right">${aud(l.unitCents * l.qty)}</td></tr>`;
    })
    .join('');
  return `<table style="border-collapse:collapse;font-family:sans-serif;font-size:15px">${rows}
    <tr><td></td><td style="padding-top:10px"><b>Total (incl. GST)</b></td><td style="padding-top:10px;text-align:right"><b>${aud(
      o.subtotalCents,
    )}</b></td></tr></table>`;
}

/* ---------------- push ---------------- */

async function sendPush(payload: Record<string, unknown>) {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return;
  const webpush = (await import('web-push')).default;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', pub, priv);
  const subs = await sql<{ endpoint: string; p256dh: string; auth: string }[]>`
    select endpoint, p256dh, auth from push_subscriptions`;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 600, urgency: 'high' },
        );
      } catch (e: unknown) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await sql`delete from push_subscriptions where endpoint = ${s.endpoint}`;
        else console.error('[push] failed', code, e);
      }
    }),
  );
}

/* ---------------- public API ---------------- */

/**
 * Alerts the shop about a new order. Safe to call more than once:
 * only the first call for an order sends anything.
 */
export async function notifyNewOrder(orderId: string) {
  const [o] = await sql<Order[]>`
    update orders set notified_at = now()
    where id = ${orderId} and notified_at is null and status <> 'PENDING_PAYMENT'
    returning ${ORDER_COLUMNS()}`;
  if (!o) return;

  const paid = o.paymentStatus === 'PAID' ? 'Paid online' : 'Pay at pickup';
  const title = `New order #${o.number} — ${aud(o.subtotalCents)}`;
  const summary = o.items.map((l) => `${l.qty}× ${l.name}`).join(', ');
  const base = siteUrl();

  const tasks: Promise<unknown>[] = [
    sendPush({ title, body: `${o.customerName}, ${o.pickupTime}. ${summary}`, url: '/admin', tag: o.id }),
  ];

  if (process.env.ADMIN_EMAIL) {
    tasks.push(
      sendEmail(
        process.env.ADMIN_EMAIL,
        `${title} (${paid})`,
        `<div style="font-family:sans-serif"><h2>Order #${o.number}</h2>
        <p><b>${esc(o.customerName)}</b>, ${esc(o.phone)}<br>Pickup: <b>${esc(o.pickupTime)}</b><br>${paid}</p>
        ${o.notes ? `<p>Note: <i>${esc(o.notes)}</i></p>` : ''}${orderHtml(o)}
        <p><a href="${base}/admin">Open the orders screen</a></p></div>`,
        `Order #${o.number}\n${o.customerName} ${o.phone}\nPickup: ${o.pickupTime}\n${paid}\n${o.notes ?? ''}\n\n${orderText(o)}\n\nTotal ${aud(o.subtotalCents)}`,
      ),
    );
  }

  if (o.email) {
    tasks.push(
      sendEmail(
        o.email,
        `Your Miss Viet's order #${o.number}`,
        `<div style="font-family:sans-serif"><h2>Thanks ${esc(o.customerName)}, we've got your order.</h2>
        <p>Order <b>#${o.number}</b> for pickup <b>${esc(o.pickupTime)}</b> at 91 Glen Osmond Rd, Eastwood.<br>${paid}.</p>
        ${orderHtml(o)}<p><a href="${base}/order/${o.id}">Track your order</a></p></div>`,
        `Thanks ${o.customerName}! Order #${o.number} for pickup ${o.pickupTime}.\n\n${orderText(o)}\n\nTotal ${aud(o.subtotalCents)}\nTrack it: ${base}/order/${o.id}`,
      ),
    );
  }
  await Promise.all(tasks);
}

export async function notifyReady(o: Order) {
  if (!o.email) return;
  await sendEmail(
    o.email,
    `Order #${o.number} is ready to collect`,
    `<div style="font-family:sans-serif"><h2>Your order is ready, ${esc(o.customerName)}.</h2>
     <p>Come and grab order <b>#${o.number}</b> from 91 Glen Osmond Rd, Eastwood.${
       o.paymentStatus === 'PAID' ? '' : ` Please pay ${aud(o.subtotalCents)} at the counter.`
     }</p></div>`,
    `Order #${o.number} is ready to collect at 91 Glen Osmond Rd, Eastwood.`,
  );
}

export async function sendTestAlert() {
  await sendPush({ title: 'Alerts are working', body: 'New orders will show up like this.', url: '/admin', tag: 'test' });
  if (process.env.ADMIN_EMAIL)
    await sendEmail(process.env.ADMIN_EMAIL, 'Test alert from your ordering site', '<p>Email alerts are working.</p>', 'Email alerts are working.');
  return { push: Boolean(process.env.VAPID_PRIVATE_KEY), email: Boolean(process.env.ADMIN_EMAIL && (process.env.RESEND_API_KEY || process.env.SMTP_HOST)) };
}
