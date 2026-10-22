CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  type TEXT NOT NULL CHECK (type IN ('regular', 'perishable', 'consumer')),
  done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
  created_at TEXT NOT NULL,
  expiration_date TEXT,
  temperature REAL,
  picture_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at);
