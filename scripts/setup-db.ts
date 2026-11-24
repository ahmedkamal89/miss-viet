/**
 * Creates the tables and loads the starter menu.
 *   npm run db:setup            -> create tables, seed menu only if the menu is empty
 *   npm run db:setup -- --reset -> wipe the menu and reload it (orders are kept)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import postgres from 'postgres';
import { MENU } from './menu-data';

for (const f of ['.env.local', '.env']) {
  const p = path.join(process.cwd(), f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.warn('⚠ DATABASE_URL is not set, skipping database setup. Add it (e.g. Vercel > Storage > Neon) and redeploy.');
  process.exit(0);
}
const sql = postgres(url, { max: 1, onnotice: () => {} });

async function main() {
  await sql.unsafe(fs.readFileSync(path.join(process.cwd(), 'scripts/schema.sql'), 'utf8'));
  console.log('✓ tables ready');

  // First-run admin setup: unless ADMIN_PASSWORD is set, print a one-time code the owner
  // types at /admin to create their password. Nothing secret has to go into Vercel.
  const [pw] = await sql`select 1 from settings where key = '_admin_pw'`;
  if (!process.env.ADMIN_PASSWORD && !pw) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const fresh = Array.from(crypto.randomBytes(8), (b) => alphabet[b % alphabet.length]).join('');
    await sql`insert into settings (key, value) values ('_setup_code', ${fresh}) on conflict (key) do nothing`;
    const [{ value }] = await sql`select value from settings where key = '_setup_code'`;
    console.log('\n==============================================');
    console.log('  ADMIN SETUP CODE:  ' + value);
    console.log('  Open /admin on your site and use this code');
    console.log('  to create the admin password.');
    console.log('==============================================\n');
  }

  const reset = process.argv.includes('--reset');
  const [{ count }] = await sql`select count(*)::int as count from menu_items`;
  if (count > 0 && !reset) {
    console.log(`✓ menu already has ${count} items, leaving it alone (use --reset to reload)`);
    return;
  }
  if (reset) await sql`delete from categories`;

  let c = 0;
  let total = 0;
  for (const cat of MENU) {
    const [row] = await sql`
      insert into categories (name, blurb, sort_order) values (${cat.name}, ${cat.blurb ?? null}, ${c++}) returning id`;
    let i = 0;
    for (const it of cat.items) {
      await sql`
        insert into menu_items (category_id, name, subtitle, description, price_cents, image_url, popular, sort_order, options)
        values (${row.id}, ${it.name}, ${it.subtitle ?? null}, ${it.description ?? null}, ${Math.round(it.price * 100)},
                ${it.image ?? null}, ${it.popular ?? false}, ${i++}, ${sql.json(it.options ?? cat.options ?? [])})`;
      total++;
    }
  }
  console.log(`✓ loaded ${MENU.length} categories and ${total} items`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
