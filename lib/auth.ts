// Admin sign-in for the single staff account (Node runtime).
// The password comes from ADMIN_PASSWORD if set; otherwise the owner creates it
// on first visit to /admin using the one-time setup code printed in the build log.
import crypto from 'node:crypto';
import { getOrCreatePrivate, getPrivate, randomToken, setPrivate } from './secrets';

export const ADMIN_COOKIE = 'mv_admin';
const WEEK = 60 * 60 * 24 * 7;

async function secret() {
  return process.env.ADMIN_SESSION_SECRET || (await getOrCreatePrivate('_session_secret', () => randomToken(48)));
}

const hmac = (key: string, data: string) => crypto.createHmac('sha256', key).update(data).digest('hex');

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export async function createSessionToken() {
  const exp = Math.floor(Date.now() / 1000) + WEEK;
  return `${exp}.${hmac(await secret(), `admin.${exp}`)}`;
}

export async function verifySessionToken(token: string | undefined) {
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return safeEqual(sig, hmac(await secret(), `admin.${exp}`));
}

export async function adminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD) || Boolean(await getPrivate('_admin_pw'));
}

export async function checkPassword(pw: string) {
  if (process.env.ADMIN_PASSWORD) {
    const k = await secret();
    return safeEqual(hmac(k, `pw.${pw}`), hmac(k, `pw.${process.env.ADMIN_PASSWORD}`));
  }
  const stored = await getPrivate('_admin_pw');
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  const got = crypto.scryptSync(pw, salt, 64).toString('hex');
  return safeEqual(got, hash);
}

export async function setPassword(pw: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  await setPrivate('_admin_pw', `${salt}:${crypto.scryptSync(pw, salt, 64).toString('hex')}`);
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: WEEK,
};
