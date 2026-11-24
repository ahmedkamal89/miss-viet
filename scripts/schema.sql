-- Miss Viet's Lunch Bar: database schema (PostgreSQL 13+)
-- Safe to run more than once.

create table if not exists categories (
  id          text primary key default gen_random_uuid()::text,
  name        text not null,
  blurb       text,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists menu_items (
  id           text primary key default gen_random_uuid()::text,
  category_id  text not null references categories(id) on delete cascade,
  name         text not null,
  subtitle     text,
  description  text,
  price_cents  int  not null check (price_cents >= 0),
  image_url    text,
  available    boolean not null default true,
  popular      boolean not null default false,
  sort_order   int  not null default 0,
  options      jsonb not null default '[]',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists menu_items_category on menu_items(category_id, sort_order);

create table if not exists orders (
  id                 uuid primary key default gen_random_uuid(),
  number             serial unique,
  customer_name      text not null,
  phone              text not null,
  email              text,
  notes              text,
  pickup_time        text not null,
  items              jsonb not null,
  subtotal_cents     int  not null,
  status             text not null default 'NEW'
                     check (status in ('PENDING_PAYMENT','NEW','PREPARING','READY','COMPLETED','CANCELLED')),
  payment_method     text not null check (payment_method in ('CARD','PICKUP')),
  payment_status     text not null default 'UNPAID' check (payment_status in ('UNPAID','PAID','REFUNDED')),
  stripe_session_id  text unique,
  notified_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists orders_status_created on orders(status, created_at desc);

-- order numbers start at 101 so the first customer isn't "order #1"
select setval(pg_get_serial_sequence('orders','number'), greatest(100, (select coalesce(max(number),0) from orders)));

create table if not exists push_subscriptions (
  endpoint    text primary key,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists settings (
  key    text primary key,
  value  text not null
);
