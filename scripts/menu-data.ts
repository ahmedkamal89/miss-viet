/**
 * Starter menu, taken from the Miss Viet's Lunch Bar Google Maps listing.
 * PRICES ARE PLACEHOLDERS — change them in Admin > Menu (or here, then run `npm run db:setup -- --reset`).
 */
import type { OptionGroup } from '../lib/types';

type SeedItem = {
  name: string;
  subtitle?: string;
  description?: string;
  price: number;
  image?: string;
  popular?: boolean;
  options?: OptionGroup[];
};
type SeedCategory = { name: string; blurb?: string; options?: OptionGroup[]; items: SeedItem[] };

const rollExtras: OptionGroup[] = [
  {
    name: 'Extras',
    required: false,
    multi: true,
    choices: [
      { label: 'Extra meat', priceCents: 300 },
      { label: 'No chilli', priceCents: 0 },
      { label: 'No pâté', priceCents: 0 },
      { label: 'No coriander', priceCents: 0 },
    ],
  },
];

const bowlExtras: OptionGroup[] = [
  {
    name: 'Extras',
    required: false,
    multi: true,
    choices: [
      { label: 'Extra meat', priceCents: 400 },
      { label: 'Add a spring roll', priceCents: 200 },
      { label: 'No chilli', priceCents: 0 },
      { label: 'No peanuts', priceCents: 0 },
    ],
  },
];

const mealSides: OptionGroup[] = [
  {
    name: 'Side',
    required: true,
    multi: false,
    choices: [
      { label: 'Spring roll', priceCents: 0 },
      { label: 'Dim sim', priceCents: 0 },
    ],
  },
  {
    name: 'Drink',
    required: true,
    multi: false,
    choices: [
      { label: 'Can of soft drink', priceCents: 0 },
      { label: 'Spring water', priceCents: 0 },
    ],
  },
];

export const MENU: SeedCategory[] = [
  {
    name: 'Meat rolls',
    blurb: 'Bánh mì on a crisp baguette with pâté, pickled carrot and daikon, cucumber, coriander and chilli.',
    options: rollExtras,
    items: [
      { name: 'Crackling roast pork roll', price: 12.5, popular: true, image: '/dishes/banh-mi-2.jpg', description: 'Our crackling pork, sliced thick, with all the trimmings.' },
      { name: 'Combination roll', price: 12, popular: true, image: '/dishes/banh-mi-3.jpg', description: 'A bit of everything: roast pork, BBQ pork and pork loaf.' },
      { name: 'Lemongrass grilled chicken roll', price: 11.5, image: '/dishes/banh-mi-hero.jpg' },
      { name: 'BBQ pork roll', subtitle: 'Nem nướng', price: 11.5 },
      { name: 'Lemongrass beef roll', price: 12 },
      { name: 'Meat balls roll', price: 11 },
      { name: 'Egg roll', price: 10 },
      { name: 'Tofu roll', price: 10.5 },
    ],
  },
  {
    name: 'Bún bowls',
    blurb: 'Rice vermicelli over lettuce and herbs, with pickles, crushed peanuts and nước chấm on the side.',
    options: bowlExtras,
    items: [
      { name: 'Crackling roast pork bun bowl', price: 16.5, popular: true, image: '/dishes/roast-pork-bun-bowl.jpg' },
      { name: 'Combination bun bowl', price: 16.5, image: '/dishes/bun-bowl.jpg' },
      { name: 'Lemongrass grilled chicken bun bowl', price: 15.5 },
      { name: 'Lemongrass beef bun bowl', price: 16, image: '/dishes/lemongrass-beef.jpg' },
      { name: 'Spring roll bun bowl', price: 14.5 },
      { name: 'Tofu bun bowl', price: 14.5 },
      { name: 'Pho', subtitle: 'Beef noodle soup', price: 16, options: [] },
      { name: 'Small fried rice', price: 9, options: [] },
    ],
  },
  {
    name: 'Rice bowls',
    blurb: 'Steamed rice with salad, pickles and nước chấm.',
    options: bowlExtras.map((g) => ({ ...g, choices: g.choices.filter((c) => c.label !== 'No peanuts') })),
    items: [
      { name: 'Crackling roast pork rice bowl', price: 16.5, image: '/dishes/crackling-salad.jpg' },
      { name: 'Combination rice bowl', price: 16.5, image: '/dishes/combination-bowl.jpg' },
      { name: 'Lemongrass grilled chicken rice bowl', price: 15.5 },
      { name: 'Lemongrass beef rice bowl', price: 16 },
      { name: 'Tofu rice bowl', price: 14.5 },
    ],
  },
  {
    name: 'Meal deal rolls',
    blurb: 'A roll, a spring roll or dim sim, and a can of drink or spring water.',
    options: mealSides,
    items: [
      { name: 'Chicken roll meal deal', price: 15 },
      { name: 'Pork roll meal deal', price: 15.5 },
      { name: 'Combination roll meal deal', price: 16 },
    ],
  },
  {
    name: 'Meal deal bowls',
    blurb: 'A bowl, a spring roll or dim sim, and a can of drink or spring water.',
    options: [
      {
        name: 'Base',
        required: true,
        multi: false,
        choices: [
          { label: 'Vermicelli', priceCents: 0 },
          { label: 'Rice', priceCents: 0 },
        ],
      },
      ...mealSides,
    ],
    items: [
      { name: 'Chicken bowl meal deal', price: 19 },
      { name: 'Pork bowl meal deal', price: 20 },
      { name: 'Combination bowl meal deal', price: 20 },
    ],
  },
  {
    name: 'Cold rolls',
    blurb: 'Fresh rice-paper rolls with vermicelli, lettuce and herbs, with dipping sauce. Two per serve.',
    items: [
      { name: 'Prawn cold rolls', price: 8 },
      { name: 'Chicken cold rolls', price: 8 },
      { name: 'Tofu cold rolls', price: 7.5 },
    ],
  },
  {
    name: 'Small bites',
    items: [
      { name: 'Dim sims', subtitle: '3 pieces', price: 6, image: '/dishes/dimsims.jpg' },
      { name: 'Spring rolls', subtitle: '3 pieces', price: 6 },
    ],
  },
  {
    name: 'Drinks',
    items: [
      { name: 'Can of soft drink', price: 2.5 },
      { name: 'Spring water', price: 2.5 },
    ],
  },
];
