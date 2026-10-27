CREATE TABLE dream_groups (id TEXT PRIMARY KEY NOT NULL, owner TEXT NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX dream_groups_owner_idx ON dream_groups(owner);
--> statement-breakpoint
ALTER TABLE goals ADD COLUMN group_id TEXT REFERENCES dream_groups(id) ON DELETE SET NULL;
