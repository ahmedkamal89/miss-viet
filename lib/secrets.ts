import crypto from 'node:crypto';
import { sql } from './db';

/**
 * Private values the site keeps in its own database (keys start with "_"),
 * so a deployment needs no secret environment variables.
 */
export async function getPrivate(key: string): Promise<string | null> {
  const [r] = await sql<{ value: string }[]>`select value from settings where key = ${key}`;
  return r?.value ?? null;
}

export async function getOrCreatePrivate(key: string, create: () => string): Promise<string> {
  const existing = await getPrivate(key);
  if (existing) return existing;
  await sql`insert into settings (key, value) values (${key}, ${create()}) on conflict (key) do nothing`;
  return (await getPrivate(key))!;
}

export async function setPrivate(key: string, value: string) {
  await sql`insert into settings (key, value) values (${key}, ${value})
            on conflict (key) do update set value = excluded.value`;
}

export async function deletePrivate(key: string) {
  await sql`delete from settings where key = ${key}`;
}

export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

/** Web Push keys: from env if set, otherwise generated once and stored. */
export async function vapidKeys(): Promise<{ publicKey: string; privateKey: string } | null> {
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
    return { publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  const raw = await getOrCreatePrivate('_vapid', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const webpush = require('web-push');
    return JSON.stringify(webpush.generateVAPIDKeys());
  });
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
