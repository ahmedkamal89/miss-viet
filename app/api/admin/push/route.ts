import { sql } from '@/lib/db';
import { body, fail, json } from '@/lib/http';
import { vapidKeys } from '@/lib/secrets';

export const dynamic = 'force-dynamic';

export async function GET() {
  const k = await vapidKeys();
  return json({ publicKey: k?.publicKey ?? null });
}

type Sub = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

export async function POST(req: Request) {
  const s = await body<Sub>(req);
  if (!s.endpoint || !s.keys?.p256dh || !s.keys?.auth) return fail('Invalid subscription.');
  await sql`
    insert into push_subscriptions (endpoint, p256dh, auth) values (${s.endpoint}, ${s.keys.p256dh}, ${s.keys.auth})
    on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth`;
  return json({ ok: true });
}

export async function DELETE(req: Request) {
  const s = await body<Sub>(req);
  if (s.endpoint) await sql`delete from push_subscriptions where endpoint = ${s.endpoint}`;
  return json({ ok: true });
}
