import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, checkPassword, cookieOptions, createSessionToken } from '@/lib/auth';
import { body, fail } from '@/lib/http';

const attempts = new Map<string, { n: number; t: number }>();

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'local';
  const a = attempts.get(ip) ?? { n: 0, t: Date.now() };
  if (Date.now() - a.t > 15 * 60_000) Object.assign(a, { n: 0, t: Date.now() });
  if (a.n >= 10) return fail('Too many attempts. Wait 15 minutes and try again.', 429);

  const { password } = await body<{ password?: string }>(req);
  if (!(await checkPassword(String(password ?? '')))) {
    a.n++;
    attempts.set(ip, a);
    return fail('That password isn’t right.', 401);
  }
  attempts.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await createSessionToken(), cookieOptions);
  return res;
}
