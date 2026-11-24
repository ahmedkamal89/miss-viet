# Miss Viet's Lunch Bar: online ordering site

Customers browse the menu, order for pickup, and pay by card (Stripe) or at the counter.
The shop manages orders and the menu at `/admin`.

**Stack:** Next.js 15 (App Router, TypeScript), PostgreSQL (`postgres` driver, plain SQL), Stripe Checkout, Web Push, Resend/SMTP email.

## What's included

**Customer site**
- `/`: home page with dish photos, Google rating, live open/closed status, opening hours, map and phone
- `/menu`: full menu by section, with choices for each dish (meal-deal side and drink, extras like extra meat), and a cart that's saved in the browser
- `/checkout`: name, phone, optional email, pickup time (ASAP or 15-minute slots within today's hours), kitchen note, and payment by card or at pickup
- `/order/[id]`: order ticket that updates itself (Received, Making, Ready)
- Customers who leave an email get a receipt, plus a "ready to collect" email

**Admin (`/admin`, password protected)**
- **Orders:** a live board with New, Making and Ready columns that refreshes every 4 seconds
  - New orders play a chime, flash the browser tab and get a red outline
  - One tap moves an order to the next stage; there's also a 14-day order history
- **Alerts for every new order:**
  1. Sound on the orders screen
  2. Desktop/phone notifications (Web Push), even when the tab is closed
  3. An email to `ADMIN_EMAIL`
- **Menu:**
  - Add, edit and delete dishes and sections, and reorder sections
  - Change prices right in the table, or upload photos
  - Switch a dish off to mark it sold out; mark favourites to show on the home page
- **Settings:**
  - Pause online orders, set prep time and opening hours
  - Show a notice at the top of the menu, and send a test alert

**Security:**
- Prices are recalculated on the server from the database, so a changed browser cart can't change the price
- The Stripe webhook signature is verified
- The admin cookie is signed and httpOnly, and repeated wrong passwords are rate-limited

## Look and feel

**Home page hero (GSAP + ScrollTrigger).** Four slides: bánh mì, bún, phở and meal deals.

- **Bánh mì in layers:** the sandwich is four separate transparent images in `public/food/`: `banhmi-top`, `banhmi-salad`, `banhmi-meat` and `banhmi-bottom`.
  - On load: the bottom bun rises, the pork drops in turning, the salad gathers, and the top bun comes down last.
  - At rest: every layer floats on its own rhythm, and the pork turns slowly.
  - **See it assembled** presses the layers into a closed sandwich, holds it, then springs it back open.
  - Scrolling the hero away also closes the sandwich (ScrollTrigger, scrubbed).
- **Mouse parallax:** every element has a depth (`data-depth`) and follows the mouse by that much.
- **Slide changes:** a camera-cut timeline blurs and pushes the old dish out, brings the new one in, and animates the headline word by word.
- **Extras:**
  - Rising steam on the phở and bún, a glowing light trail around the bánh mì, and drifting spice particles.
  - Garnish (chilli, coriander) falls in, and blurred herbs sit in the foreground for depth.
  - A pickup card with live pickup times (the chosen time carries through to checkout), and a category strip linking into the menu.
- **Reduce motion:** all animation switches off for people who set it.

**Replacing the food images.** All food images live in `public/food/` as transparent WebP files. To use your own photography:

1. Shoot each sandwich layer separately against a plain background, with the same camera angle and lighting.
2. Cut each layer out and save it as `banhmi-top.webp`, `banhmi-salad.webp`, `banhmi-meat.webp` or `banhmi-bottom.webp`.
3. Make every layer the same canvas size, positioned so that stacking them gives the open sandwich.
4. If your layers sit further apart or closer together, adjust the `tight` values in `components/food-hero.tsx` (how far each layer drops to close the sandwich).

Bowls and other dishes are single transparent images: `bun.webp`, `pho.webp`, `rice.webp`, `coldrolls.webp` and `meal.webp`.

**Elsewhere:** the rest of the site (menu thumbnails, dish pop-ups, favourites, admin) uses the same photos through `components/food.tsx`.

## Before going live: things to replace

1. **Prices are placeholders.** Google Maps didn't list prices. Fix them in Admin > Menu: tap a price, type, press Enter.
2. **Opening hours are guessed** (Mon–Fri 9–4, Sat 9–2, Sun closed). Set the real hours in Admin > Settings.
3. **Photos.** The hero and category food images come from an AI-generated design mockup, and some menu thumbnails are customer photos from Google Maps. Before launch, replace them with photos of the shop's real dishes (see "Replacing the food images" above), so customers see what they'll actually get.
4. Cold rolls, small bites and drinks were partly cut off in the listing, so check those items.

## Run it on your computer

```bash
npm install
cp .env.example .env.local      # fill in DATABASE_URL and ADMIN_PASSWORD at minimum
npm run vapid                   # optional: paste the two keys into .env.local for notifications
npm run db:setup                # creates tables + loads the menu
npm run dev                     # http://localhost:3000  (admin: /admin)
```

`npm run db:setup -- --reset` reloads the starter menu from `scripts/menu-data.ts`. It keeps orders.

## Deploy (Vercel + Neon, both have free tiers)

1. Push this folder to a GitHub repo and import it at vercel.com.
2. In Vercel, go to **Storage** and add **Neon Postgres** (this sets `DATABASE_URL`). Add a **Blob** store too, for photo uploads.
3. Under **Settings > Environment Variables**, add everything from `.env.example`.
4. Nothing to run by hand: every Vercel build creates the tables and loads the starter menu if the database is empty.
5. **Stripe:**
   1. Create an account and copy the secret key into `STRIPE_SECRET_KEY`.
   2. Go to Developers > Webhooks > Add endpoint and enter `https://YOURSITE/api/stripe/webhook`.
   3. Choose the events `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `checkout.session.expired`.
   4. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
   5. Turn on Apple Pay / Google Pay in Stripe's payment-method settings.
6. **Email:**
   1. Sign up at resend.com and verify your domain.
   2. Set `RESEND_API_KEY`, `EMAIL_FROM` and `ADMIN_EMAIL`.
   3. Without a verified domain, Resend only delivers to your own address.
7. Point your domain at Vercel and set `SITE_URL`.

### Setting up alerts in the shop
On the counter tablet or computer (and the owner's phone), open `/admin`, sign in, and tap **Turn on sound** and **Turn on notifications**.
- Do this once per device; notifications then arrive even when the browser tab is closed.
- **iPhone:** first open the site in Safari, then Share > Add to Home Screen, then open it from the home screen and turn on notifications (Apple requires this for web notifications).
- Use **Settings > Send a test alert** to check.

## Card vs pay-at-pickup flow
- **Pay at pickup:** the order goes straight to the New column and alerts fire.
- **Card:**
  - The order waits as `PENDING_PAYMENT` and isn't shown to the kitchen.
  - Once Stripe confirms payment (by webhook, or when the customer returns to the site), it moves to New and alerts fire exactly once.
  - Abandoned card checkouts expire after 30 minutes and are cancelled.
- **Refunds** are done in the Stripe dashboard.

## Project layout
```
app/                 pages + API routes (app/api/…)
components/          cart, menu board, dialogs, admin shell
lib/                 db, auth, pricing, hours, notifications, stripe
scripts/schema.sql   database tables
scripts/menu-data.ts starter menu
public/dishes/       starter photos
public/sw.js         push-notification service worker
```
