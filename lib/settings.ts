import { sql } from './db';
import type { StoreSettings, WeekHours } from './types';

// Placeholder hours: Google shows "closes 4 pm". Edit in Admin > Settings.
export const DEFAULT_HOURS: WeekHours = [
  null,
  { open: '09:00', close: '16:00' },
  { open: '09:00', close: '16:00' },
  { open: '09:00', close: '16:00' },
  { open: '09:00', close: '16:00' },
  { open: '09:00', close: '16:00' },
  { open: '09:00', close: '14:00' },
];

export const DEFAULT_SETTINGS: StoreSettings = {
  acceptingOrders: true,
  prepMinutes: 15,
  hours: DEFAULT_HOURS,
  notice: '',
};

export async function getSettings(): Promise<StoreSettings> {
  const rows = await sql<{ key: string; value: string }[]>`select key, value from settings`;
  const s: StoreSettings = structuredClone(DEFAULT_SETTINGS);
  for (const r of rows) {
    if (r.key.startsWith('_')) continue;
    try {
      (s as Record<string, unknown>)[r.key] = JSON.parse(r.value);
    } catch {
      /* ignore bad values */
    }
  }
  return s;
}

export async function saveSettings(patch: Partial<StoreSettings>) {
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in DEFAULT_SETTINGS)) continue;
    await sql`
      insert into settings (key, value) values (${key}, ${JSON.stringify(value)})
      on conflict (key) do update set value = excluded.value`;
  }
}
