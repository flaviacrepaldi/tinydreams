import {readFile} from 'node:fs/promises';
// Additive migrations only: preserve existing goals and their history.
export async function migratePlanner(db){
 const wishlist=await readFile(new URL('../drizzle/0005_wishlist.sql',import.meta.url),'utf8');
 await db.batch(wishlist.split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
 const columns=await db.prepare('PRAGMA table_info(goals)').all();
 if(!columns.results.some(c=>c.name==='plan')){
  const sql=await readFile(new URL('../drizzle/0001_personal_planner.sql',import.meta.url),'utf8');
  await db.batch(sql.split('--> statement-breakpoint').map(s=>db.prepare(s.trim())));
 }
 const tables=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='day_failures'").all();
 const groups=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='dream_groups'").all();
 if(!groups.results.length){
  const sql=await readFile(new URL('../drizzle/0003_dream_groups.sql',import.meta.url),'utf8');
  await db.batch(sql.split('--> statement-breakpoint').map(s=>db.prepare(s.trim())));
 }
 const groupColumns=await db.prepare('PRAGMA table_info(dream_groups)').all();
 if(!groupColumns.results.some(c=>c.name==='goal_order'))await db.prepare(await readFile(new URL('../drizzle/0004_group_goal_order.sql',import.meta.url),'utf8')).run();
 for(const [name,type] of [['reward',"TEXT NOT NULL DEFAULT ''"],['reward_config','TEXT']])if(!groupColumns.results.some(c=>c.name===name))await db.prepare('ALTER TABLE dream_groups ADD COLUMN '+name+' '+type).run();
 if(!tables.results.length)await db.prepare(await readFile(new URL('../drizzle/0002_daily_outcomes.sql',import.meta.url),'utf8')).run();
}
