// Edge- and Node-compatible signed session cookie for the single admin account.
export const ADMIN_COOKIE = 'mv_admin';
const WEEK = 60 * 60 * 24 * 7;

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!s) throw new Error('Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET');
  return s;
}

async function hmac(data: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function createSessionToken() {
  const exp = Math.floor(Date.now() / 1000) + WEEK;
  return `${exp}.${await hmac(`admin.${exp}`)}`;
}

export async function verifySessionToken(token: string | undefined) {
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return safeEqual(sig, await hmac(`admin.${exp}`));
}

export async function checkPassword(pw: string) {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) return false;
  // compare HMACs so timing does not leak length/content
  return safeEqual(await hmac(`pw.${pw}`), await hmac(`pw.${real}`));
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: WEEK,
};
