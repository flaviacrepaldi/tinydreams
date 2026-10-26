CREATE TABLE goals (id TEXT PRIMARY KEY NOT NULL, owner TEXT NOT NULL, title TEXT NOT NULL, reward TEXT NOT NULL, target INTEGER NOT NULL, color TEXT NOT NULL, created_at TEXT NOT NULL, redeemed INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE TABLE checkins (goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE, day TEXT NOT NULL, PRIMARY KEY(goal_id,day));
--> statement-breakpoint
CREATE INDEX goals_owner_idx ON goals(owner);
