/* Real food photography (transparent cut-outs in /public/food).
   Replaces the old cartoon illustrations everywhere on the site. */

export type FoodKind = 'banhmi' | 'bun' | 'pho' | 'rice' | 'coldrolls' | 'meal' | 'bites' | 'drinks';

const SRC: Record<FoodKind, string> = {
  banhmi: '/food/banhmi.webp',
  bun: '/food/bun.webp',
  pho: '/food/pho.webp',
  rice: '/food/rice.webp',
  coldrolls: '/food/coldrolls.webp',
  meal: '/food/meal.webp',
  bites: '/food/coldrolls.webp',
  drinks: '/food/meal.webp',
};

export function kindFor(name: string, section = ''): FoodKind {
  const n = `${name} ${section}`.toLowerCase();
  if (/\bpho\b|phở/.test(n)) return 'pho';
  if (n.includes('meal deal')) return 'meal';
  if (n.includes('cold roll')) return 'coldrolls';
  if (/\bcan\b|water|drink/.test(n)) return 'drinks';
  if (/dim sim|spring roll|bites/.test(n)) return 'bites';
  if (n.includes('rice')) return 'rice';
  if (/bun|bún|bowl/.test(n)) return 'bun';
  return 'banhmi';
}

export function foodSrc(kind: FoodKind) {
  return SRC[kind];
}

export function FoodPhoto({ kind, className, alt = '' }: { kind: FoodKind; className?: string; alt?: string }) {
  return <img src={SRC[kind]} alt={alt} className={className} loading="lazy" draggable={false} />;
}

/** Picks a fitting photo from a dish or section name. */
export function DishPhoto({ name, section = '', className }: { name: string; section?: string; className?: string }) {
  return <FoodPhoto kind={kindFor(name, section)} className={className} alt="" />;
}
