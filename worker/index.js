import { validateItem, ValidationError } from '../shared/validation.js';

const columns = 'id, name, price_cents, type, done, created_at, expiration_date, temperature, picture_url';

function toItem(row) {
  const item = {
    id: row.id,
    name: row.name,
    priceCents: row.price_cents,
    type: row.type,
    done: Boolean(row.done),
    createdAt: row.created_at,
  };
  if (row.expiration_date !== null) item.expirationDate = row.expiration_date;
  if (row.temperature !== null) item.temperature = row.temperature;
  if (row.picture_url !== null) item.pictureUrl = row.picture_url;
  return item;
}

function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function body(request) {
  const content = await request.text();
  if (content.length > 16_384) throw new ValidationError('Request is too large.');
  try { return JSON.parse(content); }
  catch { throw new ValidationError('Invalid JSON.'); }
}

export default {
  async fetch(request, env) {
    try {
      const pathname = new URL(request.url).pathname;
      if (!pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
      if (pathname === '/api/items') {
        if (request.method === 'GET') {
          const { results } = await env.DB.prepare(`SELECT ${columns} FROM items ORDER BY created_at, rowid`).all();
          return json(results.map(toItem));
        }
        if (request.method === 'POST') {
          const input = validateItem(await body(request));
          const item = { id: crypto.randomUUID(), ...input, done: false, createdAt: new Date().toISOString() };
          await env.DB.prepare(`INSERT INTO items (${columns}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .bind(item.id, item.name, item.priceCents, item.type, 0, item.createdAt,
              item.expirationDate ?? null, item.temperature ?? null, item.pictureUrl ?? null).run();
          return json(item, 201);
        }
        return json({ error: 'Method not allowed.' }, 405);
      }

      const match = pathname.match(/^\/api\/items\/([0-9a-f-]+)$/i);
      if (match) {
        const id = match[1];
        if (request.method === 'PATCH') {
          const input = await body(request);
          if (!input || typeof input.done !== 'boolean') throw new ValidationError('Done must be true or false.');
          const update = await env.DB.prepare('UPDATE items SET done = ? WHERE id = ?')
            .bind(Number(input.done), id).run();
          if (!update.meta.changes) return json({ error: 'Item not found.' }, 404);
          const row = await env.DB.prepare(`SELECT ${columns} FROM items WHERE id = ?`).bind(id).first();
          return json(toItem(row));
        }
        if (request.method === 'DELETE') {
          const result = await env.DB.prepare('DELETE FROM items WHERE id = ?').bind(id).run();
          return result.meta.changes
            ? new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
            : json({ error: 'Item not found.' }, 404);
        }
        return json({ error: 'Method not allowed.' }, 405);
      }
      return json({ error: 'Not found.' }, 404);
    } catch (error) {
      if (error instanceof ValidationError) return json({ error: error.message }, 400);
      console.error(error);
      return json({ error: 'Unexpected server error.' }, 500);
    }
  },
};
