CREATE TABLE IF NOT EXISTS wishlist (id TEXT PRIMARY KEY NOT NULL, owner TEXT NOT NULL, title TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', link TEXT NOT NULL DEFAULT '', amount REAL, value_class TEXT NOT NULL DEFAULT '', completed INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS wishlist_owner_idx ON wishlist(owner, created_at);
