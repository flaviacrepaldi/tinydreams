import {readFile} from 'node:fs/promises';
// Additive migration only: preserve all existing goals and check-ins.
export async function migratePlanner(db){
 const columns=await db.prepare('PRAGMA table_info(goals)').all();
 if(columns.results.some(c=>c.name==='plan'))return;
 const sql=await readFile(new URL('../drizzle/0001_personal_planner.sql',import.meta.url),'utf8');
 await db.batch(sql.split('--> statement-breakpoint').map(s=>db.prepare(s.trim())));
}
