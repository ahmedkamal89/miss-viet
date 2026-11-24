import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminConfigured, cookieOptions, createSessionToken, setPassword } from '@/lib/auth';
import { body, fail, json } from '@/lib/http';
import { deletePrivate, getPrivate } from '@/lib/secrets';

export const dynamic = 'force-dynamic';

/** First-run: is an admin password set yet? */
export async function GET() {
  return json({ configured: await adminConfigured() });
}

/** First-run: create the admin password using the one-time code from the build log. */
export async function POST(req: Request) {
  if (await adminConfigured()) return fail('The admin password is already set. Sign in instead.', 409);
  const { code, password } = await body<{ code?: string; password?: string }>(req);
  const real = await getPrivate('_setup_code');
  const given = String(code ?? '').trim().toUpperCase();
  const ok = real && given.length === real.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(real));
  if (!ok) return fail('That setup code isn’t right. Copy it from the latest Vercel build log.', 401);
  const pw = String(password ?? '');
  if (pw.length < 8) return fail('Use at least 8 characters for the password.');
  await setPassword(pw);
  await deletePrivate('_setup_code');
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await createSessionToken(), cookieOptions);
  return res;
}
