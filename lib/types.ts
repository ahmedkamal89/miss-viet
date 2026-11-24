export type Choice = { label: string; priceCents: number };

export type OptionGroup = {
  name: string;
  /** Customer must pick at least one */
  required: boolean;
  /** Customer may pick several (e.g. extras) */
  multi: boolean;
  choices: Choice[];
};

export type Category = {
  id: string;
  name: string;
  blurb: string | null;
  sortOrder: number;
};

export type MenuItem = {
  id: string;
  categoryId: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  available: boolean;
  popular: boolean;
  sortOrder: number;
  options: OptionGroup[];
};

export type PickedChoice = { group: string; label: string; priceCents: number };

export type CartLine = {
  key: string;
  itemId: string;
  name: string;
  imageUrl: string | null;
  qty: number;
  unitCents: number;
  choices: PickedChoice[];
  note?: string;
};

export type OrderStatus = 'PENDING_PAYMENT' | 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
export type PaymentMethod = 'CARD' | 'PICKUP';

export type OrderLine = {
  itemId: string;
  name: string;
  qty: number;
  unitCents: number;
  choices: PickedChoice[];
  note?: string;
};

export type Order = {
  id: string;
  number: number;
  customerName: string;
  phone: string;
  email: string | null;
  notes: string | null;
  pickupTime: string;
  items: OrderLine[];
  subtotalCents: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED';
  stripeSessionId: string | null;
  createdAt: string;
};

export type DayHours = { open: string; close: string } | null;
/** index 0 = Sunday … 6 = Saturday */
export type WeekHours = DayHours[];

export type StoreSettings = {
  acceptingOrders: boolean;
  prepMinutes: number;
  hours: WeekHours;
  notice: string;
};
