# The Grocery List

A grocery list app built for the Trodo JavaScript assignment. The frontend is React with Vite; a Cloudflare Worker handles the API and stores items in D1.

**Live app:** https://trodo-grocery-list.trodo-grocery-list-mk.workers.dev

## What it does

- Add groceries with a name, price, and automatically recorded creation date.
- Choose regular, perishable, or consumer goods. Perishable items require an expiration date and can include a storage temperature; consumer goods can include an image URL.
- Mark items as done, hide completed items, and see the total cost of items still pending.
- Remove items. Changes persist in the database after a refresh.

## Run locally

Use Node.js 20.9.0 (`.nvmrc`), then run:

```bash
npm ci
npm run dev
```

Open http://127.0.0.1:5173. The dev command builds the frontend, initializes the local D1 table, and starts the API and Vite together. Local data is kept in `.wrangler/state/` and is separate from the deployed database.

## Implementation

The Worker in `worker/index.js` provides four endpoints:

| Method | Endpoint | Action |
| --- | --- | --- |
| GET | `/api/items` | List items |
| POST | `/api/items` | Add an item |
| PATCH | `/api/items/:id` | Update its completed state |
| DELETE | `/api/items/:id` | Remove an item |

The schema is in `schema.sql`. Prices are stored as integer euro cents, and the Worker validates input before writing to D1. The same Worker and schema are used locally and on Cloudflare.

## Checks

```bash
npm test
npm run build
```

The automated tests cover input validation. I also checked the add, complete, filter, delete, and refresh flows in the running app.
