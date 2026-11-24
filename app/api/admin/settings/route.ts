import { body, fail, json } from '@/lib/http';
import { getSettings, saveSettings } from '@/lib/settings';
import { revalidatePath } from 'next/cache';
import type { StoreSettings, WeekHours } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  return json(await getSettings());
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function PUT(req: Request) {
  const b = await body<Partial<StoreSettings>>(req);
  const patch: Partial<StoreSettings> = {};
  if ('acceptingOrders' in b) patch.acceptingOrders = Boolean(b.acceptingOrders);
  if ('prepMinutes' in b) {
    const m = Math.round(Number(b.prepMinutes));
    if (!(m >= 5 && m <= 120)) return fail('Prep time must be between 5 and 120 minutes.');
    patch.prepMinutes = m;
  }
  if ('notice' in b) patch.notice = String(b.notice ?? '').slice(0, 200);
  if ('hours' in b) {
    if (!Array.isArray(b.hours) || b.hours.length !== 7) return fail('Hours need all seven days.');
    const hours: WeekHours = [];
    for (const d of b.hours) {
      if (!d) { hours.push(null); continue; }
      if (!HHMM.test(d.open) || !HHMM.test(d.close) || d.open >= d.close)
        return fail('Each open day needs an opening time before its closing time.');
      hours.push({ open: d.open, close: d.close });
    }
    patch.hours = hours;
  }
  await saveSettings(patch);
  revalidatePath('/', 'layout');
  return json(await getSettings());
}
