import postgres from 'postgres';

declare global {
  // eslint-disable-next-line no-var
  var __sql: ReturnType<typeof postgres> | undefined;
}

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.');
  return postgres(url, {
    max: 5,
    idle_timeout: 20,
    // snake_case columns in the database, camelCase in JavaScript
    transform: postgres.camel,
  });
}

/** Lazily created so `next build` works without a database. */
export const sql: ReturnType<typeof postgres> = new Proxy(function () {} as never, {
  get(_t, prop) {
    globalThis.__sql ??= create();
    return Reflect.get(globalThis.__sql, prop);
  },
  apply(_t, _this, args) {
    globalThis.__sql ??= create();
    return Reflect.apply(globalThis.__sql as never, undefined, args);
  },
});
