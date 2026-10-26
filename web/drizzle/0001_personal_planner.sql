ALTER TABLE goals ADD COLUMN plan TEXT;
--> statement-breakpoint
CREATE TABLE goal_entries (goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE, entry_key TEXT NOT NULL, day TEXT NOT NULL, value REAL NOT NULL DEFAULT 1, note TEXT NOT NULL DEFAULT '', PRIMARY KEY(goal_id,entry_key));
