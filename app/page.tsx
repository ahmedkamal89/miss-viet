import Link from 'next/link';
import { SiteFooter, SiteHeader } from '@/components/site';
import { FoodHero, type HeroSlide, type HeroCategory } from '@/components/food-hero';
import { Favourites } from '@/components/home-sections';
import { CountUp, RevealRoot } from '@/components/motion';
import { FoodPhoto } from '@/components/food';
import { getMenu } from '@/lib/menu';
import { getSettings } from '@/lib/settings';
import { adelaideNow, DAY_NAMES, fmtTime, openStatus, toMin } from '@/lib/hours';
import { aud } from '@/lib/money';

export const dynamic = 'force-dynamic';

const MAPS = 'https://maps.app.goo.gl/xYDQEysu9bqZvuhS8';
const MAP_EMBED = 'https://www.google.com/maps?q=Miss+Viet%27s+Lunch+Bar,+91+Glen+Osmond+Rd,+Eastwood+SA+5063&output=embed';

const REVIEWS = [
  { q: 'Great bánh mì, phở, cold rolls and noodle bowls, and the loveliest service.', who: 'Google review' },
  { q: 'The staff are super friendly and the food was so fresh and tasty.', who: 'Google review' },
  { q: 'Hands down the best crackling pork in Adelaide.', who: 'Elysha, Google review' },
  { q: 'Amazing meat roll and amazing price.', who: 'Google review' },
  { q: 'Very easy and yummy lunch! The staff is very kind and friendly.', who: 'Google review' },
  { q: 'The most fantastic people on the planet work at this place. Food was fantastic.', who: 'Radan, Google review' },
];

const PHOTOS = [
  ['/dishes/banh-mi-2.jpg', 'Crackling pork roll'],
  ['/dishes/crackling-salad.jpg', 'Crackling pork salad'],
  ['/dishes/lemongrass-beef.jpg', 'Lemongrass beef'],
  ['/dishes/bun-bowl.jpg', 'Bún bowl'],
  ['/dishes/banh-mi-3.jpg', 'Combination roll'],
  ['/dishes/combination-bowl.jpg', 'Combination bowl'],
  ['/dishes/dimsims.jpg', 'Dim sims'],
  ['/dishes/roast-pork-bun-bowl.jpg', 'Roast pork bún'],
];

export default async function Home() {
  const [{ items, categories }, settings] = await Promise.all([getMenu(), getSettings()]);
  const status = openStatus(settings.hours);
  const today = adelaideNow().day;
  const order = [1, 2, 3, 4, 5, 6, 0];
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  const priceOf = (match: (n: string) => boolean) => {
    const prices = items.filter((i) => match(i.name.toLowerCase())).map((i) => i.priceCents);
    return prices.length ? aud(Math.min(...prices)) : null;
  };

  const slides: HeroSlide[] = [
    {
      key: 'banhmi',
      tab: 'Bánh mì',
      line1: 'Crackling pork',
      line2: 'Bánh\u00a0mì',
      body: 'Crisp roll, thick-cut crackling pork, pickles, coriander and chilli. The one our regulars rave about.',
      price: priceOf((n) => n.includes('crackling roast pork roll')),
    },
    {
      key: 'bun',
      tab: 'Bún bowls',
      line1: 'Fresh noodle',
      line2: 'Bún bowls',
      body: 'Rice vermicelli, crunchy salad, herbs and peanuts, topped with roast pork, lemongrass chicken or beef.',
      price: priceOf((n) => n.includes('bun bowl')),
    },
    {
      key: 'pho',
      tab: 'Phở',
      line1: 'Steaming beef',
      line2: 'Phở',
      body: 'Slow-simmered broth, rice noodles and tender beef, with basil, lime and chilli on the side.',
      price: priceOf((n) => n === 'pho'),
    },
    {
      key: 'meal',
      tab: 'Meal deals',
      line1: 'Lunch sorted',
      line2: 'Meal deals',
      body: 'A roll or a bowl, a spring roll or dim sim, and a cold drink. Everything you need in one tap.',
      price: priceOf((n) => n.includes('meal deal')),
    },
  ];

  const catId = (name: string) => categories.find((c) => c.name.toLowerCase().includes(name))?.id;
  const href = (name: string) => (catId(name) ? `/menu#sec-${catId(name)}` : '/menu');
  const heroCats: HeroCategory[] = [
    { label: 'Bánh mì', sub: 'Vietnamese rolls', img: '/food/card-banhmi.webp', href: href('meat roll') },
    { label: 'Bún bowls', sub: 'Rice vermicelli bowls', img: '/food/card-bun.webp', href: href('bún') },
    { label: 'Phở', sub: 'Beef noodle soup', img: '/food/card-pho.webp', href: href('bún') },
    { label: 'Rice bowls', sub: 'Fresh and filling', img: '/food/card-rice.webp', href: href('rice') },
    { label: 'Cold rolls', sub: 'Light and fresh', img: '/food/card-coldrolls.webp', href: href('cold roll') },
    { label: 'Meal deals', sub: 'Great value combos', img: '/food/card-meal.webp', href: href('meal deal') },
  ];

  const favourites = [...items]
    .sort((a, b) => Number(b.popular) - Number(a.popular) || Number(!!b.imageUrl) - Number(!!a.imageUrl))
    .filter((i) => i.popular || i.imageUrl || /pho|meal deal/i.test(i.name))
    .slice(0, 8)
    .map((i) => ({ ...i, section: catName.get(i.categoryId) ?? '' }));

  const ticker = ['Crackling pork bánh mì', 'Bún bowls', 'Beef phở', 'Cold rolls', 'Meal deals', 'Made fresh every day'];

  return (
    <>
      <SiteHeader />
      <RevealRoot />
      <main>
        <FoodHero slides={slides} categories={heroCats} status={{ open: status.open && settings.acceptingOrders, label: settings.acceptingOrders ? status.label : 'Online ordering is paused right now' }} />

        <div className="ticker" aria-hidden>
          <div className="ticker-track">
            {[0, 1].map((dup) => (
              <div className="ticker-set" key={dup}>
                {ticker.map((t) => (
                  <span key={t}>
                    {t}
                    <svg viewBox="0 0 20 20" width="22" height="22"><path d="M10 0 L12.6 7.4 L20 10 L12.6 12.6 L10 20 L7.4 12.6 L0 10 L7.4 7.4Z" fill="#ffd27a" /></svg>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <section className="stats wrap">
          <div className="stat-big reveal">
            <b><CountUp to={5} decimals={1} /></b>
            <span>Google rating</span>
          </div>
          <div className="stat-big reveal" style={{ transitionDelay: '80ms' }}>
            <b><CountUp to={97} /></b>
            <span>Google reviews</span>
          </div>
          <div className="stat-big reveal" style={{ transitionDelay: '160ms' }}>
            <b><CountUp to={settings.prepMinutes} suffix=" min" /></b>
            <span>Usual pickup wait</span>
          </div>
          <div className="stat-big reveal" style={{ transitionDelay: '240ms' }}>
            <b><CountUp to={items.length} /></b>
            <span>Dishes on the menu</span>
          </div>
        </section>

        <section className="section section-wash fav-section">
          <div className="wrap">
            <div className="section-head reveal">
              <div>
                <h2>Customer favourites</h2>
                <p className="intro">Tap a dish to add it straight to your order.</p>
              </div>
              <Link href="/menu" className="btn btn-quiet">
                Full menu
              </Link>
            </div>
          </div>
          <div className="wrap-bleed">
            <Favourites items={favourites} />
          </div>
        </section>

        <section className="section how">
          <div className="wrap">
            <h2 className="reveal">Lunch in three steps</h2>
            <ol className="how-steps">
              <li className="reveal">
                <div className="how-art"><FoodPhoto kind="banhmi" /></div>
                <h3>Pick your dishes</h3>
                <p>Choose from the menu and add extras like more meat or no chilli.</p>
              </li>
              <li className="reveal" style={{ transitionDelay: '120ms' }}>
                <div className="how-art"><FoodPhoto kind="pho" /></div>
                <h3>We cook it fresh</h3>
                <p>Your order pops up in our kitchen straight away. Pay online or at the counter.</p>
              </li>
              <li className="reveal" style={{ transitionDelay: '240ms' }}>
                <div className="how-art"><FoodPhoto kind="meal" /></div>
                <h3>Grab it hot</h3>
                <p>Watch your order go from received to ready, then skip the queue at pickup.</p>
              </li>
            </ol>
          </div>
        </section>

        <section className="section photo-wall-sec">
          <div className="wrap">
            <h2 className="reveal">From our counter</h2>
          </div>
          <div className="photo-wall wrap">
            {PHOTOS.map(([src, cap], k) => (
              <figure className={`pw pw${k} reveal`} key={src} style={{ transitionDelay: `${(k % 4) * 70}ms` }}>
                <img src={src} alt={cap} loading="lazy" />
                <figcaption>{cap}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="reviews2">
          <div className="wrap reviews2-head reveal">
            <div className="score2">
              <b>5.0</b>
              <span className="stars" aria-label="5 stars">★★★★★</span>
              <span>from 97 reviews on Google</span>
            </div>
            <h2>People keep coming back</h2>
          </div>
          <div className="quote-rail" aria-label="Customer reviews">
            <div className="quote-track">
              {[0, 1].map((dup) =>
                REVIEWS.map((r) => (
                  <blockquote className="quote-card" key={`${dup}-${r.q}`} aria-hidden={dup === 1}>
                    <span className="stars" aria-hidden>★★★★★</span>
                    <p>“{r.q}”</p>
                    <cite>{r.who}</cite>
                  </blockquote>
                )),
              )}
            </div>
          </div>
          <p className="wrap" style={{ marginTop: 24 }}>
            <a href={MAPS} style={{ color: '#ffd27a' }}>Read all reviews on Google</a>
          </p>
        </section>

        <section className="section" id="visit">
          <div className="wrap visit2">
            <div className="map-card reveal">
              <iframe src={MAP_EMBED} title="Map showing Miss Viet's Lunch Bar" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
            <div className="reveal" style={{ transitionDelay: '100ms' }}>
              <h2>Come and see us</h2>
              <ul className="contact-list">
                <li>
                  <strong>Address</strong>
                  91 Glen Osmond Rd, Eastwood SA 5063 <br />
                  <a href={MAPS}>Get directions</a>
                </li>
                <li>
                  <strong>Phone</strong>
                  <a href="tel:0426808016">0426 808 016</a>
                </li>
              </ul>
              <table className="hours">
                <tbody>
                  {order.map((d) => {
                    const h = settings.hours[d];
                    return (
                      <tr key={d} className={d === today ? 'today' : ''}>
                        <td>
                          {DAY_NAMES[d]}
                          {d === today && <span className={`today-chip${status.open ? ' open' : ''}`}>{status.open ? 'Open now' : 'Today'}</span>}
                        </td>
                        <td>{h ? `${fmtTime(toMin(h.open))} to ${fmtTime(toMin(h.close))}` : 'Closed'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="cta-band">
          <div className="wrap cta-grid">
            <div className="reveal">
              <h2>Hungry? Your bánh mì is {settings.prepMinutes} minutes away.</h2>
              <Link href="/menu" className="btn cta-btn">
                Start your order
              </Link>
            </div>
            <div className="cta-art bob" aria-hidden>
              <FoodPhoto kind="banhmi" />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
