import type { OptionGroup } from './types';

export function cleanOptions(input: unknown): OptionGroup[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((g) => ({
      name: String(g?.name ?? '').trim().slice(0, 40),
      required: Boolean(g?.required),
      multi: Boolean(g?.multi),
      choices: (Array.isArray(g?.choices) ? g.choices : [])
        .map((c: { label?: unknown; priceCents?: unknown }) => ({
          label: String(c?.label ?? '').trim().slice(0, 60),
          priceCents: Math.max(0, Math.round(Number(c?.priceCents) || 0)),
        }))
        .filter((c: { label: string }) => c.label),
    }))
    .filter((g) => g.name && g.choices.length);
}

export function cleanItem(b: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  if ('name' in b) out.name = String(b.name ?? '').trim().slice(0, 80);
  if ('subtitle' in b) out.subtitle = String(b.subtitle ?? '').trim().slice(0, 60) || null;
  if ('description' in b) out.description = String(b.description ?? '').trim().slice(0, 300) || null;
  if ('priceCents' in b) out.priceCents = Math.round(Number(b.priceCents));
  if ('imageUrl' in b) out.imageUrl = String(b.imageUrl ?? '').trim().slice(0, 500) || null;
  if ('available' in b) out.available = Boolean(b.available);
  if ('popular' in b) out.popular = Boolean(b.popular);
  if ('sortOrder' in b) out.sortOrder = Math.round(Number(b.sortOrder) || 0);
  if ('categoryId' in b) out.categoryId = String(b.categoryId);
  if ('options' in b) out.options = cleanOptions(b.options);
  return out;
}
