import Stripe from 'stripe';

let client: Stripe | null = null;

export function stripeEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Card payments are not set up.');
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

export function siteUrl(req?: Request) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  if (req) return new URL(req.url).origin;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return 'http://localhost:3000';
}
