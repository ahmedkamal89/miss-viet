import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '@/components/site';
import { MenuBoard } from '@/components/menu-board';
import { getMenu } from '@/lib/menu';
import { getSettings } from '@/lib/settings';
import { openStatus } from '@/lib/hours';
import { DishPhoto, FoodPhoto } from '@/components/food';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: "Menu | Miss Viet's Lunch Bar" };

export default async function MenuPage() {
  const [{ categories, items }, s] = await Promise.all([getMenu(), getSettings()]);
  const st = openStatus(s.hours);
  const label = s.acceptingOrders ? st.label : 'Online ordering is paused right now';
  return (
    <>
      <SiteHeader />
      <main>
        <section className="menu-banner">
          <div className="wrap">
            <div>
              <h1>Order for pickup</h1>
              <p>Pick your dishes, choose a pickup time, and pay online or at the counter.</p>
            </div>
            <div className="banner-art" aria-hidden>
              <div className="bob"><FoodPhoto kind="bun" /></div>
              <div className="bob b2"><FoodPhoto kind="banhmi" /></div>
            </div>
          </div>
        </section>
        <MenuBoard categories={categories} items={items} notice={s.notice} statusLabel={label} />
      </main>
      <SiteFooter />
    </>
  );
}
