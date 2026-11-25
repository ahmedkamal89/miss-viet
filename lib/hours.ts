import type { WeekHours } from './types';

export const TZ = 'Australia/Adelaide';
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Current weekday (0-6) and minutes since midnight in Adelaide. */
export function adelaideNow(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: TZ,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '0';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day, minutes: parseInt(get('hour')) * 60 + parseInt(get('minute')) };
}

export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export function fmtTime(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const ap = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${ap}` : `${h12}:${String(m).padStart(2, '0')} ${ap}`;
}

export function openStatus(hours: WeekHours, d = new Date()) {
  const { day, minutes } = adelaideNow(d);
  const today = hours[day];
  if (today && minutes >= toMin(today.open) && minutes < toMin(today.close)) {
    return { open: true, label: `Open now, closes ${fmtTime(toMin(today.close))}` };
  }
  // find the next opening
  for (let i = 0; i < 8; i++) {
    const dd = (day + i) % 7;
    const h = hours[dd];
    if (!h) continue;
    if (i === 0 && minutes >= toMin(h.open)) continue;
    const when = i === 0 ? 'today' : i === 1 ? 'tomorrow' : DAY_NAMES[dd];
    return { open: false, label: `Closed, opens ${when} at ${fmtTime(toMin(h.open))}` };
  }
  return { open: false, label: 'Closed' };
}

/**
 * Pickup choices. While the shop is open: "ASAP" plus 15-minute slots for the rest of today.
 * After closing (or on a closed day): slots for the next opening day, so customers can order ahead.
 * Later days carry their date so the kitchen board stays clear. Values are stored on the order as-is.
 */
export function pickupSlots(hours: WeekHours, prepMinutes: number, d = new Date()) {
  const { day, minutes } = adelaideNow(d);
  for (let i = 0; i < 7; i++) {
    const dd = (day + i) % 7;
    const h = hours[dd];
    if (!h) continue;
    const open = toMin(h.open);
    const close = toMin(h.close);
    const slots: string[] = [];
    let start = open + prepMinutes;
    if (i === 0) {
      if (minutes >= close - 10) continue;
      if (minutes >= open) slots.push(`ASAP (about ${prepMinutes} min)`);
      start = Math.max(minutes + prepMinutes, open + prepMinutes);
    }
    const date = new Intl.DateTimeFormat('en-AU', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' })
      .format(new Date(d.getTime() + i * 86_400_000))
      .replace(',', '');
    const label = i === 0 ? 'Today' : i === 1 ? `Tomorrow (${date})` : date;
    for (let t = Math.ceil(start / 15) * 15; t <= close - 15; t += 15) slots.push(`${label} at ${fmtTime(t)}`);
    if (slots.length) return slots;
  }
  return [];
}
